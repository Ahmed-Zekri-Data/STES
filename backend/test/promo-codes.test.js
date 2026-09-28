const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const {
  startDatabase, stopDatabase, clearDatabase, createApp, createProduct, adminToken, orderPayload
} = require('./helpers');

describe('promo codes', () => {
  let app;
  let token;
  let PromoCode;

  before(async () => {
    await startDatabase();
    app = createApp();
    PromoCode = require('../models/PromoCode');
  });
  after(stopDatabase);
  beforeEach(async () => {
    await clearDatabase();
    token = await adminToken(app);
  });

  const admin = (method, path, bearer = token) => request(app)[method](path).set('Authorization', `Bearer ${bearer}`);
  const createCode = (fields) => admin('post', '/api/admin/promo-codes').send({ type: 'percent', value: 10, ...fields });
  const quote = (items, promoCode) => request(app).post('/api/orders/quote')
    .send({ items, shipping: { governorate: 'Tunis' }, paymentMethod: 'cash_on_delivery', promoCode });
  const placeOrder = (items, promoCode) => request(app).post('/api/orders')
    .send(orderPayload(items, { shipping: { address: '1 Rue de Carthage', city: 'Tunis', governorate: 'Tunis' }, promoCode }));
  const usedCount = async (code) => (await PromoCode.findOne({ code })).usedCount;

  describe('admin', () => {
    it('creates codes in capitals and refuses duplicates and impossible values', async () => {
      const res = await createCode({ code: 'ete25', value: 25, description: 'Soldes d\'été' }).expect(201);
      assert.equal(res.body.code, 'ETE25');
      assert.equal(res.body.status, 'active');

      assert.equal((await createCode({ code: 'ETE25' }).expect(409)).body.message, 'A promo code with this code already exists');
      assert.match((await createCode({ code: 'TROP', value: 120 }).expect(400)).body.message, /cannot exceed 100/);
      assert.match((await createCode({ code: 'a b' }).expect(400)).body.message, /3 to 30 letters/);
      assert.match((await createCode({ code: 'DATES', startsAt: '2030-02-01', expiresAt: '2030-01-01' }).expect(400)).body.message, /after the start date/);
      await createCode({ code: 'FIXE500', type: 'fixed', value: 500 }).expect(201); // a fixed amount may exceed 100
    });

    it('is only for admins who manage orders', async () => {
      const Admin = require('../models/Admin');
      await Admin.create({
        username: 'catalogue', email: 'catalogue@example.com', password: 'admin-password',
        firstName: 'A', lastName: 'B', role: 'admin', permissions: ['products'], isActive: true
      });
      const catalogue = (await request(app).post('/api/auth/login').send({ username: 'catalogue', password: 'admin-password' })).body.token;
      await admin('get', '/api/admin/promo-codes', catalogue).expect(403);
      await admin('post', '/api/admin/promo-codes', catalogue).send({ code: 'NOPE', type: 'fixed', value: 5 }).expect(403);
      await request(app).get('/api/admin/promo-codes').expect(401);
    });

    it('lists codes with their state, the orders that used them and the discount given', async () => {
      const product = await createProduct({ price: 100 });
      await createCode({ code: 'DIX' }).expect(201);
      await createCode({ code: 'OFF', isActive: false }).expect(201);
      await createCode({ code: 'OLD', expiresAt: '2020-01-01' }).expect(201);
      await createCode({ code: 'SOON', startsAt: '2099-01-01' }).expect(201);
      await placeOrder([{ productId: product._id, quantity: 2 }], 'DIX').expect(201);

      const { promoCodes } = (await admin('get', '/api/admin/promo-codes').expect(200)).body;
      const byCode = Object.fromEntries(promoCodes.map(p => [p.code, p]));
      assert.equal(byCode.DIX.status, 'active');
      assert.equal(byCode.DIX.usedCount, 1);
      assert.equal(byCode.DIX.orders, 1);
      assert.equal(byCode.DIX.discountTotal, 20);
      assert.equal(byCode.OFF.status, 'disabled');
      assert.equal(byCode.OLD.status, 'expired');
      assert.equal(byCode.SOON.status, 'scheduled');
    });

    it('updates a code, but no longer renames it once used; deleting keeps orders as they were', async () => {
      const product = await createProduct({ price: 100 });
      const promo = (await createCode({ code: 'NOEL' }).expect(201)).body;
      await admin('put', `/api/admin/promo-codes/${promo._id}`).send({ code: 'NOEL2', usageLimit: 3 }).expect(200);
      const order = (await placeOrder([{ productId: product._id, quantity: 1 }], 'noel2').expect(201)).body.order;

      const res = await admin('put', `/api/admin/promo-codes/${promo._id}`).send({ code: 'AUTRE' }).expect(400);
      assert.match(res.body.message, /can no longer be renamed/);
      await admin('put', `/api/admin/promo-codes/${promo._id}`).send({ value: 15, maxDiscount: '' }).expect(200);

      await admin('delete', `/api/admin/promo-codes/${promo._id}`).expect(200);
      const saved = (await admin('get', `/api/orders/${order.id}`).expect(200)).body;
      assert.equal(saved.pricing.discountCode, 'NOEL2');
      assert.equal(saved.pricing.discountAmount, 10);
    });
  });

  describe('checkout', () => {
    it('takes the discount off the products; VAT and delivery follow the discounted amount', async () => {
      const product = await createProduct({ price: 100 });
      await createCode({ code: 'SUMMER10', value: 10 }).expect(201);
      const items = [{ productId: product._id, quantity: 2 }];

      const without = (await quote(items).expect(200)).body.pricing;
      assert.equal(without.totalAmount, 213); // 200 + 7 delivery + 5 cash on delivery + 1 timbre

      const res = await quote(items, 'summer10').expect(200);
      assert.equal(res.body.promoError, undefined);
      assert.deepEqual(res.body.pricing, {
        subtotal: 200,
        discountAmount: 20,
        discountCode: 'SUMMER10',
        shippingCost: 7,
        taxAmount: 30.655, // the VAT inside 180 + 7 + 5 TND
        taxRate: 0.19,
        taxIncluded: true,
        paymentFee: 5,
        stampDuty: 1,
        totalAmount: 193
      });
    });

    it('lets delivery become paid when the discount brings the order under the free-delivery amount', async () => {
      const product = await createProduct({ price: 210 });
      await createCode({ code: 'MOINS20', type: 'fixed', value: 20 }).expect(201);
      const items = [{ productId: product._id, quantity: 1 }];
      assert.equal((await quote(items).expect(200)).body.pricing.shippingCost, 0);
      assert.equal((await quote(items, 'MOINS20').expect(200)).body.pricing.shippingCost, 7);
    });

    it('caps percentages at the maximum discount and never goes below zero', async () => {
      const product = await createProduct({ price: 1000 });
      await createCode({ code: 'CAP', value: 50, maxDiscount: 100 }).expect(201);
      await createCode({ code: 'GROS', type: 'fixed', value: 5000 }).expect(201);
      const items = [{ productId: product._id, quantity: 1 }];
      assert.equal((await quote(items, 'CAP').expect(200)).body.pricing.discountAmount, 100);
      const all = (await quote(items, 'GROS').expect(200)).body.pricing;
      assert.equal(all.discountAmount, 1000);
      assert.equal(all.totalAmount, 13); // delivery 7 + cash on delivery 5 + timbre 1
    });

    it('explains why a code cannot be used, and prices without it', async () => {
      const product = await createProduct({ price: 100 });
      const items = [{ productId: product._id, quantity: 1 }];
      await createCode({ code: 'MIN150', type: 'fixed', value: 30, minOrder: 150 }).expect(201);
      await createCode({ code: 'OFF', isActive: false }).expect(201);
      await createCode({ code: 'OLD', expiresAt: '2020-01-01' }).expect(201);
      await createCode({ code: 'SOON', startsAt: '2099-01-01' }).expect(201);
      await createCode({ code: 'FULL', usageLimit: 1 }).expect(201);
      await PromoCode.updateOne({ code: 'FULL' }, { usedCount: 1 });

      const cases = {
        INCONNU: "Ce code promo n'existe pas ou n'est plus valable.",
        OFF: "Ce code promo n'existe pas ou n'est plus valable.",
        OLD: 'Ce code promo a expiré.',
        SOON: "Ce code promo n'est pas encore valable.",
        FULL: "Ce code promo a atteint sa limite d'utilisation.",
        MIN150: "Ce code promo s'applique à partir de 150 TND d'achats."
      };
      for (const [code, message] of Object.entries(cases)) {
        const res = await quote(items, code).expect(200);
        assert.equal(res.body.promoError, message, code);
        assert.equal(res.body.pricing.discountAmount, undefined);
        assert.equal(res.body.pricing.totalAmount, 113);
      }

      // Placing the order with it is refused, and nothing is taken from stock
      const refused = await placeOrder(items, 'OLD').expect(400);
      assert.equal(refused.body.message, 'Ce code promo a expiré.');
      assert.equal((await require('../models/Product').findById(product._id)).stockQuantity, 10);
    });
  });

  describe('uses', () => {
    it('counts each order once, and refuses the code once the limit is reached', async () => {
      const product = await createProduct({ price: 100 });
      await createCode({ code: 'UNE', usageLimit: 1 }).expect(201);
      const items = [{ productId: product._id, quantity: 1 }];

      const first = (await placeOrder(items, 'UNE').expect(201)).body.order;
      assert.equal(first.pricing.discountCode, 'UNE');
      assert.equal(first.pricing.discountAmount, 10);
      assert.equal(first.totalAmount, 103);
      assert.equal(await usedCount('UNE'), 1);

      assert.equal((await placeOrder(items, 'UNE').expect(400)).body.message, "Ce code promo a atteint sa limite d'utilisation.");
      assert.equal(await usedCount('UNE'), 1);
    });

    it('lets only one of two simultaneous orders take the last use', async () => {
      const { claimPromoUse } = require('../services/promoService');
      await createCode({ code: 'DERNIER', usageLimit: 1 }).expect(201);
      const results = await Promise.allSettled([claimPromoUse('DERNIER'), claimPromoUse('DERNIER')]);
      assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
      assert.equal(results.find(r => r.status === 'rejected').reason.status, 409);
      assert.equal(await usedCount('DERNIER'), 1);
    });

    it('gives the use back when the order is cancelled (once) or deleted, and takes it again if reactivated', async () => {
      const product = await createProduct({ price: 100 });
      await createCode({ code: 'RETOUR', usageLimit: 5 }).expect(201);
      const items = [{ productId: product._id, quantity: 1 }];
      const order = (await placeOrder(items, 'RETOUR').expect(201)).body.order;
      const status = (value) => admin('put', `/api/orders/${order.id}/status`).send({ status: value, sendNotification: false }).expect(200);

      await status('cancelled');
      assert.equal(await usedCount('RETOUR'), 0);
      await status('cancelled'); // no change: nothing given back twice
      assert.equal(await usedCount('RETOUR'), 0);
      await status('confirmed');
      assert.equal(await usedCount('RETOUR'), 1);

      const pending = (await placeOrder(items, 'RETOUR').expect(201)).body.order;
      assert.equal(await usedCount('RETOUR'), 2);
      await admin('delete', `/api/orders/${pending.id}`).expect(200);
      assert.equal(await usedCount('RETOUR'), 1);
    });

    it('shows the discount in the confirmation email', () => {
      const { text } = require('../services/emailNotificationService').generateOrderConfirmationEmail({
        orderNumber: 'ORD-1', trackingCode: 'TRK-1', paymentMethod: 'cash_on_delivery',
        customer: { name: 'Sami', address: { city: 'Tunis' } },
        items: [{ name: 'Filtre', quantity: 2, price: 100 }],
        pricing: { subtotal: 200, discountAmount: 20, discountCode: 'SUMMER10', shippingCost: 7, paymentFee: 5, taxAmount: 28.739, taxRate: 0.19, taxIncluded: true, totalAmount: 192 }
      });
      assert.ok(text.includes('Sous-total : 200.000 TND\nRéduction (SUMMER10) : −20.000 TND\nLivraison : 7.000 TND'));
    });
  });
});
