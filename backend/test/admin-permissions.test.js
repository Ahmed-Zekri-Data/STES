const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const {
  startDatabase, stopDatabase, clearDatabase, createApp, createProduct, adminToken, orderPayload
} = require('./helpers');

// Each admin page's API needs the permission that page is for; super admins
// have them all
describe('admin permissions', () => {
  let app;
  let order;
  const tokens = {};

  before(startDatabase);
  after(stopDatabase);
  beforeEach(async () => {
    await clearDatabase();
    app = createApp();
    tokens.super = await adminToken(app);
    const Admin = require('../models/Admin');
    for (const permission of ['orders', 'products', 'settings', 'users']) {
      await Admin.create({
        username: `only-${permission}`, email: `${permission}@example.com`, password: 'admin-password',
        firstName: 'A', lastName: 'B', role: 'admin', permissions: [permission], isActive: true
      });
      tokens[permission] = (await request(app).post('/api/auth/login')
        .send({ username: `only-${permission}`, password: 'admin-password' }).expect(200)).body.token;
    }
    const product = await createProduct();
    order = (await request(app).post('/api/orders')
      .send(orderPayload([{ productId: product._id, quantity: 1 }])).expect(201)).body.order;
  });

  const as = (who, method, path) => request(app)[method](path).set('Authorization', `Bearer ${tokens[who]}`);

  it('keeps orders, their statistics and payments to admins who manage orders', async () => {
    const orderRoutes = [
      ['get', '/api/orders'],
      ['get', `/api/orders/${order.id}`],
      ['get', `/api/orders/number/${order.orderNumber}`],
      ['get', `/api/orders/${order.id}/timeline`],
      ['get', '/api/orders/stats'],
      ['get', '/api/orders/stats/summary'],
      ['get', '/api/payments/stats']
    ];
    for (const [method, path] of orderRoutes) {
      await as('products', method, path).expect(403);
      await as('orders', method, path).expect(200);
    }

    await as('products', 'put', `/api/orders/${order.id}/status`).send({ status: 'confirmed' }).expect(403);
    await as('products', 'post', `/api/orders/${order.id}/notes`).send({ note: 'x' }).expect(403);
    await as('products', 'delete', `/api/orders/${order.id}`).expect(403);
    await as('orders', 'put', `/api/orders/${order.id}/status`).send({ status: 'confirmed', sendNotification: false }).expect(200);
    await as('super', 'get', '/api/orders').expect(200);
  });

  it('keeps the About and Contact page editor to admins who manage settings', async () => {
    await as('orders', 'get', '/api/pages/admin/all').expect(403);
    await as('orders', 'put', '/api/pages/about').send({ title: 'x' }).expect(403);
    await as('settings', 'get', '/api/pages/admin/all').expect(200);
  });

  it('keeps sending notifications to customers to admins who manage customers, and the config check to super admins', async () => {
    await as('orders', 'get', '/api/notifications/admin/logs').expect(403);
    await as('orders', 'post', '/api/notifications/admin/send').send({}).expect(403);
    await as('users', 'get', '/api/notifications/admin/logs').expect(200);
    await as('users', 'get', '/api/notifications/admin/test-config').expect(403);
    await as('super', 'get', '/api/notifications/admin/test-config').expect(200);
  });

  it('no longer has the old admin sign-up route (Admin Users creates accounts)', async () => {
    await as('super', 'post', '/api/auth/register')
      .send({ username: 'newadmin', email: 'n@example.com', password: '123456', firstName: 'N', lastName: 'A' })
      .expect(404);
  });
});
