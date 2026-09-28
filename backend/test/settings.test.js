const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const {
  startDatabase, stopDatabase, clearDatabase, createApp, adminToken, createProduct
} = require('./helpers');

describe('shop settings', () => {
  let app;
  let token;
  let Admin;

  before(async () => {
    await startDatabase();
    app = createApp();
    Admin = require('../models/Admin');
  });
  after(stopDatabase);
  beforeEach(async () => {
    await clearDatabase();
    token = await adminToken(app);
  });

  const as = (method, path, bearer = token) => request(app)[method](path).set('Authorization', `Bearer ${bearer}`);
  const save = (body) => as('put', '/api/admin/settings').send(body);
  const quote = (product, quantity = 1, paymentMethod = 'cash_on_delivery') => request(app)
    .post('/api/orders/quote')
    .send({ items: [{ product: product._id, quantity }], place: 'Tunis', paymentMethod })
    .expect(200)
    .then(res => res.body.pricing);

  it('starts with the defaults', async () => {
    const res = await request(app).get('/api/settings').expect(200);
    assert.deepEqual(res.body, {
      contact: { phone: '+216 12 345 678', whatsapp: '+216 12 345 678', email: 'info@stes.tn', address: 'Tunis, Tunisie' },
      // No bank account yet: bank transfer is not offered
      bank: null,
      delivery: { freeDeliveryOver: 200, baseCost: 7, cashOnDeliveryFee: 5 },
      // Timbre fiscal added to each order
      stampDuty: 1
    });
  });

  it('shows saved contact details to the shop, and keeps what was not sent', async () => {
    await save({ contact: { phone: '+216 71 234 567', email: 'Contact@STES.tn' } }).expect(200);
    await save({ contact: { address: '12 Rue de Marseille, Tunis' } }).expect(200);

    const { contact } = (await request(app).get('/api/settings').expect(200)).body;
    assert.deepEqual(contact, {
      phone: '+216 71 234 567', whatsapp: '+216 12 345 678', email: 'contact@stes.tn', address: '12 Rue de Marseille, Tunis'
    });
  });

  it('allows removing the WhatsApp number', async () => {
    await save({ contact: { whatsapp: '' } }).expect(200);
    assert.equal((await request(app).get('/api/settings')).body.contact.whatsapp, '');
  });

  it('refuses invalid values', async () => {
    assert.match((await save({ contact: { phone: 'call us' } }).expect(400)).body.message, /phone number/);
    await save({ contact: { email: 'not-an-email' } }).expect(400);
    await save({ contact: { address: '' } }).expect(400);
    await save({ delivery: { baseCost: -1 } }).expect(400);
    await save({ lowStockThreshold: 2.5 }).expect(400);
  });

  it('prices delivery with the saved amounts', async () => {
    const product = await createProduct({ price: 150 });
    const before = await quote(product);
    assert.equal(before.shippingCost, 7);
    assert.equal(before.paymentFee, 5);

    await save({ delivery: { baseCost: 10, cashOnDeliveryFee: 3 } }).expect(200);
    const after = await quote(product);
    assert.equal(after.shippingCost, 10);
    assert.equal(after.paymentFee, 3);

    await save({ delivery: { freeDeliveryOver: 100 } }).expect(200);
    assert.equal((await quote(product)).shippingCost, 0);
  });

  it('uses the saved low-stock threshold in the admin', async () => {
    await createProduct({ name: 'Pompe', stockQuantity: 8 });
    const low = async () => (await as('get', '/api/admin/products').expect(200)).body;
    assert.equal((await low()).stockCounts.low, 0);

    await save({ lowStockThreshold: 10 }).expect(200);
    const res = await low();
    assert.equal(res.stockCounts.low, 1);
    assert.equal(res.lowStockThreshold, 10);
    assert.equal((await as('get', '/api/admin/notifications').expect(200)).body.lowStock.threshold, 10);
  });

  it('needs the settings permission to change', async () => {
    await Admin.create({
      username: 'catalog', email: 'catalog@example.com', password: 'motdepasse-1',
      firstName: 'C', lastName: 'A', role: 'admin', permissions: ['products']
    });
    const other = (await request(app).post('/api/auth/login').send({ username: 'catalog', password: 'motdepasse-1' }).expect(200)).body.token;

    await as('get', '/api/admin/settings', other).expect(403);
    await as('put', '/api/admin/settings', other).send({ lowStockThreshold: 1 }).expect(403);
    await request(app).put('/api/admin/settings').send({ lowStockThreshold: 1 }).expect(401);
  });
});
