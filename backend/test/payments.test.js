const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const request = require('supertest');
const {
  startDatabase, stopDatabase, clearDatabase, createApp, createProduct, adminToken, orderPayload
} = require('./helpers');

// A stand-in for the Paymee and Flouci APIs. Tests decide what the gateway
// reports for each payment by editing `gateway`.
const gateway = { paymee: {}, flouci: {}, count: 0 };

const startGateway = () => new Promise((resolve) => {
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      const send = (data, status = 200) => {
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
      };
      let match;

      if (req.method === 'POST' && req.url === '/paymee/payments') {
        const id = `pm_${++gateway.count}`;
        gateway.paymee[id] = { payment_status: false, amount: JSON.parse(body).amount };
        return send({ payment_id: id, payment_url: `https://paymee.test/${id}` });
      }
      if ((match = req.url.match(/^\/paymee\/payments\/([^/]+)\/check$/))) {
        if (req.headers.authorization !== 'Token test-paymee-key') {
          return send({}, 401);
        }
        return send({ status: true, data: gateway.paymee[match[1]] || {} });
      }
      if (req.method === 'POST' && req.url === '/flouci/generate_payment') {
        const id = `fl_${++gateway.count}`;
        gateway.flouci[id] = { status: 'PENDING', amount: JSON.parse(body).amount };
        return send({ result: { success: true, payment_id: id, link: `https://flouci.test/${id}` } });
      }
      if ((match = req.url.match(/^\/flouci\/verify_payment\/([^/]+)$/))) {
        return send({ success: true, result: gateway.flouci[match[1]] || {} });
      }
      send({}, 404);
    });
  });
  server.listen(0, '127.0.0.1', () => resolve(server));
});

describe('payments', () => {
  let app;
  let gatewayServer;

  before(async () => {
    gatewayServer = await startGateway();
    const base = `http://127.0.0.1:${gatewayServer.address().port}`;
    // Read when the payment service is first loaded, so set before createApp
    Object.assign(process.env, {
      PAYMEE_ENABLED: 'true',
      PAYMEE_BASE_URL: `${base}/paymee`,
      PAYMEE_API_KEY: 'test-paymee-key',
      FLOUCI_ENABLED: 'true',
      FLOUCI_BASE_URL: `${base}/flouci`
    });

    await startDatabase();
    app = createApp();
  });
  after(async () => {
    await stopDatabase();
    gatewayServer.close();
  });
  beforeEach(clearDatabase);

  const payments = () => require('../models/Payment');
  const orders = () => require('../models/Order');

  // Places an order and starts paying it through the given gateway.
  const startPayment = async (method) => {
    const product = await createProduct({ price: 100 });
    const order = await request(app)
      .post('/api/orders')
      .send(orderPayload([{ productId: product._id, quantity: 1 }], { payment: { method } }))
      .expect(201);
    const payment = await request(app)
      .post('/api/payments/initiate')
      .send({
        orderId: order.body.order.id,
        paymentMethod: method,
        customerInfo: { firstName: 'Sami', lastName: 'Ben Ali', email: 'guest@example.com', phone: '12345678' }
      })
      .expect(200);
    return { orderId: order.body.order.id, ...payment.body };
  };

  it('ignores a forged webhook until the gateway confirms the payment', async () => {
    const pay = await startPayment('paymee');
    assert.equal(pay.status, 'processing');
    assert.ok(pay.redirectUrl);

    await request(app)
      .post('/api/payments/webhook/paymee')
      .send({ order_id: pay.paymentReference, payment_id: pay.gatewayTransactionId, status: 'paid' })
      .expect(200);
    assert.equal((await payments().findByReference(pay.paymentReference)).status, 'processing');
    assert.equal((await orders().findById(pay.orderId)).paymentStatus, 'pending');

    gateway.paymee[pay.gatewayTransactionId].payment_status = true;
    await request(app)
      .post('/api/payments/webhook/paymee')
      .send({ order_id: pay.paymentReference })
      .expect(200);

    assert.equal((await payments().findByReference(pay.paymentReference)).status, 'completed');
    const order = await orders().findById(pay.orderId);
    assert.equal(order.paymentStatus, 'paid');
    assert.equal(order.status, 'confirmed');
  });

  it('does not complete a payment when the gateway reports a different amount', async () => {
    const pay = await startPayment('paymee');
    gateway.paymee[pay.gatewayTransactionId] = { payment_status: true, amount: 1 };

    await request(app).post(`/api/payments/${pay.paymentReference}/verify`).expect(200);

    const payment = await payments().findByReference(pay.paymentReference);
    assert.equal(payment.status, 'processing');
    assert.match(payment.gatewayMessage, /mismatch/i);
  });

  it('rejects webhook references that are not plain strings', async () => {
    await startPayment('paymee');
    await request(app)
      .post('/api/payments/webhook/paymee')
      .send({ order_id: { $ne: null }, status: 'paid' })
      .expect(404);
  });

  it('verifies Flouci payments with the gateway and scopes webhooks by gateway', async () => {
    const pay = await startPayment('flouci');

    await request(app)
      .post('/api/payments/webhook/flouci')
      .send({ developer_tracking_id: pay.paymentReference, status: 'SUCCESS' })
      .expect(200);
    assert.equal((await payments().findByReference(pay.paymentReference)).status, 'processing');

    await request(app)
      .post('/api/payments/webhook/paymee')
      .send({ order_id: pay.paymentReference })
      .expect(404);

    gateway.flouci[pay.gatewayTransactionId].status = 'SUCCESS';
    await request(app).post(`/api/payments/${pay.paymentReference}/verify`).expect(200);
    assert.equal((await payments().findByReference(pay.paymentReference)).status, 'completed');
  });

  it('restricts payment statistics to admins', async () => {
    await request(app).get('/api/payments/stats').expect(401);
    const admin = await adminToken(app);
    await request(app).get('/api/payments/stats').set('Authorization', `Bearer ${admin}`).expect(200);
  });
});
