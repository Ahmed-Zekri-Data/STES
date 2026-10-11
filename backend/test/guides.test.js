const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');
const { startDatabase, stopDatabase, clearDatabase, createApp, createProduct, adminToken } = require('./helpers');
const DEFAULT_GUIDES = require('../config/defaultGuides');
const { cleanPageHtml } = require('../utils/html');

const text = (words) => `<p>${Array.from({ length: words }, (_, i) => `mot${i}`).join(' ')}</p>`;

describe('guides (Conseils)', () => {
  let app;
  let token;
  let distDir;

  before(async () => {
    await startDatabase();
    distDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stes-dist-'));
    fs.writeFileSync(path.join(distDir, 'index.html'), '<!doctype html><html><head><title>STES</title></head><body><div id="root"></div></body></html>');
  });
  after(async () => {
    fs.rmSync(distDir, { recursive: true, force: true });
    await stopDatabase();
  });
  beforeEach(async () => {
    await clearDatabase();
    app = createApp({ frontendDir: distDir });
    token = await adminToken(app);
  });

  const guide = (extra = {}) => ({
    title: 'Eau verte : la rattraper en 48 heures',
    summary: 'Une eau verte vient presque toujours d’un manque de chlore. Voici dans quel ordre agir pour retrouver une eau claire.',
    theme: 'problemes',
    body: `<h2>Pourquoi</h2>${text(400)}<script>alert(1)</script><a href="javascript:alert(1)">piège</a>`,
    ...extra
  });
  const create = (body) => request(app).post('/api/admin/guides').set('Authorization', `Bearer ${token}`).send(body);
  const update = (id, body) => request(app).put(`/api/admin/guides/${id}`).set('Authorization', `Bearer ${token}`).send(body);

  it('keeps a draft out of the shop, the search engines and the sitemap', async () => {
    const draft = (await create(guide()).expect(201)).body.guide;
    assert.equal(draft.slug, 'eau-verte-la-rattraper-en-48-heures');
    assert.equal(draft.published, false);
    assert.doesNotMatch(draft.body, /script|javascript/);

    assert.deepEqual((await request(app).get('/api/guides').expect(200)).body.guides, []);
    await request(app).get(`/api/guides/${draft.slug}`).expect(404);
    const page = await request(app).get(`/conseils/${draft.slug}`).expect(404);
    assert.match(page.text, /<title>Conseil introuvable/);
    assert.doesNotMatch((await request(app).get('/sitemap.xml').expect(200)).text, /conseils\/eau-verte/);
  });

  it('shows a published guide with its products and related guides, for people and search engines', async () => {
    const pump = await createProduct({ name: 'Pompe Victoria', price: 865 });
    const shock = await createProduct({ name: 'Chlore choc', price: 89 });
    const draft = (await create(guide({ slug: 'eau-verte-piscine', products: [`${pump._id}:65557`, String(shock._id), String(pump._id)] })).expect(201)).body.guide;
    const published = (await update(draft._id, { ...guide({ slug: 'eau-verte-piscine', products: [String(shock._id)] }), published: true }).expect(200)).body.guide;
    assert.ok(published.publishedAt);
    await create({ ...guide({ title: 'Eau trouble : les causes', slug: 'eau-trouble' }), published: true }).expect(201);
    await create({ ...guide({ title: 'Choisir sa pompe de piscine', slug: 'choisir-pompe', theme: 'equipement' }), published: true }).expect(201);

    const list = (await request(app).get('/api/guides').expect(200)).body.guides;
    assert.deepEqual(list.map(g => g.slug).sort(), ['choisir-pompe', 'eau-trouble', 'eau-verte-piscine']);
    assert.equal(list.find(g => g.slug === 'eau-verte-piscine').readingMinutes, 2);
    assert.deepEqual((await request(app).get('/api/guides?theme=equipement').expect(200)).body.guides.map(g => g.slug), ['choisir-pompe']);
    await request(app).get('/api/guides?theme=autre').expect(400);

    const one = (await request(app).get('/api/guides/eau-verte-piscine').expect(200)).body;
    assert.equal(one.guide.title, 'Eau verte : la rattraper en 48 heures');
    assert.match(one.guide.body, /<h2>Pourquoi<\/h2>/);
    assert.deepEqual(one.products.map(p => [p.name, p.categoryName]), [['Chlore choc', 'filters']]);
    assert.deepEqual(one.related.map(g => g.slug), ['eau-trouble']);

    const page = (await request(app).get('/conseils/eau-verte-piscine').expect(200)).text;
    assert.match(page, /<title>Eau verte : la rattraper en 48 heures/);
    assert.match(page, /<meta property="og:type" content="article"/);
    assert.match(page, /<link rel="canonical" href="[^"]*\/conseils\/eau-verte-piscine"/);
    const data = JSON.parse(page.match(/<script type="application\/ld\+json" id="page-data">([\s\S]*?)<\/script>/)[1]);
    assert.equal(data['@graph'][0]['@type'], 'Article');
    assert.match(data['@graph'][0].articleBody, /^Pourquoi mot0 mot1/);
    assert.match((await request(app).get('/conseils').expect(200)).text, /<title>Conseils piscine/);
    assert.match((await request(app).get('/sitemap.xml').expect(200)).text, /\/conseils\/eau-verte-piscine/);
  });

  it('checks what the admin writes', async () => {
    const refused = async (body, message) => assert.equal((await create(body).expect(400)).body.message, message);
    await refused(guide({ summary: 'Trop court' }), 'The summary is 30 to 160 characters (Google shows about 155)');
    await refused(guide({ summary: 'x'.repeat(161) }), 'The summary is 30 to 160 characters (Google shows about 155)');
    await refused(guide({ body: '<p>Trop court</p><script>' + 'x'.repeat(500) + '</script>' }), 'The text is too short (at least 200 characters)');
    await refused(guide({ theme: 'autre' }), 'Choose a theme');
    await refused(guide({ slug: 'Avec Espaces' }), 'The address is lowercase letters, digits and dashes, for example eau-verte-piscine');
    await refused(guide({ products: ['pas-un-produit'] }), 'Choose products from the list');
    await refused(guide({ image: 'javascript:alert(1)' }), 'The image must be an https address or an uploaded image');
    await create(guide({ slug: 'eau-verte' })).expect(201);
    assert.equal((await create(guide({ slug: 'eau-verte' })).expect(409)).body.message, 'Another guide already uses this address');
    await request(app).post('/api/admin/guides').send(guide()).expect(401);
  });

  it('can be deleted', async () => {
    const draft = (await create(guide()).expect(201)).body.guide;
    await request(app).delete(`/api/admin/guides/${draft._id}`).set('Authorization', `Bearer ${token}`).expect(200);
    assert.deepEqual((await request(app).get('/api/admin/guides').set('Authorization', `Bearer ${token}`).expect(200)).body.guides, []);
  });

  it('ships first guides that pass the same checks', () => {
    assert.equal(DEFAULT_GUIDES.length, 5);
    assert.equal(new Set(DEFAULT_GUIDES.map(g => g.slug)).size, 5);
    for (const g of DEFAULT_GUIDES) {
      assert.ok(g.title.length >= 5 && g.title.length <= 110, g.slug);
      assert.ok(g.summary.length >= 30 && g.summary.length <= 160, `${g.slug}: summary of ${g.summary.length}`);
      assert.match(g.slug, /^[a-z0-9]+(-[a-z0-9]+)*$/);
      assert.equal(cleanPageHtml(g.body), g.body, `${g.slug}: only allowed HTML`);
    }
  });
});
