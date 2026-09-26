const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const {
  startDatabase, stopDatabase, clearDatabase, createApp, adminToken, createProduct, createCategory, registerCustomer
} = require('./helpers');

describe('admin product list', () => {
  let app;
  let as;

  before(async () => {
    await startDatabase();
    app = createApp();
  });
  after(stopDatabase);
  beforeEach(async () => {
    await clearDatabase();
    const token = await adminToken(app);
    as = (method, path) => request(app)[method](path).set('Authorization', `Bearer ${token}`);
  });

  // An admin with only the given permissions
  const limitedAdmin = async (permissions) => {
    const Admin = require('../models/Admin');
    await Admin.create({
      username: 'limited',
      email: 'limited@example.com',
      password: 'limited-password',
      firstName: 'Lim',
      lastName: 'Ited',
      role: 'admin',
      permissions,
      isActive: true
    });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'limited', password: 'limited-password' })
      .expect(200);
    return res.body.token;
  };

  it('lists out-of-stock products, which the shop hides', async () => {
    await createProduct({ name: 'Pompe', stockQuantity: 4 });
    await createProduct({ name: 'Robot', stockQuantity: 0 });

    const shop = await request(app).get('/api/products').expect(200);
    assert.deepEqual(shop.body.products.map(p => p.name), ['Pompe']);

    const admin = await as('get', '/api/admin/products?sort=name').expect(200);
    assert.deepEqual(admin.body.products.map(p => p.name), ['Pompe', 'Robot']);
  });

  it('pages through every product, not just the first 12', async () => {
    for (let i = 0; i < 30; i++) {
      await createProduct({ name: `Produit ${String(i).padStart(2, '0')}` });
    }

    const first = await as('get', '/api/admin/products?sort=name').expect(200);
    const second = await as('get', '/api/admin/products?sort=name&page=2').expect(200);

    assert.equal(first.body.products.length, 24);
    assert.equal(second.body.products.length, 6);
    assert.deepEqual(first.body.pagination, { currentPage: 1, totalPages: 2, totalProducts: 30 });
    assert.equal(second.body.products.at(-1).name, 'Produit 29');
  });

  it('filters by stock and counts each group', async () => {
    await createProduct({ name: 'Plein', stockQuantity: 40 });
    await createProduct({ name: 'Presque vide', stockQuantity: 3 });
    await createProduct({ name: 'Vide', stockQuantity: 0 });

    const low = await as('get', '/api/admin/products?stock=low').expect(200);
    const out = await as('get', '/api/admin/products?stock=out').expect(200);

    assert.deepEqual(low.body.products.map(p => p.name), ['Presque vide']);
    assert.deepEqual(out.body.products.map(p => p.name), ['Vide']);
    assert.deepEqual(low.body.stockCounts, { all: 3, low: 1, out: 1 });
    assert.equal(low.body.lowStockThreshold, 5);
  });

  it('searches literally and filters by category, naming each category', async () => {
    await createCategory();
    await createProduct({ name: 'Filtre (sable) 500', category: 'filters' });
    await createProduct({ name: 'Filtre cartouche', category: 'filters', sku: 'FC-200' });
    await createProduct({ name: 'Pompe', category: 'pumps-motors' });

    const bySearch = await as('get', `/api/admin/products?search=${encodeURIComponent('(sable)')}`).expect(200);
    assert.deepEqual(bySearch.body.products.map(p => p.name), ['Filtre (sable) 500']);
    assert.equal(bySearch.body.products[0].categoryName, 'Filtration');

    const bySku = await as('get', '/api/admin/products?search=fc-200').expect(200);
    assert.deepEqual(bySku.body.products.map(p => p.name), ['Filtre cartouche']);

    const byCategory = await as('get', '/api/admin/products?category=filters&sort=name').expect(200);
    assert.deepEqual(byCategory.body.products.map(p => p.name), ['Filtre (sable) 500', 'Filtre cartouche']);
  });

  it('sorts by stock, lowest first', async () => {
    await createProduct({ name: 'B', stockQuantity: 9 });
    await createProduct({ name: 'A', stockQuantity: 0 });
    await createProduct({ name: 'C', stockQuantity: 2 });

    const res = await as('get', '/api/admin/products?sort=stock').expect(200);
    assert.deepEqual(res.body.products.map(p => p.name), ['A', 'C', 'B']);
  });

  describe('permissions', () => {
    it('is only for admins who manage products', async () => {
      const { token: customer } = await registerCustomer(app);
      const ordersOnly = await limitedAdmin(['orders']);

      await request(app).get('/api/admin/products').expect(401);
      await request(app).get('/api/admin/products').set('Authorization', `Bearer ${customer}`).expect(401);
      await request(app).get('/api/admin/products').set('Authorization', `Bearer ${ordersOnly}`).expect(403);
    });

    it('requires the products permission to create, edit or delete products', async () => {
      await createCategory();
      const product = await createProduct();
      const ordersOnly = await limitedAdmin(['orders']);
      const send = (method, path) => request(app)[method](path).set('Authorization', `Bearer ${ordersOnly}`);

      await send('post', '/api/products')
        .send({ name: 'X', description: 'X', price: 1, category: 'filters' })
        .expect(403);
      await send('put', `/api/products/${product._id}`).send({ price: 1 }).expect(403);
      await send('delete', `/api/products/${product._id}`).expect(403);
    });

    it('lets a products-only admin manage products', async () => {
      await createCategory();
      const catalog = await limitedAdmin(['products']);

      await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${catalog}`)
        .send({ name: 'Filtre', description: 'Test', price: 120, category: 'filters', stockQuantity: 2 })
        .expect(201);
      const res = await request(app).get('/api/admin/products').set('Authorization', `Bearer ${catalog}`).expect(200);
      assert.equal(res.body.products.length, 1);
    });
  });
});
