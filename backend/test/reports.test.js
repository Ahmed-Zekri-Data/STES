const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const mongoose = require('mongoose');
const {
  startDatabase, stopDatabase, clearDatabase, createApp, createProduct, createCategory, adminToken, orderPayload
} = require('./helpers');

// Admin → Reports
describe('sales reports', () => {
  let app;
  let admin;
  let Order;
  let pump;
  let filter;

  before(async () => {
    await startDatabase();
    Order = require('../models/Order');
  });
  after(stopDatabase);
  beforeEach(async () => {
    await clearDatabase();
    app = createApp();
    admin = await adminToken(app);
    await createCategory({ name: 'Pompes et Moteurs', slug: 'pumps' });
    await createCategory();
    pump = await createProduct({ name: 'Pompe', price: 500, category: 'pumps', stockQuantity: 100 });
    filter = await createProduct({ name: 'Filtre', price: 100, category: 'filters', stockQuantity: 100 });
  });

  // Places an order, then dates it (UTC instant) and sets its status
  const order = async ({ at, items, governorate = 'Tunis', method = 'cash_on_delivery', status, paymentStatus }) => {
    const payload = orderPayload(items.map(([product, quantity]) => ({ productId: product._id, quantity })), {
      shipping: { address: '1 Rue', city: 'Ville', governorate },
      payment: { method }
    });
    const { id } = (await request(app).post('/api/orders').send(payload).expect(201)).body.order;
    // Straight to the collection: Mongoose keeps createdAt as first saved
    await Order.collection.updateOne(
      { _id: new mongoose.Types.ObjectId(id) },
      { $set: { createdAt: new Date(at), ...(status && { status }), ...(paymentStatus && { paymentStatus }) } }
    );
    return Order.findById(id).lean();
  };
  const report = (query) => request(app).get(`/api/admin/reports/sales${query}`).set('Authorization', `Bearer ${admin}`);

  it('totals the period’s sales without cancelled or refunded orders, and compares with the period before', async () => {
    const a = await order({ at: '2026-09-02T10:00:00Z', items: [[pump, 1]] });
    const b = await order({ at: '2026-09-05T10:00:00Z', items: [[filter, 3]] });
    await order({ at: '2026-09-06T10:00:00Z', items: [[pump, 2]], status: 'cancelled' });
    await order({ at: '2026-09-07T10:00:00Z', items: [[pump, 2]], paymentStatus: 'refunded' });
    const before = await order({ at: '2026-08-25T10:00:00Z', items: [[filter, 1]] });

    const { body } = await report('?from=2026-09-01&to=2026-09-07').expect(200);
    assert.deepEqual(body.period, { from: '2026-09-01', to: '2026-09-07', days: 7, group: 'day' });
    assert.equal(body.totals.orders, 2);
    assert.equal(body.totals.revenue, Math.round((a.totalAmount + b.totalAmount) * 1000) / 1000);
    assert.equal(body.totals.itemsSold, 4);
    assert.equal(body.totals.cancelled, 1);
    assert.equal(body.totals.averageOrder, Math.round(((a.totalAmount + b.totalAmount) / 2) * 1000) / 1000);
    assert.equal(body.previous.from, '2026-08-25');
    assert.equal(body.previous.to, '2026-08-31');
    assert.equal(body.previous.revenue, before.totalAmount);
  });

  it('counts days in Tunis time and includes days without sales', async () => {
    // 23:30 UTC on the 1st is 00:30 on the 2nd in Tunis
    await order({ at: '2026-09-01T23:30:00Z', items: [[filter, 1]] });
    await order({ at: '2026-09-03T12:00:00Z', items: [[filter, 1]] });

    const { series } = (await report('?from=2026-09-01&to=2026-09-04').expect(200)).body;
    assert.deepEqual(series.map(day => [day.period, day.orders]), [
      ['2026-09-01', 0], ['2026-09-02', 1], ['2026-09-03', 1], ['2026-09-04', 0]
    ]);
  });

  it('groups long periods by week (from Monday) or by month', async () => {
    await order({ at: '2026-09-02T10:00:00Z', items: [[filter, 1]] }); // Wednesday
    await order({ at: '2026-09-06T10:00:00Z', items: [[filter, 1]] }); // Sunday, same week
    await order({ at: '2026-10-15T10:00:00Z', items: [[filter, 1]] });

    const weeks = (await report('?from=2026-09-01&to=2026-11-30').expect(200)).body;
    assert.equal(weeks.period.group, 'week');
    assert.equal(weeks.series[0].period, '2026-08-31');
    assert.equal(weeks.series[0].orders, 2);
    assert.equal(weeks.series.reduce((sum, week) => sum + week.orders, 0), 3);

    const months = (await report('?from=2026-01-01&to=2026-12-31').expect(200)).body;
    assert.equal(months.period.group, 'month');
    assert.equal(months.series.length, 12);
    assert.deepEqual(months.series.slice(8, 10).map(m => [m.period, m.orders]), [['2026-09-01', 2], ['2026-10-01', 1]]);

    const byDay = (await report('?from=2026-01-01&to=2026-12-31&group=day').expect(200)).body;
    assert.equal(byDay.series.length, 365);
  });

  it('breaks sales down by category, product, governorate and payment method', async () => {
    // Bank transfer is offered once the shop has an account
    await require('../models/Settings').create({ key: 'shop', bank: { beneficiary: 'STES SARL', rib: '08104000123456789034' } });
    await order({ at: '2026-09-02T10:00:00Z', items: [[pump, 1], [filter, 2]], governorate: 'Sfax' });
    await order({ at: '2026-09-03T10:00:00Z', items: [[filter, 1]], governorate: 'Sfax', method: 'bank_transfer' });
    await order({ at: '2026-09-04T10:00:00Z', items: [[filter, 1]], governorate: 'Tunis' });

    const { body } = await report('?from=2026-09-01&to=2026-09-30').expect(200);
    assert.deepEqual(body.categories.map(c => [c.name, c.quantity, c.revenue]), [['Pompes et Moteurs', 1, 500], ['Filtration', 4, 400]]);
    assert.deepEqual(body.products.map(p => [p.name, p.quantity, p.orders]), [['Pompe', 1, 1], ['Filtre', 4, 3]]);
    assert.deepEqual(body.governorates.map(g => [g.name, g.orders]), [['Sfax', 2], ['Tunis', 1]]);
    assert.deepEqual(body.paymentMethods.map(p => [p.method, p.orders]).sort(), [['bank_transfer', 1], ['cash_on_delivery', 2]]);
  });

  it('needs a valid period of at most two years', async () => {
    await report('').expect(400);
    await report('?from=2026-09-10&to=2026-09-01').expect(400);
    await report('?from=2020-01-01&to=2026-01-01').expect(400);
    await report('?from=2026-09-01&to=2026-09-30&group=year').expect(400);
  });

  it('exports every order of the period, cancelled ones too', async () => {
    await order({ at: '2026-09-03T10:00:00Z', items: [[filter, 2]], status: 'cancelled' });
    await order({ at: '2026-09-02T10:00:00Z', items: [[pump, 1]], governorate: 'Sfax' });
    await order({ at: '2026-10-02T10:00:00Z', items: [[pump, 1]] });

    const { body } = await request(app).get('/api/admin/reports/orders?from=2026-09-01&to=2026-09-30')
      .set('Authorization', `Bearer ${admin}`).expect(200);
    assert.equal(body.truncated, false);
    assert.deepEqual(body.orders.map(o => [o.status, o.items, o.governorate]), [
      ['pending', 'Pompe x1', 'Sfax'],
      ['cancelled', 'Filtre x2', 'Tunis']
    ]);
    assert.equal(body.orders[0].email, 'guest@example.com');
  });

  it('is only for admins who manage orders', async () => {
    const Admin = require('../models/Admin');
    await Admin.create({
      username: 'catalogue', email: 'catalogue@example.com', password: 'catalogue-password',
      firstName: 'C', lastName: 'A', role: 'admin', permissions: ['products'], isActive: true
    });
    const token = (await request(app).post('/api/auth/login')
      .send({ username: 'catalogue', password: 'catalogue-password' }).expect(200)).body.token;
    await request(app).get('/api/admin/reports/sales?from=2026-09-01&to=2026-09-30').set('Authorization', `Bearer ${token}`).expect(403);
    await request(app).get('/api/admin/reports/sales?from=2026-09-01&to=2026-09-30').expect(401);
  });
});
