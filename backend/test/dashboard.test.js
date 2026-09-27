const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const {
  startDatabase, stopDatabase, clearDatabase, createApp, adminToken, createProduct, orderPayload
} = require('./helpers');

const DAY = 24 * 60 * 60 * 1000;

describe('admin dashboard', () => {
  let app;
  let token;
  let Order;
  let Admin;

  before(async () => {
    await startDatabase();
    app = createApp();
    Order = require('../models/Order');
    Admin = require('../models/Admin');
  });
  after(stopDatabase);
  beforeEach(async () => {
    await clearDatabase();
    token = await adminToken(app);
  });

  const dashboard = (query = '', bearer = token) => request(app)
    .get(`/api/admin/dashboard${query}`)
    .set('Authorization', `Bearer ${bearer}`);

  // Places an order through the shop, then dates it and sets its status
  const order = async (items, { daysAgo = 1, status = 'pending', paymentStatus } = {}) => {
    const res = await request(app).post('/api/orders')
      .send(orderPayload(items.map(([product, quantity]) => ({ product: product._id, quantity }))))
      .expect(201);
    const id = res.body.order.id;
    assert.ok(id);
    await Order.collection.updateOne({ _id: new Order.base.Types.ObjectId(String(id)) }, {
      $set: { createdAt: new Date(Date.now() - daysAgo * DAY), status, ...(paymentStatus ? { paymentStatus } : {}) }
    });
    return (await Order.findById(id).lean());
  };

  it('ranks products by units actually sold, over the chosen period', async () => {
    const pump = await createProduct({ name: 'Pompe', price: 500, stockQuantity: 50 });
    const filter = await createProduct({ name: 'Filtre', price: 100, stockQuantity: 50 });
    const chlore = await createProduct({ name: 'Chlore', price: 20, stockQuantity: 50 });

    await order([[filter, 3], [chlore, 1]]);
    await order([[filter, 2], [pump, 1]], { status: 'delivered' });
    await order([[chlore, 10]], { status: 'cancelled' }); // not a sale
    await order([[pump, 5]], { daysAgo: 45 }); // outside the last 30 days

    const res = await dashboard().expect(200);
    assert.deepEqual(res.body.topProducts.map(p => [p.name, p.quantity, p.revenue]), [
      ['Filtre', 5, 500],
      ['Pompe', 1, 500],
      ['Chlore', 1, 20]
    ]);

    const quarter = await dashboard('?days=90').expect(200);
    assert.deepEqual(quarter.body.topProducts[0], {
      ...quarter.body.topProducts[0], name: 'Pompe', quantity: 6, revenue: 3000
    });
  });

  it('counts sales in the period, without cancelled or refunded orders, and the period before', async () => {
    const product = await createProduct({ price: 100, stockQuantity: 50 });
    const a = await order([[product, 1]], { daysAgo: 2 });
    const b = await order([[product, 2]], { daysAgo: 10, status: 'delivered' });
    await order([[product, 1]], { daysAgo: 3, status: 'cancelled' });
    await order([[product, 1]], { daysAgo: 4, paymentStatus: 'refunded' });
    const old = await order([[product, 1]], { daysAgo: 40 });

    const { sales } = (await dashboard().expect(200)).body;
    assert.equal(sales.orders, 2);
    assert.equal(sales.revenue, Math.round((a.totalAmount + b.totalAmount) * 1000) / 1000);
    assert.equal(sales.averageOrder, Math.round(sales.revenue / 2 * 1000) / 1000);
    assert.deepEqual(sales.previous, { orders: 1, revenue: old.totalAmount });
  });

  it('counts orders by status, of all time', async () => {
    const product = await createProduct({ stockQuantity: 50 });
    for (const [status, daysAgo] of [['pending', 1], ['pending', 100], ['confirmed', 1], ['shipped', 2], ['delivered', 3], ['cancelled', 4]]) {
      await order([[product, 1]], { status, daysAgo });
    }
    const { orderStatus } = (await dashboard().expect(200)).body;
    assert.deepEqual(orderStatus, { pending: 2, inProgress: 2, delivered: 1, cancelled: 1 });
  });

  it('lists the latest orders with the customer name', async () => {
    const product = await createProduct({ stockQuantity: 50 });
    await order([[product, 1]], { daysAgo: 2 });
    const latest = await order([[product, 1]], { daysAgo: 1 });

    const { recentOrders } = (await dashboard().expect(200)).body;
    assert.equal(recentOrders[0].orderNumber, latest.orderNumber);
    assert.equal(recentOrders[0].customerName, 'Sami Ben Ali');
  });

  it('reports stock and customers', async () => {
    await createProduct({ name: 'A', stockQuantity: 0 });
    await createProduct({ name: 'B', stockQuantity: 3 });
    await createProduct({ name: 'C', stockQuantity: 40 });
    await request(app).post('/api/customers/register')
      .send({ email: 'sami@example.com', password: 'secret123', firstName: 'Sami', lastName: 'B' }).expect(201);

    const body = (await dashboard().expect(200)).body;
    assert.deepEqual(body.products, { total: 3, outOfStock: 1, lowStock: 1, lowStockThreshold: 5 });
    assert.deepEqual(body.customers, { total: 1, new: 1, previousNew: 0 });
  });

  it('sends each part only to admins allowed to see it', async () => {
    await Admin.create({
      username: 'catalog', email: 'catalog@example.com', password: 'motdepasse-1',
      firstName: 'C', lastName: 'A', role: 'admin', permissions: ['products']
    });
    const other = (await request(app).post('/api/auth/login').send({ username: 'catalog', password: 'motdepasse-1' }).expect(200)).body.token;

    const body = (await dashboard('', other).expect(200)).body;
    assert.ok(body.products);
    assert.equal(body.sales, undefined);
    assert.equal(body.topProducts, undefined);
    assert.equal(body.customers, undefined);
  });

  it('accepts only the offered periods', async () => {
    await dashboard('?days=12').expect(400);
    assert.equal((await dashboard('?days=7').expect(200)).body.period.days, 7);
  });
});
