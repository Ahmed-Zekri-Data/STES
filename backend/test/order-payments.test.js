const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
for (const gateway of ['PAYMEE', 'FLOUCI', 'D17', 'KONNECT']) {
  process.env[`${gateway}_ENABLED`] = 'false';
}
const {
  startDatabase, stopDatabase, clearDatabase, createApp, createProduct, adminToken, orderPayload
} = require('./helpers');
const Order = require('../models/Order');
const Admin = require('../models/Admin');

// Cash on delivery and bank transfer: an admin records the money coming in
describe('recording payments received', () => {
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
    await request(app).put('/api/admin/settings').set('Authorization', `Bearer ${admin}`)
      .send({ bank: { bankName: 'BIAT', beneficiary: 'STES SARL', rib: '08104000123456789034' } }).expect(200);
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

  const placeOrder = async (method) => {
    const { order } = (await request(app).post('/api/orders')
      .send(orderPayload([{ productId: product._id, quantity: 1 }], { payment: { method } })).expect(201)).body;
    return order.id;
  };
  const record = (id, body, token = admin) => request(app).put(`/api/orders/${id}/payment`).set('Authorization', `Bearer ${token}`).send(body);
  const settle = () => new Promise(resolve => setTimeout(resolve, 150));

  it('records a bank transfer as received, tells the customer, and keeps who did it', async () => {
    const id = await placeOrder('bank_transfer');
    await settle();
    sent = [];

    const { order, message } = (await record(id, { received: true, note: 'Virement BIAT ref 4471' }).expect(200)).body;
    assert.equal(message, 'Payment recorded');
    assert.equal(order.paymentStatus, 'paid');
    assert.ok(order.paidAt);
    const saved = await Order.findById(id).lean();
    assert.deepEqual(saved.internalNotes.map(n => [n.note, n.addedBy]), [['Payment received: Virement BIAT ref 4471', 'admin']]);

    await settle();
    assert.equal(sent.length, 1);
    assert.equal(sent[0].to, 'guest@example.com');
    assert.equal(sent[0].subject, `Paiement reçu pour votre commande ${saved.orderNumber}`);
    assert.match(sent[0].text, /Nous avons bien reçu votre virement/);
    assert.match(sent[0].text, /Montant reçu : [\d.,\s]+TND/);

    // Twice: nothing changes, no second email
    assert.equal((await record(id, { received: true }).expect(200)).body.message, 'Already recorded as paid');
    await settle();
    assert.equal(sent.length, 1);
    assert.equal((await Order.findById(id).lean()).internalNotes.length, 1);
  });

  it('records cash collected at delivery without emailing, and undoes a mistake', async () => {
    const id = await placeOrder('cash_on_delivery');
    await settle();
    sent = [];

    await record(id, { received: true }).expect(200);
    const undone = (await record(id, { received: false, note: 'Wrong order' }).expect(200)).body;
    assert.equal(undone.message, 'Payment record undone');
    assert.equal(undone.order.paymentStatus, 'pending');
    assert.equal(undone.order.paidAt, undefined);
    const notes = (await Order.findById(id).lean()).internalNotes.map(n => n.note);
    assert.deepEqual(notes, ['Payment received', 'Payment record undone: Wrong order']);
    await settle();
    assert.equal(sent.length, 0);
  });

  it('leaves online payments to their gateway, and cancelled orders unpaid', async () => {
    const id = await placeOrder('cash_on_delivery');
    await Order.updateOne({ _id: id }, { paymentMethod: 'konnect' });
    assert.equal((await record(id, { received: true }).expect(400)).body.message, 'Online payments are confirmed by the payment gateway');

    const cancelled = await placeOrder('cash_on_delivery');
    await request(app).put(`/api/orders/${cancelled}/status`).set('Authorization', `Bearer ${admin}`).send({ status: 'cancelled', sendNotification: false }).expect(200);
    assert.equal((await record(cancelled, { received: true }).expect(400)).body.message, 'This order is cancelled');
  });

  it('is for admins who manage orders', async () => {
    const id = await placeOrder('cash_on_delivery');
    await request(app).put(`/api/orders/${id}/payment`).send({ received: true }).expect(401);
    await Admin.create({ username: 'catalogue', email: 'catalogue@example.com', password: 'catalogue-password', firstName: 'Cat', lastName: 'Alogue', role: 'admin', permissions: ['products'], isActive: true });
    const other = (await request(app).post('/api/auth/login').send({ username: 'catalogue', password: 'catalogue-password' }).expect(200)).body.token;
    await record(id, { received: true }, other).expect(403);
    assert.equal((await record(id, {}).expect(400)).body.message, 'Say whether the payment was received');
    await record('000000000000000000000000', { received: true }).expect(404);
  });
});
