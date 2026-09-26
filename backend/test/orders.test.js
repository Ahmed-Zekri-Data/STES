const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const request = require('supertest');
const {
  startDatabase, stopDatabase, clearDatabase, createApp, createProduct, productStock,
  adminToken, registerCustomer, orderPayload
} = require('./helpers');

describe('orders', () => {
  let app;

  before(async () => {
    await startDatabase();
    app = createApp();
  });
  after(stopDatabase);
  beforeEach(clearDatabase);

  const placeOrder = (items, { token, extra } = {}) => {
    const req = request(app).post('/api/orders');
    if (token) {
      req.set('Authorization', `Bearer ${token}`);
    }
    return req.send(orderPayload(items, extra));
  };

  describe('pricing', () => {
    it('uses catalog prices and ignores prices sent by the client', async () => {
      const product = await createProduct({ price: 100 });

      const res = await placeOrder([
        { productId: product._id, quantity: 2, price: 0.01, name: 'Free pump' }
      ]).expect(201);

      assert.equal(res.body.order.pricing.subtotal, 200);
      assert.equal(res.body.order.items[0].price, 100);
      assert.equal(res.body.order.items[0].name, 'Filtre à sable');
    });

    it('rejects items without a valid product', async () => {
      await placeOrder([{ name: 'Custom item', price: -500, quantity: 1 }]).expect(400);
      await placeOrder([{ productId: new mongoose.Types.ObjectId(), quantity: 1 }]).expect(400);
    });

    it('rejects quantities below one', async () => {
      const product = await createProduct();
      await placeOrder([{ productId: product._id, quantity: 0 }]).expect(400);
    });
  });

  describe('stock', () => {
    it('takes ordered quantities out of stock', async () => {
      const product = await createProduct({ stockQuantity: 5 });
      await placeOrder([{ productId: product._id, quantity: 2 }]).expect(201);
      assert.equal(await productStock(product._id), 3);
    });

    it('refuses orders beyond stock, counting repeated lines together', async () => {
      const product = await createProduct({ stockQuantity: 3 });

      await placeOrder([{ productId: product._id, quantity: 4 }]).expect(409);
      await placeOrder([
        { productId: product._id, quantity: 2 },
        { productId: product._id, quantity: 2 }
      ]).expect(409);
      assert.equal(await productStock(product._id), 3);
    });

    it('marks a product out of stock when the last unit sells', async () => {
      const Product = require('../models/Product');
      const product = await createProduct({ stockQuantity: 1 });

      await placeOrder([{ productId: product._id, quantity: 1 }]).expect(201);

      const saved = await Product.findById(product._id).lean();
      assert.equal(saved.stockQuantity, 0);
      assert.equal(saved.inStock, false);
    });

    it('puts back stock already taken when a later line fails', async () => {
      // Called directly: through the API, the price check would reject the
      // order before reservation starts. This covers stock that runs out
      // between that check and the reservation.
      const { reserveStock } = require('../services/orderService');
      const available = await createProduct({ stockQuantity: 3 });
      const soldOut = await createProduct({ name: 'Pompe', stockQuantity: 0 });

      await assert.rejects(
        reserveStock([
          { product: available._id, name: available.name, quantity: 1 },
          { product: soldOut._id, name: soldOut.name, quantity: 1 }
        ]),
        { status: 409 }
      );
      assert.equal(await productStock(available._id), 3);
    });

    it('never oversells under concurrent checkouts', async () => {
      const product = await createProduct({ stockQuantity: 4 });

      const results = await Promise.all(Array.from({ length: 10 }, () =>
        placeOrder([{ productId: product._id, quantity: 1 }])
      ));

      assert.equal(results.filter(res => res.status === 201).length, 4);
      assert.equal(await productStock(product._id), 0);
    });
  });

  describe('cancellation', () => {
    it('returns stock once when a customer cancels', async () => {
      const product = await createProduct({ stockQuantity: 5 });
      const { token } = await registerCustomer(app);
      const order = await placeOrder([{ productId: product._id, quantity: 2 }], { token }).expect(201);
      const cancelUrl = `/api/customer-orders/${order.body.order.id}/cancel`;

      await request(app).post(cancelUrl).set('Authorization', `Bearer ${token}`).send({}).expect(200);
      assert.equal(await productStock(product._id), 5);

      await request(app).post(cancelUrl).set('Authorization', `Bearer ${token}`).send({}).expect(400);
      assert.equal(await productStock(product._id), 5);
    });

    it('moves stock when an admin cancels, reactivates and deletes an order', async () => {
      const product = await createProduct({ stockQuantity: 5 });
      const admin = await adminToken(app);
      const order = await placeOrder([{ productId: product._id, quantity: 2 }]).expect(201);
      const orderId = order.body.order.id;
      const setStatus = (status) => request(app)
        .put(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${admin}`)
        .send({ status, sendNotification: false })
        .expect(200);

      await setStatus('cancelled');
      assert.equal(await productStock(product._id), 5);
      await setStatus('cancelled');
      assert.equal(await productStock(product._id), 5);
      await setStatus('pending');
      assert.equal(await productStock(product._id), 3);

      await request(app)
        .delete(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${admin}`)
        .expect(200);
      assert.equal(await productStock(product._id), 5);
    });
  });

  describe('access control', () => {
    it('restricts order lookups to admins', async () => {
      const product = await createProduct();
      const { token: customer } = await registerCustomer(app);
      const admin = await adminToken(app);
      const order = await placeOrder([{ productId: product._id, quantity: 1 }]).expect(201);
      const { id, orderNumber } = order.body.order;

      await request(app).get(`/api/orders/${id}`).expect(401);
      await request(app).get(`/api/orders/${id}`).set('Authorization', `Bearer ${customer}`).expect(401);
      await request(app).get(`/api/orders/${id}`).set('Authorization', `Bearer ${admin}`).expect(200);
      await request(app).get(`/api/orders/number/${orderNumber}`).expect(401);
    });

    it('routes /api/orders/stats to the statistics handler', async () => {
      const admin = await adminToken(app);
      const res = await request(app)
        .get('/api/orders/stats')
        .set('Authorization', `Bearer ${admin}`)
        .expect(200);
      assert.equal(typeof res.body.totalOrders, 'number');
    });

    it('no longer accepts client-priced orders on /api/customer-orders', async () => {
      const { token } = await registerCustomer(app);
      await request(app)
        .post('/api/customer-orders')
        .set('Authorization', `Bearer ${token}`)
        .send({ items: [{ price: 0.01, quantity: 1 }] })
        .expect(404);
    });
  });

  describe('tracking', () => {
    it('tracks an order publicly by tracking code', async () => {
      const product = await createProduct();
      const order = await placeOrder([{ productId: product._id, quantity: 1 }]).expect(201);

      const res = await request(app).get(`/api/tracking/${order.body.order.trackingCode}`).expect(200);
      assert.equal(res.body.order.orderNumber, order.body.order.orderNumber);
    });

    it('returns order statistics for the signed-in customer', async () => {
      const product = await createProduct();
      const { token } = await registerCustomer(app);
      await placeOrder([{ productId: product._id, quantity: 1 }], { token }).expect(201);

      await request(app)
        .get('/api/tracking/customer/stats')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });
  });
});
