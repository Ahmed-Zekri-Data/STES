const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const {
  startDatabase, stopDatabase, clearDatabase, createApp, registerCustomer, createProduct
} = require('./helpers');

describe('wishlist', () => {
  let app;
  let session;
  let customerId;

  before(async () => {
    await startDatabase();
    app = createApp();
  });
  after(stopDatabase);
  beforeEach(async () => {
    await clearDatabase();
    const registered = await registerCustomer(app);
    session = registered.token;
    customerId = registered.customer.id;
  });

  const as = (method, path) => request(app)[method](path).set('Authorization', `Bearer ${session}`);
  const add = (product) => as('post', '/api/wishlist/items').send({ productId: String(product._id) });

  it('lists added products with their picture and stock', async () => {
    const pump = await createProduct({ name: 'Pompe', image: '/api/uploads/products/pompe.jpg', stockQuantity: 3 });
    await add(pump).expect(201);

    const { wishlist } = (await as('get', '/api/wishlist').expect(200)).body;
    assert.equal(wishlist.itemsCount, 1);
    const [item] = wishlist.items;
    assert.equal(item.product.name, 'Pompe');
    assert.equal(item.product.image, '/api/uploads/products/pompe.jpg');
    assert.equal(item.product.stockQuantity, 3);
    assert.equal(item.productSnapshot.image, '/api/uploads/products/pompe.jpg');
  });

  it('does not add the same product twice', async () => {
    const pump = await createProduct({ name: 'Pompe' });
    await add(pump).expect(201);
    const res = await add(pump).expect(400);
    assert.match(res.body.message, /already in wishlist/);
    assert.equal((await as('get', '/api/wishlist').expect(200)).body.wishlist.itemsCount, 1);
  });

  it('removes a product and answers 400 for an invalid id', async () => {
    const pump = await createProduct({ name: 'Pompe' });
    const filter = await createProduct({ name: 'Filtre' });
    await add(pump).expect(201);
    await add(filter).expect(201);

    const res = await as('delete', `/api/wishlist/items/${pump._id}`).expect(200);
    assert.deepEqual(res.body.wishlist.items.map(i => i.product.name), ['Filtre']);
    await as('delete', '/api/wishlist/items/not-an-id').expect(400);
  });

  it('drops products deleted from the catalog', async () => {
    const Product = require('../models/Product');
    const pump = await createProduct({ name: 'Pompe' });
    const filter = await createProduct({ name: 'Filtre' });
    await add(pump).expect(201);
    await add(filter).expect(201);
    await Product.deleteOne({ _id: pump._id });

    const { wishlist } = (await as('get', '/api/wishlist').expect(200)).body;
    assert.deepEqual(wishlist.items.map(i => i.product.name), ['Filtre']);
    assert.equal(wishlist.itemsCount, 1);
  });

  it('shows a wishlist publicly only when shared', async () => {
    const pump = await createProduct({ name: 'Pompe' });
    await add(pump).expect(201);
    await request(app).get(`/api/wishlist/public/${customerId}`).expect(404);
    await request(app).get('/api/wishlist/public/not-an-id').expect(404);

    await as('put', '/api/wishlist/settings').send({ isPublic: true }).expect(200);
    const res = await request(app).get(`/api/wishlist/public/${customerId}`).expect(200);
    assert.equal(res.body.wishlist.items[0].product.name, 'Pompe');
    assert.equal(res.body.wishlist.owner.email, undefined);
  });
});
