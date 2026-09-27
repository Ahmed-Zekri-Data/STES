const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const {
  startDatabase, stopDatabase, clearDatabase, createApp, createProduct, adminToken, orderPayload, registerCustomer
} = require('./helpers');

// Admin → Tracking: "Métriques de Performance"
describe('tracking page performance figures', () => {
  let app;
  let admin;
  let product;

  before(startDatabase);
  after(stopDatabase);
  beforeEach(async () => {
    await clearDatabase();
    app = createApp();
    admin = await adminToken(app);
    product = await createProduct({ stockQuantity: 50 });
  });

  const stats = async () => (await request(app).get('/api/orders/stats?timeRange=30d')
    .set('Authorization', `Bearer ${admin}`).expect(200)).body;
  const order = (email, shipping) => request(app).post('/api/orders')
    .send(orderPayload([{ productId: product._id, quantity: 1 }], {
      customer: { firstName: 'A', lastName: 'B', email, phone: '+21612345678' },
      shipping
    }))
    .expect(201);

  it('shows nothing measured while there are no orders, deliveries or reviews', async () => {
    const body = await stats();
    assert.equal(body.customerSatisfaction, null);
    assert.equal(body.repeatCustomers, null);
    assert.equal(body.avgDeliveryTime, null);
    assert.equal(body.coverageAreas, 0);
  });

  it('counts returning customers and the governorates delivered to', async () => {
    await order('sami@example.com', { address: '1 Rue A', city: 'Tunis', governorate: 'Tunis' });
    await order('sami@example.com', { address: '1 Rue A', city: 'La Marsa', governorate: 'tunis' });
    await order('leila@example.com', { address: '2 Rue B', city: 'Sfax', governorate: 'Sfax' });

    const body = await stats();
    assert.equal(body.repeatCustomers, 50);
    assert.equal(body.coverageAreas, 2);
  });

  it('measures satisfaction as the share of 4 and 5 star reviews', async () => {
    for (const [email, rating] of [['a@example.com', 5], ['b@example.com', 4], ['c@example.com', 2], ['d@example.com', 1]]) {
      const { token } = await registerCustomer(app, { email });
      await request(app).post(`/api/products/${product._id}/reviews`).set('Authorization', `Bearer ${token}`)
        .send({ rating, title: 'Avis', comment: 'Commentaire' }).expect(201);
    }
    assert.equal((await stats()).customerSatisfaction, 50);
  });
});
