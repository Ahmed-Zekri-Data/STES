const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const mongoose = require('mongoose');
const { startDatabase, stopDatabase, clearDatabase, createApp, adminToken, createProduct } = require('./helpers');
const { surfaceOf } = require('../services/poolPlanService');

describe('pool builder', () => {
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

  const save = (builder) => request(app).put('/api/admin/settings').set('Authorization', `Bearer ${token}`).send({ builder });
  const quote = (body) => request(app).post('/api/forms/quote').send({ name: 'Leila Trabelsi', email: 'leila@example.com', phone: '+21698765432', city: 'Hammamet', ...body });

  it('works out the water surface of each shape', () => {
    assert.equal(surfaceOf('rectangle', 8, 4), 32);
    assert.equal(Math.round(surfaceOf('oval', 8, 4) * 100) / 100, 25.13);
    // Rounded corners: quarter circles of a quarter of the width
    assert.equal(Math.round(surfaceOf('rounded', 8, 4) * 100) / 100, 31.14);
  });

  it('offers only the chosen equipment, and the estimate once prices are set', async () => {
    assert.deepEqual((await request(app).get('/api/builder').expect(200)).body, { equipment: [], pricePerM2: null });
    const pump = await createProduct({ name: 'Pompe Victoria Plus 1 CV', price: 690 });
    const ladder = await createProduct({ name: 'Échelle inox 3 marches', price: 320, stockQuantity: 0 });
    await save({ equipment: [{ product: pump._id, kind: 'pump' }, { product: ladder._id, kind: 'ladder' }], pricePerM2Min: 900, pricePerM2Max: 1400 }).expect(200);

    const body = (await request(app).get('/api/builder').expect(200)).body;
    assert.deepEqual(body.equipment.map(e => [e.kind, e.product.name, e.product.price, e.product.inStock]), [
      ['pump', 'Pompe Victoria Plus 1 CV', 690, true],
      ['ladder', 'Échelle inox 3 marches', 320, false]
    ]);
    assert.deepEqual(body.pricePerM2, { min: 900, max: 1400 });
  });

  it('refuses unknown drawings and a price range upside down', async () => {
    const pump = await createProduct();
    assert.equal((await save({ equipment: [{ product: pump._id, kind: 'spaceship' }] }).expect(400)).body.message, 'Choose how the product is drawn');
    assert.equal((await save({ pricePerM2Min: 1400, pricePerM2Max: 900 }).expect(400)).body.message, 'The highest price per m² must be at least the lowest');
  });

  it('prices a quote’s plan from the database, whatever the visitor sends', async () => {
    const pump = await createProduct({ name: 'Pompe Victoria Plus 1 CV', price: 690 });
    const light = await createProduct({ name: 'Projecteur LED', price: 249 });
    const notOffered = await createProduct({ name: 'Produit secret', price: 1 });
    await save({ equipment: [{ product: pump._id, kind: 'pump' }, { product: light._id, kind: 'light' }], pricePerM2Min: 900, pricePerM2Max: 1400 }).expect(200);

    await quote({
      plan: {
        shape: 'rectangle', length: 8, width: 4, depth: 1.4,
        items: [{ product: pump._id, quantity: 1, price: 1 }, { product: light._id, quantity: 2 }, { product: notOffered._id, quantity: 5 }],
        link: '/construire?plan=abc'
      }
    }).expect(201);

    const saved = await mongoose.model('FormSubmission').findOne().lean();
    assert.equal(saved.message, 'Piscine rectangulaire 8 × 4 m, 1,4 m de profondeur (32 m², 44,8 m³)');
    assert.deepEqual({ ...saved.plan, equipment: saved.plan.equipment.map(({ name, price, quantity }) => [name, price, quantity]) }, {
      shape: 'rectangle', length: 8, width: 4, depth: 1.4, surface: 32, volume: 44.8, flow: 11.2,
      equipment: [['Pompe Victoria Plus 1 CV', 690, 1], ['Projecteur LED', 249, 2]],
      equipmentTotal: 1188,
      estimate: { min: 28800, max: 44800 },
      link: '/construire?plan=abc'
    });
  });

  it('keeps sizes within reason and drops links to other sites', async () => {
    await quote({ plan: { shape: 'triangle', length: 500, width: 0, depth: 9, link: 'https://evil.example/construire' } }).expect(201);
    const { plan } = await mongoose.model('FormSubmission').findOne().lean();
    assert.equal(plan.shape, 'rectangle');
    assert.deepEqual([plan.length, plan.width, plan.depth], [20, 2, 3]);
    assert.equal(plan.link, undefined);
    assert.equal(plan.estimate, undefined);
  });

  it('still asks for a message on a quote without a plan', async () => {
    await quote({}).expect(400);
    await quote({ message: 'Une piscine de 8 × 4 m à Hammamet' }).expect(201);
  });
});
