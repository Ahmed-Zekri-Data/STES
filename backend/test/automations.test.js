const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
for (const gateway of ['PAYMEE', 'FLOUCI', 'D17', 'KONNECT']) {
  process.env[`${gateway}_ENABLED`] = 'false';
}
const {
  startDatabase, stopDatabase, clearDatabase, createApp, createProduct, createCategory, adminToken, orderPayload
} = require('./helpers');
const Order = require('../models/Order');
const FormSubmission = require('../models/FormSubmission');
const CheckoutDraft = require('../models/CheckoutDraft');
const { getSettings } = require('../services/settingsService');

const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;
const later = (ms) => new Date(Date.now() + ms);

describe('automatic emails', () => {
  let app;
  let admin;
  let pump;
  let chlore;
  let automation;
  let emailService;
  let sent;

  before(async () => {
    await startDatabase();
    emailService = require('../services/emailNotificationService');
    automation = require('../services/automationService');
  });
  after(stopDatabase);
  beforeEach(async () => {
    await clearDatabase();
    app = createApp();
    admin = await adminToken(app);
    pump = await createProduct({ name: 'Pompe Victoria', price: 865 });
    chlore = await createProduct({ name: 'Chlore Granulé 5kg', price: 65, replenishAfterDays: 45 });
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

  const settings = async () => (await getSettings()).automations;
  const saveDraft = (extra = {}) => request(app).post('/api/checkout/draft').send({
    draftId: 'draft-12345678', email: 'Leila@Example.com', firstName: 'Leila',
    items: [{ productId: String(pump._id), quantity: 1 }, { productId: String(chlore._id), quantity: 2 }],
    ...extra
  });
  const placeOrder = async (items, email = 'leila@example.com') => {
    const { order } = (await request(app).post('/api/orders')
      .send(orderPayload(items, { customer: { firstName: 'Leila', lastName: 'Ben Salah', email, phone: '+21612345678' } })).expect(201)).body;
    return order;
  };
  const settle = () => new Promise(resolve => setTimeout(resolve, 100));
  const customerEmails = () => sent.filter(m => m.to !== 'admin@example.com' && !/Confirmation de votre commande/.test(m.subject));

  describe('abandoned cart', () => {
    it('sends one reminder after the delay, with a link that fills the cart again', async () => {
      await saveDraft().expect(204);
      assert.equal(await automation.abandonedCarts(later(HOUR), await settings()), 0);
      assert.equal(await automation.abandonedCarts(later(3 * HOUR), await settings()), 1);
      assert.equal(await automation.abandonedCarts(later(5 * HOUR), await settings()), 0);

      const [email] = sent;
      assert.equal(email.to, 'leila@example.com');
      assert.equal(email.subject, 'Votre panier vous attend chez STES Piscines');
      assert.match(email.text, /Pompe Victoria : 865\.000 TND/);
      assert.match(email.text, /Chlore Granulé 5kg x2 : 130\.000 TND/);
      assert.match(email.headers['List-Unsubscribe'], /\/emails\/desinscription\?token=/);
      const token = email.text.match(/reprendre=([a-f\d]{48})/)[1];
      assert.match(email.text, /utm_campaign=abandoned_cart/);

      const { items } = (await request(app).get(`/api/checkout/draft/${token}`).expect(200)).body;
      assert.deepEqual(items.map(i => [i.product.name, i.quantity]), [['Pompe Victoria', 1], ['Chlore Granulé 5kg', 2]]);
      await request(app).get('/api/checkout/draft/'.concat('0'.repeat(48))).expect(404);
    });

    it('sends nothing once the order is placed, or when the customer asked for no reminder', async () => {
      await saveDraft().expect(204);
      await placeOrder([{ productId: pump._id, quantity: 1 }], 'LEILA@example.com');
      await settle();
      assert.equal(await automation.abandonedCarts(later(3 * HOUR), await settings()), 0);
      assert.ok((await CheckoutDraft.findOne({ draftId: 'draft-12345678' })).convertedAt);

      await saveDraft({ draftId: 'draft-87654321', reminders: false }).expect(204);
      assert.equal(await automation.abandonedCarts(later(3 * HOUR), await settings()), 0);
      assert.equal(customerEmails().length, 0);
    });

    it('waits for the morning, and stays off when turned off', async () => {
      await saveDraft().expect(204);
      // 2:00 in Tunis
      const night = new Date(Date.now() + 3 * HOUR);
      night.setUTCHours(1, 0, 0, 0);
      if (night < later(3 * HOUR)) night.setTime(night.getTime() + DAY);
      assert.deepEqual(await automation.runFrequent(night), { skipped: 'night' });
      await request(app).put('/api/admin/settings').set('Authorization', `Bearer ${admin}`).send({ automations: { abandonedCartEnabled: false } }).expect(200);
      assert.equal(await automation.abandonedCarts(later(3 * HOUR), await settings()), 0);
      assert.equal(sent.length, 0);
    });

    it('checks what the checkout sends', async () => {
      assert.equal((await saveDraft({ email: 'pas-un-email' }).expect(400)).body.message, 'Indiquez une adresse email valide');
      assert.equal((await saveDraft({ items: [] }).expect(400)).body.message, 'Le panier est vide');
      await saveDraft({ draftId: '../../x' }).expect(400);
    });
  });

  describe('requests', () => {
    const quote = (extra = {}) => request(app).post('/api/forms/quote').send({
      name: 'Karim Jaziri', email: 'karim@example.com', phone: '+21698765432', city: 'Sousse', message: 'Rénovation de ma piscine', ...extra
    }).expect(201);

    it('tells the admins once about requests left unanswered', async () => {
      await quote();
      await settle();
      sent = [];
      assert.equal(await automation.quoteAlerts(later(2 * HOUR), await settings()), 0);
      assert.equal(await automation.quoteAlerts(later(25 * HOUR), await settings()), 1);
      assert.equal(sent[0].to, 'admin@example.com');
      assert.equal(sent[0].subject, '1 demande attend votre réponse');
      assert.match(sent[0].text, /Karim Jaziri \(Sousse\) · demande de devis/);
      assert.match(sent[0].text, /\/admin\/forms/);
      assert.equal(await automation.quoteAlerts(later(30 * HOUR), await settings()), 0);
    });

    it('asks the customer if they have questions some days after the answer, unless they ordered', async () => {
      await quote();
      await quote({ email: 'nour@example.com', name: 'Nour' });
      await FormSubmission.updateMany({}, { status: 'replied', repliedAt: new Date() });
      await placeOrder([{ productId: pump._id, quantity: 1 }], 'nour@example.com');
      await settle();
      sent = [];
      assert.equal(await automation.quoteFollowUps(later(DAY), await settings(), { whatsapp: '+216 98 765 432' }), 0);
      assert.equal(await automation.quoteFollowUps(later(4 * DAY), await settings(), { whatsapp: '+216 98 765 432' }), 1);
      assert.equal(sent[0].to, 'karim@example.com');
      assert.equal(sent[0].subject, 'Votre projet piscine : avez-vous des questions ?');
      assert.match(sent[0].text, /WhatsApp : https:\/\/wa\.me\/21698765432/);
      assert.equal(await automation.quoteFollowUps(later(5 * DAY), await settings(), { whatsapp: '' }), 0);
    });
  });

  describe('after delivery', () => {
    const deliver = async (order, daysAgo) => Order.updateOne({ _id: order.id }, { status: 'delivered', actualDelivery: new Date(Date.now() - daysAgo * DAY) });

    it('asks for a review on the site and on Google, once', async () => {
      await request(app).put('/api/admin/settings').set('Authorization', `Bearer ${admin}`).send({ marketing: { googleReviewUrl: 'https://g.page/r/stes/review' } }).expect(200);
      const order = await placeOrder([{ productId: pump._id, quantity: 1 }, { productId: chlore._id, quantity: 1 }]);
      await deliver(order, 2);
      await settle();
      sent = [];
      const { marketing } = await getSettings();
      assert.equal(await automation.reviewRequests(new Date(), await settings(), marketing), 0);
      await deliver(order, 6);
      assert.equal(await automation.reviewRequests(new Date(), await settings(), marketing), 1);
      assert.equal(sent[0].subject, 'Votre avis compte pour nous');
      assert.match(sent[0].text, new RegExp(`Pompe Victoria : .*/product/${pump._id}\\?utm_source=email.*#avis`));
      assert.match(sent[0].text, /Laisser un avis sur Google : https:\/\/g\.page\/r\/stes\/review/);
      assert.equal(await automation.reviewRequests(new Date(), await settings(), marketing), 0);
    });

    it('reminds to order consumables again after their days, with a link to order them', async () => {
      const order = await placeOrder([{ productId: pump._id, quantity: 1 }, { productId: chlore._id, quantity: 3 }]);
      await deliver(order, 40);
      await settle();
      sent = [];
      assert.equal(await automation.replenishments(new Date(), await settings()), 0);
      await deliver(order, 46);
      assert.equal(await automation.replenishments(new Date(), await settings()), 1);
      assert.equal(sent[0].subject, 'Bientôt à court de Chlore Granulé 5kg ?');
      assert.match(sent[0].text, /Chlore Granulé 5kg x3 : 195\.000 TND/);
      assert.doesNotMatch(sent[0].text, /Pompe/);
      const token = sent[0].text.match(/reprendre=([a-f\d]{48})/)[1];
      const { items } = (await request(app).get(`/api/checkout/draft/${token}`).expect(200)).body;
      assert.deepEqual(items.map(i => [i.product.name, i.quantity]), [['Chlore Granulé 5kg', 3]]);
      // Once
      assert.equal(await automation.replenishments(new Date(), await settings()), 0);
    });

    it('does not remind products ordered again since, nor reminders more than a month late', async () => {
      const first = await placeOrder([{ productId: chlore._id, quantity: 1 }]);
      await deliver(first, 50);
      const again = await placeOrder([{ productId: chlore._id, quantity: 1 }]);
      await Order.updateOne({ _id: again.id }, { createdAt: new Date(Date.now() - 10 * DAY) }, { timestamps: false });
      const old = await placeOrder([{ productId: chlore._id, quantity: 1 }], 'sami@example.com');
      await deliver(old, 80);
      await settle();
      sent = [];
      assert.equal(await automation.replenishments(new Date(), await settings()), 0);
      assert.equal(sent.length, 0);
    });
  });

  describe('stopping them', () => {
    it('stops every automatic email for an address from the link in any of them', async () => {
      await saveDraft().expect(204);
      await automation.abandonedCarts(later(3 * HOUR), await settings());
      const token = sent[0].headers['List-Unsubscribe'].match(/token=([^>]+)>/)[1];
      sent = [];

      const res = await request(app).post('/api/emails/unsubscribe').send({ token }).expect(200);
      assert.equal(res.body.email, 'leila@example.com');
      await request(app).post('/api/emails/unsubscribe').send({ token }).expect(200);
      await request(app).post('/api/emails/unsubscribe').send({ token: `${token.split('.')[0]}.${'0'.repeat(32)}` }).expect(400);

      const order = await placeOrder([{ productId: chlore._id, quantity: 1 }]);
      await Order.updateOne({ _id: order.id }, { status: 'delivered', actualDelivery: new Date(Date.now() - 46 * DAY) });
      await settle();
      sent = [];
      const { marketing } = await getSettings();
      assert.equal(await automation.reviewRequests(new Date(), await settings(), marketing), 0);
      assert.equal(await automation.replenishments(new Date(), await settings()), 0);
      assert.equal(sent.length, 0);
    });
  });

  describe('in the admin', () => {
    it('counts what was sent, and checks the delays', async () => {
      await saveDraft().expect(204);
      await automation.abandonedCarts(later(3 * HOUR), await settings());
      await settle();
      const stats = (await request(app).get('/api/admin/automations').set('Authorization', `Bearer ${admin}`).expect(200)).body;
      assert.deepEqual(stats.sent, { abandoned_cart: 1, quote_alert: 0, quote_follow_up: 0, review_request: 0, replenishment: 0 });
      assert.equal(stats.emailConfigured, true);
      await request(app).get('/api/admin/automations').expect(401);

      const saved = (await request(app).put('/api/admin/settings').set('Authorization', `Bearer ${admin}`)
        .send({ automations: { abandonedCartHours: 4, reviewRequestDays: 7 } }).expect(200)).body.settings.automations;
      assert.deepEqual([saved.abandonedCartHours, saved.reviewRequestDays, saved.quoteAlertHours], [4, 7, 24]);
      assert.equal((await request(app).put('/api/admin/settings').set('Authorization', `Bearer ${admin}`)
        .send({ automations: { abandonedCartHours: 0 } }).expect(400)).body.message, 'The cart reminder goes 1 to 72 hours after the checkout was left');
    });

    it('sets the reorder reminder on a product', async () => {
      await createCategory();
      const updated = (await request(app).put(`/api/products/${pump._id}`).set('Authorization', `Bearer ${admin}`)
        .send({ name: pump.name, description: 'Pompe', price: 865, category: pump.category, replenishAfterDays: 30 }).expect(200)).body;
      assert.equal((updated.product || updated).replenishAfterDays, 30);
      assert.equal((await request(app).put(`/api/products/${pump._id}`).set('Authorization', `Bearer ${admin}`)
        .send({ name: pump.name, description: 'Pompe', price: 865, category: pump.category, replenishAfterDays: 3 }).expect(400)).body.errors[0].msg,
      'The reorder reminder is a number of days from 7 to 365, or empty');
    });
  });
});
