const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { startDatabase, stopDatabase, clearDatabase, createApp, adminToken, createProduct } = require('./helpers');
const Settings = require('../models/Settings');
const FormSubmission = require('../models/FormSubmission');
const { DEFAULT_CALENDAR } = require('../config/maintenanceCalendar');

// A pump sold in versions, chosen by version in the settings
const pump = () => createProduct({
  name: 'Victoria Plus',
  price: 0,
  variants: [
    { sku: '65557', label: '1/2 CV', price: 865, stockQuantity: 2 },
    { sku: '65564', label: '1,5 CV', price: 1014, stockQuantity: 0 },
    { sku: '65569', label: '3 CV', price: null, stockQuantity: 0 }
  ]
});

describe('products chosen by version in the settings', () => {
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

  const save = (settings) => request(app).put('/api/admin/settings').set('Authorization', `Bearer ${token}`).send(settings);

  it('shows the home page’s products as the version chosen, ready for the cart', async () => {
    const p = await pump();
    await save({
      showcase: {
        hotspots: { pump: `${p._id}:65557`, filter: String(p._id) },
        sizes: [{ label: 'Petite', pump: `${p._id}:65557` }, { label: 'Grande', pump: `${p._id}:65564` }]
      }
    }).expect(200);

    const { hotspots, configurator } = (await request(app).get('/api/showcase').expect(200)).body;
    assert.deepEqual(
      [hotspots.pump.name, hotspots.pump.price, hotspots.pump.variant, hotspots.pump.inStock, hotspots.pump.choose],
      ['Victoria Plus – 1/2 CV', 865, '65557', true, false]
    );
    // The whole product: the customer chooses the version on its page
    assert.deepEqual([hotspots.filter.name, hotspots.filter.choose, hotspots.filter.variant], ['Victoria Plus', true, undefined]);
    assert.deepEqual(configurator.sizes.map(s => [s.pump.name, s.pump.price, s.pump.inStock]), [
      ['Victoria Plus – 1/2 CV', 865, true],
      ['Victoria Plus – 1,5 CV', 1014, false]
    ]);
  });

  it('refuses a choice that is not a product or one of its versions', async () => {
    const p = await pump();
    assert.equal((await save({ showcase: { hotspots: { pump: `${p._id}:` } } }).expect(400)).body.message, 'Choose a product from the list');
    assert.equal((await save({ showcase: { options: ['not-a-product'] } }).expect(400)).body.message, 'Choose products from the list');
  });

  it('still reads choices saved before versions existed', async () => {
    const other = await createProduct({ name: 'Filtre à sable' });
    await Settings.collection.updateOne({ key: 'shop' }, { $set: { 'showcase.hotspots.filter': other._id } }, { upsert: true });
    const { hotspots } = (await request(app).get('/api/showcase').expect(200)).body;
    assert.equal(hotspots.filter.name, 'Filtre à sable');
  });

  it('offers two versions of one product in the pool builder, and prices each in a quote', async () => {
    const p = await pump();
    const small = `${p._id}:65557`;
    const large = `${p._id}:65564`;
    await save({ builder: { equipment: [{ product: small, kind: 'pump' }, { product: large, kind: 'pump' }] } }).expect(200);

    const { equipment } = (await request(app).get('/api/builder').expect(200)).body;
    assert.deepEqual(equipment.map(e => [e.key, e.product.name, e.product.price]), [
      [small, 'Victoria Plus – 1/2 CV', 865],
      [large, 'Victoria Plus – 1,5 CV', 1014]
    ]);

    await request(app).post('/api/forms/quote').send({
      name: 'Leila Trabelsi', email: 'leila@example.com', phone: '+21698765432', city: 'Hammamet',
      plan: { shape: 'rectangle', length: 8, width: 4, depth: 1.4, items: [{ product: small, quantity: 1 }, { product: large, quantity: 2 }, { product: String(p._id), quantity: 1 }] }
    }).expect(201);
    const { plan } = await FormSubmission.findOne().lean();
    assert.deepEqual(plan.equipment.map(l => [l.name, l.variant, l.price, l.quantity]), [
      ['Victoria Plus – 1/2 CV', '65557', 865, 1],
      ['Victoria Plus – 1,5 CV', '65564', 1014, 2]
    ]);
    assert.equal(plan.equipmentTotal, 2893);
  });

  it('recommends a version with a care reminder', async () => {
    const p = await pump();
    await save({ reminders: { calendar: DEFAULT_CALENDAR.map(r => (r.key === 'opening' ? { ...r, products: [`${p._id}:65569`] } : r)) } }).expect(200);
    const opening = (await request(app).get('/api/maintenance/calendar').expect(200)).body.reminders.find(r => r.key === 'opening');
    assert.deepEqual(opening.products.map(x => [x.name, x.priceOnRequest, x.choose]), [['Victoria Plus – 3 CV', true, true]]);
  });
});
