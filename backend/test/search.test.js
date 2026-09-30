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

  const search = async (text, extra = '') => names(await request(app).get(`/api/products?search=${encodeURIComponent(text)}${extra}`).expect(200));

  it('ignores accents, typed or not', async () => {
    await createProduct({ name: 'Échelle inox 3 marches', description: 'Pour piscine enterrée' });
    await createProduct({ name: 'Pompe auto-amorçante Victoria', tags: ['cœur de filtration'] });
    assert.deepEqual(await search('echelle'), ['Échelle inox 3 marches']);
    assert.deepEqual(await search('ÉCHELLE'), ['Échelle inox 3 marches']);
    assert.deepEqual(await search('enterree'), ['Échelle inox 3 marches']);
    assert.deepEqual(await search('amorcante'), ['Pompe auto-amorçante Victoria']);
    assert.deepEqual(await search('filtre a sable'), ['Filtre à Sable Premium']);
    assert.deepEqual(await search('séche'), []);
    // The "œ" of the French texts, typed "oe"
    assert.deepEqual(await search('coeur'), ['Pompe auto-amorçante Victoria']);
  });

  it('finds every word typed, in any order and any field', async () => {
    await createProduct({ name: 'Pompe Victoria Plus', brand: 'AstralPool', subcategory: 'Pompes de filtration' });
    assert.deepEqual(await search('victoria pompe'), ['Pompe Victoria Plus']);
    assert.deepEqual(await search('astralpool victoria'), ['Pompe Victoria Plus']);
    assert.deepEqual(await search('pompes filtration'), ['Pompe Victoria Plus']);
    assert.deepEqual(await search('victoria sable'), []);
  });

  it('lists the products named after the search first', async () => {
    await createProduct({ name: 'Réchauffeur électrique', description: 'Se branche après la pompe' });
    assert.deepEqual((await search('pompe')).slice(0, 1), ['Pompe 2HP']);
    assert.deepEqual(await search('pompe', '&sortBy=name&sortOrder=asc'), ['Pompe 2HP', 'Réchauffeur électrique']);
  });

  it('suggests products and categories without accents', async () => {
    await createProduct({ name: 'Électrolyseur au sel' });
    const labels = (await request(app).get('/api/products/search/suggestions?q=electro').expect(200)).body.suggestions.map(s => s.label);
    assert.ok(labels.includes('Électrolyseur au sel'), labels.join(', '));
  });
});
