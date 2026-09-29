const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const {
  startDatabase, stopDatabase, clearDatabase, createApp, createProduct, createCategory, adminToken, orderPayload
} = require('./helpers');
const Product = require('../models/Product');

// A pump sold in three versions, with the maker's codes
const pump = (overrides = {}) => createProduct({
  name: 'Victoria Plus Silent',
  price: 0,
  stockQuantity: 0,
  variants: [
    { sku: '65557', label: '1/2 HP 230 V', price: 865, stockQuantity: 3 },
    { sku: '65562', label: '1 HP 230 V', price: 903, stockQuantity: 1 },
    { sku: '65569', label: '3 HP 230 V', price: null, stockQuantity: 0 }
  ],
  ...overrides
});

describe('product versions, prices on request and orders on demand', () => {
  let app;

  before(async () => {
    await startDatabase();
    app = createApp();
  });
  after(stopDatabase);
  beforeEach(clearDatabase);

  const placeOrder = (items) => request(app).post('/api/orders').send(orderPayload(items));
  const variantStock = async (id) => Object.fromEntries((await Product.findById(id).lean()).variants.map(v => [v.sku, v.stockQuantity]));

  it('shows a product with versions at its lowest price and total stock', async () => {
    const product = await pump();
    assert.equal(product.price, 865);
    assert.equal(product.stockQuantity, 4);
    assert.equal(product.priceOnRequest, false);
    assert.equal(product.inStock, true);

    const onRequest = await pump({ variants: [{ sku: '1', label: 'A', price: null, stockQuantity: 0 }] });
    assert.equal(onRequest.priceOnRequest, true);
    assert.equal(onRequest.price, 0);
    assert.equal(onRequest.inStock, false);
  });

  it('lets the admin save versions, and works the price and stock out again', async () => {
    await createCategory();
    const token = await adminToken(app);
    const created = (await request(app).post('/api/products').set('Authorization', `Bearer ${token}`).send({
      name: 'Verdon ES', description: 'Pompe', category: 'filters',
      variants: [{ sku: '73676', label: 'ES 50', price: '456', stockQuantity: 2 }, { sku: '73678', label: 'ES 75', price: '', stockQuantity: 0 }]
    }).expect(201)).body;
    assert.deepEqual([created.price, created.stockQuantity, created.variants[1].price], [456, 2, null]);

    const updated = (await request(app).put(`/api/products/${created._id}`).set('Authorization', `Bearer ${token}`).send({
      variants: [{ sku: '73676', label: 'ES 50', price: 480, stockQuantity: 0 }, { sku: '73678', label: 'ES 75', price: 465, stockQuantity: 5 }]
    }).expect(200)).body;
    assert.deepEqual([updated.price, updated.stockQuantity], [465, 5]);

    const res = await request(app).post('/api/products').set('Authorization', `Bearer ${token}`).send({
      name: 'X', description: 'Y', category: 'filters', variants: [{ sku: '1', label: 'A' }, { sku: '1', label: 'B' }]
    }).expect(400);
    assert.equal(res.body.errors[0].msg, 'Each version code can only be used once');

    // Without versions, a product needs a price unless it is on request
    await request(app).post('/api/products').set('Authorization', `Bearer ${token}`).send({ name: 'X', description: 'Y', category: 'filters' }).expect(400);
    const quoteOnly = (await request(app).post('/api/products').set('Authorization', `Bearer ${token}`).send({ name: 'Abri', description: 'Y', category: 'filters', priceOnRequest: true }).expect(201)).body;
    assert.equal(quoteOnly.priceOnRequest, true);
  });

  it('orders a version at its price, and takes it from that version’s stock', async () => {
    const product = await pump();
    const res = await placeOrder([{ productId: product._id, variant: '65562', quantity: 1 }]).expect(201);
    const [line] = res.body.order.items;
    assert.equal(line.name, 'Victoria Plus Silent – 1 HP 230 V');
    assert.equal(line.price, 903);
    assert.deepEqual(line.variant, { sku: '65562', label: '1 HP 230 V' });
    assert.deepEqual(await variantStock(product._id), { 65557: 3, 65562: 0, 65569: 0 });
    assert.equal((await Product.findById(product._id)).stockQuantity, 3);

    // Out of stock now, and not sold on order
    const again = await placeOrder([{ productId: product._id, variant: '65562', quantity: 1 }]).expect(409);
    assert.match(again.body.message, /Insufficient stock/);
  });

  it('refuses a product with versions without one, and a price on request', async () => {
    const product = await pump();
    assert.match((await placeOrder([{ productId: product._id, quantity: 1 }]).expect(400)).body.message, /Choose a version/);
    assert.match((await placeOrder([{ productId: product._id, variant: 'nope', quantity: 1 }]).expect(400)).body.message, /Choose a version/);
    assert.match((await placeOrder([{ productId: product._id, variant: '65569', quantity: 1 }]).expect(409)).body.message, /Price on request/);

    const shelter = await createProduct({ name: 'Abri', priceOnRequest: true, price: 0 });
    assert.match((await placeOrder([{ productId: shelter._id, quantity: 1 }]).expect(409)).body.message, /Price on request/);
  });

  it('sells a product "sur commande" beyond its stock, and gives back only what it took', async () => {
    const product = await pump({ backorder: true });
    const admin = await adminToken(app);
    const res = await placeOrder([{ productId: product._id, variant: '65557', quantity: 5 }]).expect(201);
    assert.equal(res.body.order.items[0].quantity, 5);
    assert.deepEqual(await variantStock(product._id), { 65557: 0, 65562: 1, 65569: 0 });

    await request(app).put(`/api/orders/${res.body.order.id}/status`).set('Authorization', `Bearer ${admin}`)
      .send({ status: 'cancelled', sendNotification: false }).expect(200);
    assert.deepEqual(await variantStock(product._id), { 65557: 3, 65562: 1, 65569: 0 });

    // A simple product on order, with no stock at all
    const cover = await createProduct({ name: 'Couverture', stockQuantity: 0, backorder: true });
    await placeOrder([{ productId: cover._id, quantity: 2 }]).expect(201);
    assert.equal((await Product.findById(cover._id)).stockQuantity, 0);
  });

  it('tells the home page and the pool builder which products are chosen on their page', async () => {
    const token = await adminToken(app);
    const withVersions = await pump();
    const onOrder = await createProduct({ name: 'Couverture', stockQuantity: 0, backorder: true });
    await request(app).put('/api/admin/settings').set('Authorization', `Bearer ${token}`)
      .send({ builder: { equipment: [{ product: withVersions._id, kind: 'pump' }, { product: onOrder._id, kind: 'cover' }] } }).expect(200);
    const { equipment } = (await request(app).get('/api/builder').expect(200)).body;
    assert.deepEqual(equipment.map(e => [e.product.name, e.product.choose, e.product.inStock]), [
      ['Victoria Plus Silent', true, true],
      ['Couverture', false, true]
    ]);
  });

  it('finds a product by a version’s code, and lists prices on request last', async () => {
    await pump();
    await createProduct({ name: 'Abri', priceOnRequest: true, price: 0 });
    await createProduct({ name: 'Filtre', price: 300 });

    const found = (await request(app).get('/api/products?search=65562').expect(200)).body.products;
    assert.deepEqual(found.map(p => p.name), ['Victoria Plus Silent']);

    const cheapest = (await request(app).get('/api/products?sortBy=price&sortOrder=asc').expect(200)).body.products;
    assert.deepEqual(cheapest.map(p => p.name), ['Filtre', 'Victoria Plus Silent', 'Abri']);

    const upTo = (await request(app).get('/api/products?maxPrice=500').expect(200)).body.products;
    assert.deepEqual(upTo.map(p => p.name), ['Filtre']);
  });

  it('lists products without stock that can still be ordered or asked about', async () => {
    await createProduct({ name: 'Couverture', stockQuantity: 0, backorder: true });
    await createProduct({ name: 'Abri', stockQuantity: 0, priceOnRequest: true, price: 0 });
    await createProduct({ name: 'Épuisé', stockQuantity: 0 });
    await pump({ variants: [{ sku: '1', label: 'A', price: 900, stockQuantity: 0 }, { sku: '2', label: 'B', price: null, stockQuantity: 0 }] });

    const names = (await request(app).get('/api/products?sortBy=name&sortOrder=asc').expect(200)).body.products.map(p => p.name);
    assert.deepEqual(names, ['Abri', 'Couverture', 'Victoria Plus Silent']);
  });
});
