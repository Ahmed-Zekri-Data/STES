const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const {
  startDatabase, stopDatabase, clearDatabase, createApp, adminToken, registerCustomer
} = require('./helpers');

describe('contact and quote forms', () => {
  let app;

  before(startDatabase);
  after(stopDatabase);
  // A new app each time: form submissions are rate limited per visitor
  beforeEach(async () => {
    await clearDatabase();
    app = createApp();
  });

  const contact = (overrides = {}) => request(app)
    .post('/api/forms/contact')
    .send({
      name: 'Leila Mansouri',
      email: 'leila@example.com',
      phone: '+21695456789',
      subject: 'Problème avec pompe',
      message: 'Ma pompe fait un bruit étrange.',
      ...overrides
    });

  const quote = (overrides = {}) => request(app)
    .post('/api/forms/quote')
    .send({
      name: 'Karim Gharbi',
      email: 'karim@example.com',
      phone: '+21694567890',
      city: 'Sousse',
      message: 'Piscine 8x4 à installer.',
      ...overrides
    });

  const admin = async () => {
    const token = await adminToken(app);
    return (method, path) => request(app)[method](path).set('Authorization', `Bearer ${token}`);
  };

  // An admin who may only manage products
  const productsOnly = async () => {
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

  describe('submitting', () => {
    it('saves contact and quote requests for the admin', async () => {
      await contact().expect(201);
      await quote().expect(201);
      const as = await admin();

      const res = await as('get', '/api/forms').expect(200);
      assert.deepEqual(res.body.submissions.map(s => [s.type, s.name, s.status]), [
        ['quote', 'Karim Gharbi', 'new'],
        ['contact', 'Leila Mansouri', 'new']
      ]);
      assert.equal(res.body.submissions[0].city, 'Sousse');
      assert.equal(res.body.submissions[1].subject, 'Problème avec pompe');
    });

    it('accepts addresses with longer domain endings', async () => {
      await contact({ email: 'info@piscines.info' }).expect(201);
      await contact({ email: 'sami@mail.company.store' }).expect(201);
    });

    it('requires a phone number and city for a quote', async () => {
      await quote({ phone: '' }).expect(400);
      await quote({ city: '' }).expect(400);
    });

    it('limits how many forms one visitor can send', async () => {
      for (let i = 0; i < 10; i++) {
        await contact().expect(201);
      }
      const res = await quote().expect(429);
      assert.match(res.body.message, /Trop de messages/);
    });
  });

  describe('managing submissions', () => {
    it('filters by type and status, and searches literally', async () => {
      await contact({ subject: 'Filtre (sable) cassé' }).expect(201);
      await contact({ name: 'Autre', subject: 'Question' }).expect(201);
      await quote().expect(201);
      const as = await admin();

      const quotes = await as('get', '/api/forms?type=quote').expect(200);
      assert.deepEqual(quotes.body.submissions.map(s => s.name), ['Karim Gharbi']);

      const bySubject = await as('get', `/api/forms?search=${encodeURIComponent('(sable)')}`).expect(200);
      assert.deepEqual(bySubject.body.submissions.map(s => s.subject), ['Filtre (sable) cassé']);

      const byCity = await as('get', '/api/forms?search=sousse').expect(200);
      assert.equal(byCity.body.pagination.totalSubmissions, 1);
    });

    it('marks a request read when opened, then replied', async () => {
      const { body } = await contact().expect(201);
      const as = await admin();

      const opened = await as('get', `/api/forms/${body.submissionId}`).expect(200);
      assert.equal(opened.body.status, 'read');

      const replied = await as('put', `/api/forms/${body.submissionId}/status`).send({ status: 'replied' }).expect(200);
      assert.equal(replied.body.status, 'replied');
      assert.ok(replied.body.repliedAt);

      const unread = await as('get', '/api/forms?status=new').expect(200);
      assert.equal(unread.body.submissions.length, 0);
    });

    it('deletes a submission', async () => {
      const { body } = await contact().expect(201);
      const as = await admin();

      await as('delete', `/api/forms/${body.submissionId}`).expect(200);
      await as('get', `/api/forms/${body.submissionId}`).expect(404);
      await as('delete', `/api/forms/${body.submissionId}`).expect(404);
    });

    it('is only for admins with the forms permission', async () => {
      const { body } = await contact().expect(201);
      const catalog = await productsOnly();
      const { token: customer } = await registerCustomer(app);

      await request(app).get('/api/forms').expect(401);
      await request(app).get('/api/forms').set('Authorization', `Bearer ${customer}`).expect(401);
      for (const [method, path] of [
        ['get', '/api/forms'],
        ['get', `/api/forms/${body.submissionId}`],
        ['put', `/api/forms/${body.submissionId}/status`],
        ['delete', `/api/forms/${body.submissionId}`]
      ]) {
        await request(app)[method](path).set('Authorization', `Bearer ${catalog}`).send({ status: 'read' }).expect(403);
      }
    });
  });

  describe('admin notifications', () => {
    it('lists unread contact and quote requests, not newsletter sign-ups', async () => {
      await contact().expect(201);
      await quote().expect(201);
      await request(app).post('/api/forms/newsletter').send({ email: 'news@example.com' }).expect(201);
      const as = await admin();

      const res = await as('get', '/api/admin/notifications').expect(200);
      assert.equal(res.body.newMessages.count, 2);
      assert.deepEqual(res.body.newMessages.latest.map(m => m.type), ['quote', 'contact']);
    });

    it('drops a request once it has been read', async () => {
      const { body } = await contact().expect(201);
      const as = await admin();
      await as('get', `/api/forms/${body.submissionId}`).expect(200);

      const res = await as('get', '/api/admin/notifications').expect(200);
      assert.equal(res.body.newMessages.count, 0);
    });

    it('is not shown to admins without the forms permission', async () => {
      await contact().expect(201);
      const catalog = await productsOnly();

      const res = await request(app).get('/api/admin/notifications').set('Authorization', `Bearer ${catalog}`).expect(200);
      assert.equal(res.body.newMessages, undefined);
    });
  });
});
