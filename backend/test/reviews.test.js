const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const {
  startDatabase, stopDatabase, clearDatabase, createApp, registerCustomer, createProduct, adminToken, orderPayload
} = require('./helpers');

describe('product reviews', () => {
  let app;
  let Product;
  let Order;
  let product;
  let sami;
  let leila;

  before(async () => {
    await startDatabase();
    Product = require('../models/Product');
    Order = require('../models/Order');
  });
  after(stopDatabase);
  beforeEach(async () => {
    await clearDatabase();
    // A new app each time: sign-ups are rate limited per visitor
    app = createApp();
    product = await createProduct({ name: 'Pompe', stockQuantity: 20 });
    sami = (await registerCustomer(app)).token;
    leila = (await registerCustomer(app, { email: 'leila@example.com', firstName: 'Leila', lastName: 'trabelsi' })).token;
  });

  const path = (suffix = '') => `/api/products/${product._id}/reviews${suffix}`;
  const as = (token, method, url) => request(app)[method](url).set('Authorization', `Bearer ${token}`);
  const review = (token, fields = {}) => as(token, 'post', path())
    .send({ rating: 5, title: 'Très bien', comment: 'Silencieuse et puissante', ...fields });
  const list = (token, query = '') => (token ? as(token, 'get', path(query)) : request(app).get(path(query))).expect(200);

  describe('writing a review', () => {
    it('publishes it with the first name and last-name initial only', async () => {
      const res = await review(leila, { rating: 4 }).expect(201);
      assert.equal(res.body.review.author, 'Leila T.');
      assert.equal(res.body.review.mine, true);
      assert.deepEqual(res.body.ratingStats.ratingDistribution, { 5: 0, 4: 1, 3: 0, 2: 0, 1: 0 });

      const { reviews } = (await list()).body;
      assert.equal(reviews.length, 1);
      assert.equal(reviews[0].title, 'Très bien');
      assert.equal(reviews[0].customer, undefined);
      assert.ok(!JSON.stringify(reviews).includes('leila@example.com'));
    });

    it('keeps the average, count and distribution up to date', async () => {
      await review(sami, { rating: 5 }).expect(201);
      await review(leila, { rating: 2 }).expect(201);

      const stats = (await request(app).get(`/api/products/${product._id}`).expect(200)).body.ratingStats;
      assert.equal(stats.averageRating, 3.5);
      assert.equal(stats.totalReviews, 2);
      assert.equal(stats.ratingDistribution['2'], 1);
    });

    it('allows one review per customer, even when sent twice at once', async () => {
      const results = await Promise.all([review(sami), review(sami)]);
      assert.deepEqual(results.map(res => res.status).sort(), [201, 409]);
      assert.equal((await Product.findById(product._id)).reviews.length, 1);
    });

    it('needs a signed-in customer and a rating from 1 to 5, a title and a comment', async () => {
      await request(app).post(path()).send({ rating: 5, title: 'x', comment: 'y' }).expect(401);
      await review(sami, { rating: 6 }).expect(400);
      await review(sami, { title: '   ' }).expect(400);
      await review(sami, { comment: '' }).expect(400);
    });

    it('answers 404 for an unknown product and 400 for a malformed id', async () => {
      await as(sami, 'post', '/api/products/64b000000000000000000000/reviews')
        .send({ rating: 5, title: 'x', comment: 'y' }).expect(404);
      await request(app).get('/api/products/nope/reviews').expect(400);
    });

    it('marks the review "verified" when the customer has received the product', async () => {
      await as(sami, 'post', '/api/orders')
        .send(orderPayload([{ productId: product._id, quantity: 1 }], { customer: { firstName: 'Sami', lastName: 'Ben Ali', email: 'sami@example.com', phone: '+21612345678' } }))
        .expect(201);
      // An order still on its way does not count
      assert.equal((await review(sami).expect(201)).body.review.verified, false);

      await Order.updateMany({}, { status: 'delivered' });
      const edited = await as(sami, 'put', path('/mine'))
        .send({ rating: 5, title: 'Toujours bien', comment: 'Après un mois' }).expect(200);
      assert.equal(edited.body.review.verified, true);
      assert.equal((await review(leila).expect(201)).body.review.verified, false);
    });
  });

  describe('the customer’s own review', () => {
    it('is returned with the list so the page can offer to edit it', async () => {
      await review(sami).expect(201);
      assert.equal((await list(sami)).body.myReview.title, 'Très bien');
      assert.equal((await list(leila)).body.myReview, null);
      assert.equal((await list()).body.myReview, null);
    });

    it('can be changed, which updates the rating', async () => {
      await review(sami, { rating: 5 }).expect(201);
      const res = await as(sami, 'put', path('/mine'))
        .send({ rating: 1, title: 'Tombée en panne', comment: 'Après deux semaines' }).expect(200);
      assert.equal(res.body.review.rating, 1);
      assert.ok(res.body.review.editedAt);
      assert.equal(res.body.ratingStats.averageRating, 1);
    });

    it('can be deleted, and then written again', async () => {
      await review(sami).expect(201);
      const res = await as(sami, 'delete', path('/mine')).expect(200);
      assert.equal(res.body.ratingStats.totalReviews, 0);
      assert.equal(res.body.ratingStats.averageRating, 0);
      await as(sami, 'delete', path('/mine')).expect(404);
      await review(sami).expect(201);
    });

    it('cannot be edited when there is none', async () => {
      await as(sami, 'put', path('/mine')).send({ rating: 3, title: 'x', comment: 'y' }).expect(404);
    });
  });

  describe('"helpful" votes', () => {
    it('counts one vote per customer, which can be taken back', async () => {
      const { _id: reviewId } = (await review(sami).expect(201)).body.review;
      const vote = (helpful) => as(leila, 'post', path(`/${reviewId}/helpful`)).send({ helpful });

      assert.deepEqual((await vote(true).expect(200)).body, { helpfulCount: 1, votedHelpful: true });
      assert.deepEqual((await vote(true).expect(200)).body, { helpfulCount: 1, votedHelpful: true });
      assert.equal((await list(leila)).body.reviews[0].votedHelpful, true);
      assert.deepEqual((await vote(false).expect(200)).body, { helpfulCount: 0, votedHelpful: false });
    });

    it('are not allowed on one’s own review', async () => {
      const { _id: reviewId } = (await review(sami).expect(201)).body.review;
      await as(sami, 'post', path(`/${reviewId}/helpful`)).send({ helpful: true }).expect(400);
    });

    it('sort the most helpful reviews first on request', async () => {
      await review(sami, { title: 'Premier' }).expect(201);
      const { _id: second } = (await review(leila, { title: 'Second' }).expect(201)).body.review;
      await as(sami, 'post', path(`/${second}/helpful`)).send({ helpful: true }).expect(200);

      const titles = (query) => list(null, query).then(res => res.body.reviews.map(r => r.title));
      assert.deepEqual(await titles('?sort=helpful'), ['Second', 'Premier']);
      await request(app).get(path('?sort=nope')).expect(400);
    });
  });

  it('pages through the reviews', async () => {
    await review(sami).expect(201);
    await review(leila).expect(201);
    const { body } = await list(null, '?limit=1&page=2');
    assert.equal(body.reviews.length, 1);
    assert.deepEqual(body.pagination, { currentPage: 2, totalPages: 2, totalReviews: 2, hasNext: false, hasPrev: true });
  });

  it('keeps review details out of the product pages', async () => {
    await review(sami).expect(201);
    const one = (await request(app).get(`/api/products/${product._id}`).expect(200)).body;
    const [listed] = (await request(app).get('/api/products').expect(200)).body.products;
    assert.equal(one.reviews, undefined);
    assert.equal(listed.reviews, undefined);
    assert.equal(one.ratingStats.totalReviews, 1);
  });

  describe('moderation in the admin', () => {
    let admin;
    beforeEach(async () => {
      admin = await adminToken(app);
    });

    it('lists every review with the product and the customer’s email', async () => {
      const other = await createProduct({ name: 'Filtre' });
      await review(sami, { rating: 2, title: 'Bruyante' }).expect(201);
      await as(leila, 'post', `/api/products/${other._id}/reviews`)
        .send({ rating: 5, title: 'Parfait', comment: 'Rien à dire' }).expect(201);

      const all = (await as(admin, 'get', '/api/admin/reviews').expect(200)).body;
      assert.equal(all.pagination.totalReviews, 2);
      assert.deepEqual(all.reviews.map(r => r.title), ['Parfait', 'Bruyante']);
      assert.equal(all.reviews[0].product.name, 'Filtre');
      assert.equal(all.reviews[0].customer.email, 'leila@example.com');

      const low = (await as(admin, 'get', '/api/admin/reviews?rating=2').expect(200)).body;
      assert.deepEqual(low.reviews.map(r => r.title), ['Bruyante']);
      const found = (await as(admin, 'get', '/api/admin/reviews?search=filtre').expect(200)).body;
      assert.deepEqual(found.reviews.map(r => r.title), ['Parfait']);
    });

    it('deletes a review and updates the product’s rating', async () => {
      await review(sami, { rating: 1 }).expect(201);
      await review(leila, { rating: 5 }).expect(201);
      const { reviews } = (await as(admin, 'get', '/api/admin/reviews?rating=1').expect(200)).body;

      await as(admin, 'delete', `/api/admin/reviews/${product._id}/${reviews[0]._id}`).expect(200);
      await as(admin, 'delete', `/api/admin/reviews/${product._id}/${reviews[0]._id}`).expect(404);
      const stats = (await Product.findById(product._id).lean()).ratingStats;
      assert.equal(stats.totalReviews, 1);
      assert.equal(stats.averageRating, 5);
    });

    it('is closed to customers and to admins without the products permission', async () => {
      await as(sami, 'get', '/api/admin/reviews').expect(401);
      const Admin = require('../models/Admin');
      await Admin.create({
        username: 'orders', email: 'orders@example.com', password: 'orders-password',
        firstName: 'O', lastName: 'P', role: 'admin', permissions: ['orders'], isActive: true
      });
      const token = (await request(app).post('/api/auth/login')
        .send({ username: 'orders', password: 'orders-password' }).expect(200)).body.token;
      await as(token, 'get', '/api/admin/reviews').expect(403);
    });
  });
});
