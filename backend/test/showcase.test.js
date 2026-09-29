const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const mongoose = require('mongoose');
const {
  startDatabase, stopDatabase, clearDatabase, createApp, adminToken, createProduct, orderPayload
} = require('./helpers');

describe('home page showcase', () => {
  let app;
  let token;

  before(async () => {
    await startDatabase();
    app = createApp();
  });
  after(stopDatabase);
  beforeEach(async () => {
    await clearDatabase();
    token = await adminToken(app);
  });

  const save = (showcase) => request(app).put('/api/admin/settings').set('Authorization', `Bearer ${token}`).send({ showcase });
  const showcase = async () => (await request(app).get('/api/showcase').expect(200)).body;

  it('shows nothing to sell until products are chosen', async () => {
    const body = await showcase();
    assert.deepEqual(body.hotspots, { pump: null, filter: null, robot: null, lights: null, ring: null });
    assert.deepEqual(body.problems.green, { products: [], total: 0 });
    assert.deepEqual(body.configurator, { sizes: [], lights: null, options: [] });
    assert.deepEqual(body.packs, []);
    assert.equal(body.partnerBadge, '');
    assert.deepEqual(body.map, { governorates: [], orders: 0 });
  });

  it('shows the chosen products with their current price and stock', async () => {
    const pump = await createProduct({ name: 'Pompe Victoria Plus 1 CV', price: 690 });
    const chlorine = await createProduct({ name: 'Chlore choc 5 kg', price: 65, category: 'chemicals' });
    const antiAlgae = await createProduct({ name: 'Anti-algues 3 L', price: 39, stockQuantity: 0 });
    await save({
      hotspots: { pump: String(pump._id), filter: '', robot: null },
      problems: { green: [chlorine._id, antiAlgae._id] },
      partnerBadge: 'Partenaire agréé AstralPool'
    }).expect(200);

    // A price change shows at once
    await mongoose.model('Product').updateOne({ _id: pump._id }, { price: 650 });
    const body = await showcase();
    assert.equal(body.hotspots.pump.name, 'Pompe Victoria Plus 1 CV');
    assert.equal(body.hotspots.pump.price, 650);
    assert.equal(body.hotspots.filter, null);
    assert.deepEqual(body.problems.green.products.map(p => p.name), ['Chlore choc 5 kg', 'Anti-algues 3 L']);
    assert.equal(body.problems.green.total, 104);
    assert.equal(body.problems.green.products[1].inStock, false);
    assert.equal(body.partnerBadge, 'Partenaire agréé AstralPool');
  });

  it('prices packs by the product they are sold as, and shows the saving', async () => {
    const pack = await createProduct({ name: 'Pack ouverture de saison', price: 219 });
    const items = await Promise.all([['Chlore choc', 65], ['pH moins', 49], ['Anti-algues', 39], ['Trousse d’analyse', 109]]
      .map(([name, price]) => createProduct({ name, price })));
    await save({ packs: [{ product: pack._id, season: 'Avril – mai', includes: items.map(i => i._id) }] }).expect(200);

    const [shown] = (await showcase()).packs;
    assert.equal(shown.product.name, 'Pack ouverture de saison');
    assert.equal(shown.season, 'Avril – mai');
    assert.equal(shown.includes.length, 4);
    assert.equal(shown.worth, 262);
    assert.equal(shown.saving, 43);
  });

  it('builds the configurator from sizes with their pump and filter', async () => {
    const [pumpSmall, filterSmall, led, robot] = await Promise.all(['Pompe ¾ CV', 'Filtre Ø 400', 'Projecteur LED', 'Robot E30']
      .map((name, i) => createProduct({ name, price: 100 * (i + 1) })));
    await save({
      sizes: [{ label: '6 × 3 m', pump: pumpSmall._id, filter: filterSmall._id }, { label: '8 × 4 m', pump: '', filter: '' }],
      lights: led._id,
      options: [robot._id]
    }).expect(200);

    const { configurator } = await showcase();
    // A size with neither pump nor filter is left out
    assert.deepEqual(configurator.sizes.map(s => [s.label, s.pump.name, s.filter.name]), [['6 × 3 m', 'Pompe ¾ CV', 'Filtre Ø 400']]);
    assert.equal(configurator.lights.name, 'Projecteur LED');
    assert.deepEqual(configurator.options.map(o => o.name), ['Robot E30']);
  });

  it('leaves out products deleted since they were chosen', async () => {
    const robot = await createProduct({ name: 'Robot E30' });
    await save({ hotspots: { robot: robot._id }, options: [robot._id] }).expect(200);
    await mongoose.model('Product').deleteOne({ _id: robot._id });
    const body = await showcase();
    assert.equal(body.hotspots.robot, null);
    assert.deepEqual(body.configurator.options, []);
  });

  it('refuses what is not a product, or too much', async () => {
    const res = await save({ hotspots: { pump: 'not-an-id' } }).expect(400);
    assert.equal(res.body.message, 'Choose a product from the list');
    const product = await createProduct();
    await save({ problems: { green: Array(7).fill(product._id) } }).expect(400);
    await save({ packs: [{ season: 'Été' }] }).expect(400);
    await save({ sizes: [{ label: '', pump: product._id }] }).expect(400);
    // Only admins allowed to change settings
    await request(app).put('/api/admin/settings').send({ showcase: { showMap: false } }).expect(401);
  });

  it('counts orders by governorate, without cancelled ones, and can hide the map', async () => {
    const product = await createProduct({ price: 50, stockQuantity: 50 });
    const place = (governorate) => request(app).post('/api/orders')
      .send(orderPayload([{ productId: product._id, quantity: 1 }], {
        customer: { firstName: 'Sami', lastName: 'Ben Ali', email: 'guest@example.com', phone: '+21612345678', address: { street: '1 Rue', city: 'Ville', governorate } },
        shipping: { address: '1 Rue', city: 'Ville', governorate }
      }))
      .expect(201).then(res => res.body.order);
    await place('Sousse'); await place('sousse '); await place('Nabeul');
    const cancelled = await place('Nabeul');
    await mongoose.model('Order').updateOne({ _id: cancelled.id }, { status: 'cancelled' });

    const { map } = await showcase();
    assert.deepEqual(map, { governorates: [{ governorate: 'sousse', count: 2 }, { governorate: 'nabeul', count: 1 }], orders: 3 });

    await save({ showMap: false }).expect(200);
    assert.equal((await showcase()).map, null);
  });

  it('shows the best recent reviews, signed with a first name and initial', async () => {
    const Customer = require('../models/Customer');
    const customer = await Customer.create({ email: 'leila@example.com', password: 'secret123', firstName: 'Leila', lastName: 'Trabelsi' });
    const reviews = [
      { customer: customer._id, rating: 5, title: 'Parfait', comment: 'Pompe très silencieuse, installée en une matinée.' },
      { customer: customer._id, rating: 2, title: 'Bof', comment: 'Livraison en retard de deux jours, dommage.' },
      { customer: customer._id, rating: 4, title: 'Court', comment: 'Bien.' }
    ];
    const product = await createProduct({ name: 'Pompe', reviews });
    const [review, ...others] = (await showcase()).reviews;
    assert.deepEqual(others, []);
    assert.equal(review.comment, 'Pompe très silencieuse, installée en une matinée.');
    assert.equal(review.author, 'Leila T.');
    assert.equal(review.productId, String(product._id));
    assert.ok(!JSON.stringify(review).includes('leila@example.com'));
  });
});
