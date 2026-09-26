const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { startDatabase, stopDatabase, clearDatabase, createApp, createProduct } = require('./helpers');

describe('product search', () => {
  let app;

  before(async () => {
    await startDatabase();
    app = createApp();
  });
  after(stopDatabase);
  beforeEach(async () => {
    await clearDatabase();
    await createProduct({ name: 'Filtre à Sable Premium', description: 'Filtration pour grandes piscines' });
    await createProduct({ name: 'Pompe 2HP', description: 'Moteur silencieux', category: 'pumps-motors' });
  });

  const names = (res) => res.body.products.map(p => p.name);

  it('finds products by name or description, ignoring case', async () => {
    assert.deepEqual(names(await request(app).get('/api/products?search=filtre').expect(200)), ['Filtre à Sable Premium']);
    assert.deepEqual(names(await request(app).get('/api/products?search=SILENCIEUX').expect(200)), ['Pompe 2HP']);
    assert.deepEqual(names(await request(app).get('/api/products?search=Pompe%202').expect(200)), ['Pompe 2HP']);
  });

  it('treats special characters literally', async () => {
    for (const term of ['(', '*', '[a-z', '.*']) {
      const res = await request(app).get(`/api/products?search=${encodeURIComponent(term)}`).expect(200);
      assert.equal(res.body.products.length, 0, term);
    }
    await request(app).get('/api/products?brand=(').expect(200);
    await request(app).get('/api/products/search/suggestions?q=(').expect(200);
  });

  it('suggests matching products', async () => {
    const res = await request(app).get('/api/products/search/suggestions?q=pomp').expect(200);
    assert.ok(JSON.stringify(res.body).includes('Pompe 2HP'));
  });
});
