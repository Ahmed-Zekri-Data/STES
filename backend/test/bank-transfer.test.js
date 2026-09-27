const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
// Online gateways off, whatever a local .env says (read when the payment
// service loads, and dotenv never overrides a variable already set)
for (const gateway of ['PAYMEE', 'FLOUCI', 'D17', 'KONNECT']) {
  process.env[`${gateway}_ENABLED`] = 'false';
}

const {
  startDatabase, stopDatabase, clearDatabase, createApp, createProduct, adminToken, orderPayload
} = require('./helpers');

// A RIB with a correct check key, and the one that used to be hard-coded
const RIB = '08104000123456789034';
const MADE_UP_RIB = '08104000123456789012';

describe('payment methods and bank transfer', () => {
  let app;
  let admin;
  let product;
  let emailService;
  let sent;

  before(async () => {
    await startDatabase();
    emailService = require('../services/emailNotificationService');
  });
  after(stopDatabase);
  beforeEach(async () => {
    await clearDatabase();
    app = createApp();
    admin = await adminToken(app);
    product = await createProduct({ price: 100 });
    sent = [];
    process.env.EMAIL_USER = 'shop@example.tn';
    process.env.EMAIL_PASS = 'smtp-password';
    emailService.transporter = {
      sendMail: async (message) => {
        sent.push(message);
        return { messageId: `test-${sent.length}` };
      }
    };
  });

  const saveSettings = (body) => request(app).put('/api/admin/settings').set('Authorization', `Bearer ${admin}`).send(body);
  const saveBank = (bank) => saveSettings({ bank: { bankName: 'BIAT', beneficiary: 'STES SARL', ...bank } });
  const methods = async () => (await request(app).get('/api/payments/methods').expect(200)).body.methods.map(m => m.id);
  const placeOrder = (method) => request(app).post('/api/orders')
    .send(orderPayload([{ productId: product._id, quantity: 1 }], { payment: { method } }));
  const waitForEmails = async (count) => {
    for (let i = 0; i < 50 && sent.length < count; i++) {
      await new Promise(resolve => setTimeout(resolve, 20));
    }
  };

  describe('the shop’s bank account in Settings', () => {
    it('refuses a RIB whose check key is wrong, such as the made-up one', async () => {
      const res = await saveBank({ rib: MADE_UP_RIB }).expect(400);
      assert.match(res.body.message, /20-digit RIB/);
      await saveBank({ rib: '1234' }).expect(400);
    });

    it('needs the account holder with the RIB', async () => {
      await saveSettings({ bank: { rib: RIB, beneficiary: '' } }).expect(400);
    });

    it('saves the RIB spaced as on a statement and shows the IBAN to customers', async () => {
      await saveBank({ rib: ` ${RIB} ` }).expect(200);
      const { bank } = (await request(app).get('/api/settings').expect(200)).body;
      assert.deepEqual(bank, {
        bankName: 'BIAT', beneficiary: 'STES SARL', rib: '08 104 0001234567890 34', iban: 'TN59 0810 4000 1234 5678 9034'
      });
    });

    it('stops offering bank transfer when the RIB is emptied', async () => {
      await saveBank({ rib: RIB }).expect(200);
      await saveBank({ rib: '' }).expect(200);
      assert.equal((await request(app).get('/api/settings').expect(200)).body.bank, null);
      assert.deepEqual(await methods(), ['cash_on_delivery']);
    });
  });

  describe('checkout', () => {
    it('offers bank transfer only once the account is set, and cash on delivery with the fee from Settings', async () => {
      assert.deepEqual(await methods(), ['cash_on_delivery']);
      await saveSettings({ delivery: { cashOnDeliveryFee: 3 } }).expect(200);
      await saveBank({ rib: RIB }).expect(200);

      const { body } = await request(app).get('/api/payments/methods').expect(200);
      assert.deepEqual(body.methods.map(m => m.id), ['cash_on_delivery', 'bank_transfer']);
      assert.equal(body.methods[0].fee, 3);
    });

    it('refuses orders paid by a method the shop does not offer', async () => {
      await placeOrder('bank_transfer').expect(400);
      await placeOrder('card').expect(400);
      await placeOrder('paymee').expect(400);
      await placeOrder('cash_on_delivery').expect(201);
    });

    it('gives the shop’s real account, with the order number as the reference, and emails it', async () => {
      await saveBank({ rib: RIB }).expect(200);
      const { order } = (await placeOrder('bank_transfer').expect(201)).body;

      const payment = (await request(app).post('/api/payments/initiate').send({
        orderId: order.id,
        paymentMethod: 'bank_transfer',
        customerInfo: { firstName: 'Sami', lastName: 'Ben Ali', email: 'guest@example.com', phone: '+21612345678' }
      }).expect(200)).body;
      assert.deepEqual(payment.bankDetails, {
        bankName: 'BIAT', beneficiary: 'STES SARL', rib: '08 104 0001234567890 34', iban: 'TN59 0810 4000 1234 5678 9034', reference: order.orderNumber
      });
      assert.ok(!JSON.stringify(payment).includes('0001234567890 12'));

      await waitForEmails(1);
      const [email] = sent;
      for (const expected of ['08 104 0001234567890 34', 'TN59 0810 4000 1234 5678 9034', 'STES SARL', order.orderNumber]) {
        assert.ok(email.html.includes(expected), `email should include ${expected}`);
        assert.ok(email.text.includes(expected), `text should include ${expected}`);
      }
    });

    it('does not put bank details in cash on delivery emails', async () => {
      await saveBank({ rib: RIB }).expect(200);
      await placeOrder('cash_on_delivery').expect(201);
      await waitForEmails(1);
      assert.ok(!sent[0].html.includes('RIB'));
    });

    it('starts the payment only with the method the order was placed with', async () => {
      await saveBank({ rib: RIB }).expect(200);
      const { order } = (await placeOrder('cash_on_delivery').expect(201)).body;
      await request(app).post('/api/payments/initiate').send({
        orderId: order.id,
        paymentMethod: 'bank_transfer',
        customerInfo: { firstName: 'S', lastName: 'B', email: 'guest@example.com', phone: '+21612345678' }
      }).expect(400);
    });
  });

  describe('public order tracking', () => {
    it('finds an order by its tracking code only, not by its order number', async () => {
      const { order } = (await placeOrder('cash_on_delivery').expect(201)).body;
      await request(app).get(`/api/tracking/${order.orderNumber}`).expect(404);
      await request(app).get(`/api/tracking/${order.trackingCode.toLowerCase()}`).expect(200);
    });

    it('does not show which admin changed the order', async () => {
      const { order } = (await placeOrder('cash_on_delivery').expect(201)).body;
      await request(app).put(`/api/orders/${order.id}/status`).set('Authorization', `Bearer ${admin}`)
        .send({ status: 'confirmed', sendNotification: false }).expect(200);

      const { body } = await request(app).get(`/api/tracking/${order.trackingCode}`).expect(200);
      assert.equal(body.tracking.history.length, 2);
      assert.ok(!JSON.stringify(body).includes('updatedBy'));
      assert.equal(body.tracking.lastUpdate.status, 'confirmed');
    });
  });
});
