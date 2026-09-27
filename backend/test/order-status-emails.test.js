const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const {
  startDatabase, stopDatabase, clearDatabase, createApp, createProduct, orderPayload, adminToken, registerCustomer
} = require('./helpers');

// Admin → Orders → "Modifier le statut"
describe('order status changes', () => {
  let app;
  let emailService;
  let sent;
  let admin;
  let product;

  before(async () => {
    await startDatabase();
    emailService = require('../services/emailNotificationService');
  });
  after(stopDatabase);
  beforeEach(async () => {
    await clearDatabase();
    app = createApp();
    sent = [];
    process.env.EMAIL_USER = 'shop@example.tn';
    process.env.EMAIL_PASS = 'smtp-password';
    process.env.FRONTEND_URL = 'https://stes.tn';
    emailService.transporter = {
      sendMail: async (message) => {
        sent.push(message);
        return { messageId: `test-${sent.length}` };
      }
    };
    admin = await adminToken(app);
    product = await createProduct({ name: 'Pompe <Pro>', price: 300, stockQuantity: 10 });
  });

  const waitForEmails = async (count) => {
    for (let i = 0; i < 50 && sent.length < count; i++) {
      await new Promise(resolve => setTimeout(resolve, 20));
    }
  };
  // Emails other than status updates (order confirmation, welcome) are left out
  const statusEmails = () => sent.filter(email => !/^(Confirmation|Bienvenue|Confirmez)/.test(email.subject));
  const settle = () => new Promise(resolve => setTimeout(resolve, 150));

  const placeOrder = async (token) => {
    const req = request(app).post('/api/orders');
    if (token) req.set('Authorization', `Bearer ${token}`);
    const payload = orderPayload([{ productId: product._id, quantity: 1 }], {
      customer: { firstName: 'Sami', lastName: 'Ben Ali', email: 'sami@example.com', phone: '+21612345678' }
    });
    return (await req.send(payload).expect(201)).body.order;
  };
  const setStatus = (order, body) => request(app)
    .put(`/api/orders/${order.id}/status`)
    .set('Authorization', `Bearer ${admin}`)
    .send(body);

  describe('emails to the customer', () => {
    it('tells a guest their order is confirmed, with a tracking link', async () => {
      const order = await placeOrder();
      const res = await setStatus(order, { status: 'confirmed' }).expect(200);
      assert.equal(res.body.customerNotified, true);
      await waitForEmails(2);

      const [email] = statusEmails();
      assert.equal(email.to, 'sami@example.com');
      assert.equal(email.subject, `Votre commande ${order.orderNumber} est confirmée`);
      assert.ok(email.html.includes(`https://stes.tn/track-order?code=${order.trackingCode}`));
      assert.ok(email.text.includes('Bonne nouvelle'));
      assert.ok(email.html.includes('Pompe &lt;Pro&gt;'), 'product names are escaped');
    });

    it('includes the carrier tracking number and the admin’s note when shipped', async () => {
      const order = await placeOrder();
      await setStatus(order, { status: 'shipped', trackingNumber: 'TN123', note: 'Livreur <Aramex> demain matin' }).expect(200);
      await waitForEmails(2);

      const [email] = statusEmails();
      assert.equal(email.subject, `Votre commande ${order.orderNumber} est en route`);
      assert.ok(email.html.includes('TN123'));
      assert.ok(email.html.includes('Livreur &lt;Aramex&gt; demain matin'));
      assert.ok(!email.html.includes('<Aramex>'));
    });

    it('asks for a review of each product once delivered', async () => {
      const order = await placeOrder();
      await setStatus(order, { status: 'delivered' }).expect(200);
      await waitForEmails(2);

      const [email] = statusEmails();
      assert.equal(email.subject, `Votre commande ${order.orderNumber} a été livrée`);
      assert.ok(email.html.includes(`https://stes.tn/product/${product._id}#avis`));
      assert.ok(email.html.includes('Donner mon avis'));
    });

    it('says when an order is cancelled, without a tracking button', async () => {
      const order = await placeOrder();
      await setStatus(order, { status: 'cancelled' }).expect(200);
      await waitForEmails(2);

      const [email] = statusEmails();
      assert.equal(email.subject, `Votre commande ${order.orderNumber} a été annulée`);
      assert.ok(!email.html.includes('Suivre ma commande'));
    });

    it('sends nothing for "en préparation", an unchanged status, or when the admin unticks it', async () => {
      const order = await placeOrder();
      await setStatus(order, { status: 'processing' }).expect(200);
      await setStatus(order, { status: 'processing', note: 'Colis prêt' }).expect(200);
      const quiet = await setStatus(order, { status: 'shipped', sendNotification: false }).expect(200);
      assert.equal(quiet.body.customerNotified, false);
      await settle();
      assert.deepEqual(statusEmails(), []);
    });

    it('follows the account’s email settings, and still emails during quiet hours', async () => {
      const { token, customer } = await registerCustomer(app, { email: 'sami@example.com' });
      const { NotificationPreferences } = require('../models/Notification');
      const prefs = await NotificationPreferences.getOrCreateForCustomer(customer.id);
      prefs.quietHours = { enabled: true, start: '00:00', end: '23:59' };
      await prefs.save();

      const order = await placeOrder(token);
      await setStatus(order, { status: 'confirmed' }).expect(200);
      await waitForEmails(3);
      assert.equal(statusEmails().length, 1);

      prefs.email.orderUpdates = false;
      await prefs.save();
      await setStatus(order, { status: 'cancelled' }).expect(200);
      await settle();
      assert.equal(statusEmails().length, 1);
    });

    it('answers the admin without waiting for the mail server', async () => {
      emailService.transporter = { sendMail: () => new Promise(() => {}) };
      const order = await placeOrder();
      const started = Date.now();
      await setStatus(order, { status: 'confirmed' }).expect(200);
      assert.ok(Date.now() - started < 1000);
    });
  });

  describe('order history', () => {
    it('records each change with the admin’s note, so the tracking page moves on', async () => {
      const order = await placeOrder();
      await setStatus(order, { status: 'confirmed' }).expect(200);
      await setStatus(order, { status: 'shipped', note: 'Remis à Aramex', location: 'Tunis' }).expect(200);

      const { body } = await request(app).get(`/api/tracking/${order.trackingCode}`).expect(200);
      const step = (status) => body.timeline.find(s => s.status === status);
      assert.equal(step('confirmed').completed, true);
      assert.equal(step('shipped').completed, true);
      assert.equal(step('shipped').current, true);
      assert.equal(step('shipped').note, 'Remis à Aramex');
      assert.equal(step('shipped').location, 'Tunis');
      assert.equal(step('delivered').completed, false);
    });

    it('sets the delivery date when delivered', async () => {
      const order = await placeOrder();
      const res = await setStatus(order, { status: 'delivered' }).expect(200);
      assert.ok(res.body.order.actualDelivery);
      assert.equal(res.body.order.items[0].product.name, 'Pompe <Pro>');
      assert.equal(res.body.order.items[0].product.reviews, undefined);
    });
  });
});
