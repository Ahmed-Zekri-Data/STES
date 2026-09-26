const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const {
  startDatabase, stopDatabase, clearDatabase, createApp, createProduct, adminToken, registerCustomer, orderPayload
} = require('./helpers');

describe('admin top bar: notifications and search', () => {
  let app;

  before(async () => {
    await startDatabase();
    app = createApp();
  });
  after(stopDatabase);
  beforeEach(clearDatabase);

  const placeOrder = async (product, customer = {}) => {
    const payload = orderPayload([{ productId: product._id, quantity: 1 }]);
    Object.assign(payload.customer, customer);
    const res = await request(app).post('/api/orders').send(payload).expect(201);
    return res.body.order;
  };

  // An admin who may only manage products
  const productsOnlyToken = async () => {
    const Admin = require('../models/Admin');
    await Admin.create({
      username: 'catalog',
      email: 'catalog@example.com',
      password: 'catalog-password',
      firstName: 'Cat',
      lastName: 'Alog',
      role: 'admin',
      permissions: ['products'],
      isActive: true
    });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'catalog', password: 'catalog-password' })
      .expect(200);
    return res.body.token;
  };

  const get = (path, token) => request(app).get(path).set('Authorization', `Bearer ${token}`);

  describe('notifications', () => {
    it('lists pending orders and products running low', async () => {
      const token = await adminToken(app);
      const pump = await createProduct({ name: 'Pompe', stockQuantity: 6 });
      await createProduct({ name: 'Robot', stockQuantity: 0 });
      await createProduct({ name: 'Chlore', stockQuantity: 20 });
      const first = await placeOrder(pump, { firstName: 'Nour', lastName: 'Haddad' });
      const second = await placeOrder(pump);
      // Pompe is now at 4 units

      const res = await get('/api/admin/notifications', token).expect(200);

      assert.equal(res.body.pendingOrders.count, 2);
      assert.deepEqual(res.body.pendingOrders.latest.map(o => o.orderNumber), [second.orderNumber, first.orderNumber]);
      assert.equal(res.body.pendingOrders.latest[1].customerName, 'Nour Haddad');
      assert.equal(res.body.lowStock.count, 2);
      assert.deepEqual(res.body.lowStock.items.map(p => [p.name, p.stockQuantity]), [['Robot', 0], ['Pompe', 4]]);
    });

    it('stops listing an order once it is handled', async () => {
      const token = await adminToken(app);
      const order = await placeOrder(await createProduct());
      await request(app)
        .put(`/api/orders/${order.id}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'confirmed', sendNotification: false })
        .expect(200);

      const res = await get('/api/admin/notifications', token).expect(200);
      assert.equal(res.body.pendingOrders.count, 0);
    });

    it('only shows each admin what they are allowed to manage', async () => {
      await placeOrder(await createProduct({ stockQuantity: 2 }));
      const token = await productsOnlyToken();

      const res = await get('/api/admin/notifications', token).expect(200);
      assert.equal(res.body.pendingOrders, undefined);
      assert.equal(res.body.lowStock.count, 1);
    });

    it('requires an admin', async () => {
      const { token } = await registerCustomer(app);
      await request(app).get('/api/admin/notifications').expect(401);
      await get('/api/admin/notifications', token).expect(401);
    });
  });

  describe('search', () => {
    it('finds orders, products and customers', async () => {
      const token = await adminToken(app);
      await registerCustomer(app, { email: 'nour@example.com', firstName: 'Nour', lastName: 'Ben Salah' });
      const robot = await createProduct({ name: 'Robot Dolphin', brand: 'Maytronics' });
      const order = await placeOrder(robot, { firstName: 'Nour', lastName: 'Ben Salah', email: 'nour@example.com' });

      const byName = await get('/api/admin/search?q=ben salah', token).expect(200);
      assert.deepEqual(byName.body.orders.map(o => o.orderNumber), [order.orderNumber]);
      assert.deepEqual(byName.body.customers.map(c => c.email), ['nour@example.com']);
      assert.deepEqual(byName.body.products, []);

      const byNumber = await get(`/api/admin/search?q=${order.orderNumber.slice(-6)}`, token).expect(200);
      assert.deepEqual(byNumber.body.orders.map(o => o.orderNumber), [order.orderNumber]);

      const byBrand = await get('/api/admin/search?q=maytro', token).expect(200);
      assert.deepEqual(byBrand.body.products.map(p => p.name), ['Robot Dolphin']);
    });

    it('treats the search text literally', async () => {
      const token = await adminToken(app);
      await createProduct({ name: 'Filtre (sable)' });
      await createProduct({ name: 'Filtre cartouche' });

      const res = await get(`/api/admin/search?q=${encodeURIComponent('(sable)')}`, token).expect(200);
      assert.deepEqual(res.body.products.map(p => p.name), ['Filtre (sable)']);
      await get(`/api/admin/search?q=${encodeURIComponent('.*')}`, token).expect(200)
        .then(r => assert.deepEqual(r.body.products, []));
    });

    it('rejects searches that are too short', async () => {
      const token = await adminToken(app);
      await get('/api/admin/search?q=a', token).expect(400);
      await get('/api/admin/search', token).expect(400);
    });

    it('only searches what the admin is allowed to manage', async () => {
      const product = await createProduct({ name: 'Pompe Nour' });
      await placeOrder(product, { firstName: 'Nour' });
      await registerCustomer(app, { firstName: 'Nour' });
      const token = await productsOnlyToken();

      const res = await get('/api/admin/search?q=nour', token).expect(200);
      assert.deepEqual(Object.keys(res.body), ['products']);
      assert.deepEqual(res.body.products.map(p => p.name), ['Pompe Nour']);
    });
  });
});
