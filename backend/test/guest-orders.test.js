const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const {
  startDatabase, stopDatabase, clearDatabase, createApp, createProduct, registerCustomer, orderPayload
} = require('./helpers');

describe('guest orders and privacy', () => {
  let app;

  before(async () => {
    await startDatabase();
    app = createApp();
  });
  after(stopDatabase);
  beforeEach(clearDatabase);

  const placeOrder = async ({ email = 'guest@example.com', token } = {}) => {
    const product = await createProduct();
    const payload = orderPayload([{ productId: product._id, quantity: 1 }]);
    payload.customer.email = email;
    const req = request(app).post('/api/orders');
    if (token) {
      req.set('Authorization', `Bearer ${token}`);
    }
    const res = await req.send(payload).expect(201);
    return res.body.order;
  };

  const accountOrders = async (token) => {
    const res = await request(app)
      .get('/api/customer-orders')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    return res.body.orders.map(order => order.orderNumber);
  };

  describe('linking orders to accounts', () => {
    it('does not add a guest order to the account that owns the email', async () => {
      const { token } = await registerCustomer(app, { email: 'sami@example.com' });

      // Someone who is not logged in uses Sami's email address
      await placeOrder({ email: 'sami@example.com' });

      assert.deepEqual(await accountOrders(token), []);
    });

    it('adds the order to the account when the customer is logged in', async () => {
      const { token } = await registerCustomer(app, { email: 'sami@example.com' });

      const order = await placeOrder({ email: 'sami@example.com', token });

      assert.deepEqual(await accountOrders(token), [order.orderNumber]);
    });
  });

  describe('finding an order by email', () => {
    const search = (body) => request(app).post('/api/tracking/search').send(body);

    it('does not list orders from an email address alone', async () => {
      await placeOrder({ email: 'sami@example.com' });

      const res = await search({ email: 'sami@example.com' }).expect(400);
      assert.equal(JSON.stringify(res.body).includes('TRK-'), false);
    });

    it('finds the order when the email and order number match', async () => {
      const order = await placeOrder({ email: 'sami@example.com' });
      await placeOrder({ email: 'sami@example.com' });

      const res = await search({ email: 'Sami@Example.com', orderNumber: ` ${order.orderNumber.toLowerCase()} ` }).expect(200);

      assert.equal(res.body.orders.length, 1);
      assert.equal(res.body.orders[0].orderNumber, order.orderNumber);
      assert.equal(res.body.orders[0].trackingCode, order.trackingCode);
    });

    it('finds nothing when either one is wrong', async () => {
      const order = await placeOrder({ email: 'sami@example.com' });
      const other = await placeOrder({ email: 'nour@example.com' });

      await search({ email: 'nour@example.com', orderNumber: order.orderNumber }).expect(404);
      await search({ email: 'sami@example.com', orderNumber: other.orderNumber }).expect(404);
      await search({ email: 'sami@example.com', orderNumber: 'ORD-0000000000000-000000' }).expect(404);
    });
  });
});
