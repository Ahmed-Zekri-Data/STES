const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { startDatabase, stopDatabase, clearDatabase, createApp, adminToken, createCategory } = require('./helpers');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Brand = require('../models/Brand');
const { parseNumber } = require('../services/productImportService');

// Rows as the admin page sends them, read from the catalogue spreadsheet
const row = (row, code, product, model, price, stock, extra = {}) => ({
  row, code, family: 'Filtration pumps', category: 'Pompes et Moteurs', subfamily: 'Self-priming pumps', product, model, price, stock, sell: 'Oui', description: '', ...extra
});
const catalogue = [
  row(2, '65557', 'Victoria Plus Silent', '1/2 HP 230 V', 1290, 3, { description: 'Low-noise self-priming pump.' }),
  row(3, '65562', 'Victoria Plus Silent', '1 HP 230 V', '1 420,500', null),
  row(4, '65569', 'Victoria Plus Silent', '3 HP 230 V', null, 0),
  row(5, '74831', 'Skimmer body', 'Skimmer body', 263, 10, { category: 'Skimmers' }),
  row(6, 'LUK000017', 'Standard ladder', '3 treads', 548, 1, { sell: 'Non' })
];

describe('product import', () => {
  let app;
  let token;

  before(async () => {
    await startDatabase();
    app = createApp();
  });
  after(stopDatabase);
  beforeEach(async () => {
    await clearDatabase();
    token = await adminToken(app);
    await createCategory({ name: 'Pompes et Moteurs', nameEn: 'Pumps & Motors', slug: 'pumps-motors' });
  });

  const send = (rows, extra = {}) => request(app).post('/api/admin/products/import').set('Authorization', `Bearer ${token}`).send({ rows, brand: 'AstralPool', ...extra });

  it('reads prices typed the French way', () => {
    assert.equal(parseNumber('1 290,500'), 1290.5);
    assert.equal(parseNumber('1.290,5'), 1290.5);
    assert.equal(parseNumber('1,290.50'), 1290.5);
    assert.equal(parseNumber('865 TND'), 865);
    assert.equal(parseNumber(''), null);
    assert.ok(Number.isNaN(parseNumber('sur demande')));
  });

  it('shows what would change without saving anything', async () => {
    const report = (await send(catalogue).expect(200)).body;
    assert.deepEqual(
      [report.dryRun, report.created, report.updated, report.versions, report.skipped, report.onRequest, report.newCategories, report.errorCount],
      [true, 2, 0, 4, 1, 1, ['Skimmers'], 0]
    );
    assert.equal(await Product.countDocuments(), 0);
    assert.equal(await Category.countDocuments({ slug: 'skimmers' }), 0);
  });

  it('creates products with their versions, categories and brand', async () => {
    const report = (await send(catalogue, { dryRun: false }).expect(200)).body;
    assert.deepEqual([report.saved, report.created], [true, 2]);

    const pump = await Product.findOne({ name: 'Victoria Plus Silent' }).lean();
    assert.equal(pump.category, 'pumps-motors');
    assert.equal(pump.subcategory, 'Self-priming pumps');
    assert.equal(pump.brand, 'AstralPool');
    assert.equal(pump.description, 'Low-noise self-priming pump.');
    assert.deepEqual(pump.variants.map(v => [v.sku, v.label, v.price, v.stockQuantity]), [
      ['65557', '1/2 HP 230 V', 1290, 3],
      ['65562', '1 HP 230 V', 1420.5, 0],
      ['65569', '3 HP 230 V', null, 0]
    ]);
    assert.deepEqual([pump.price, pump.stockQuantity, pump.backorder], [1290, 3, true]);

    // One row whose model is the product: a product without versions
    const skimmer = await Product.findOne({ sku: '74831' }).lean();
    assert.deepEqual([skimmer.name, skimmer.category, skimmer.variants.length, skimmer.price, skimmer.stockQuantity], ['Skimmer body', 'skimmers', 0, 263, 10]);
    assert.equal(await Brand.countDocuments({ name: 'AstralPool' }), 1);
    assert.equal(await Product.countDocuments({ 'variants.sku': 'LUK000017' }), 0);
  });

  it('updates prices and stock on a new import, and keeps what the admin edited', async () => {
    await send(catalogue, { dryRun: false }).expect(200);
    await Product.updateOne({ 'variants.sku': '65557' }, { $set: { name: 'Pompe Victoria Plus Silent' } });

    const report = (await send([
      row(2, '65557', 'Victoria Plus Silent', '1/2 HP 230 V', 1350, null),
      row(3, '65562', 'Victoria Plus Silent', '1 HP 230 V', 1420.5, 4),
      row(4, '65570', 'Victoria Plus Silent', '3 HP 400 V', 1600, 2)
    ], { dryRun: false }).expect(200)).body;
    assert.deepEqual([report.created, report.updated, report.versionsAdded, report.priceChanges], [0, 1, 1, 1]);

    const pump = await Product.findOne({ 'variants.sku': '65557' }).lean();
    assert.equal(pump.name, 'Pompe Victoria Plus Silent');
    assert.deepEqual(pump.variants.map(v => [v.sku, v.price, v.stockQuantity]), [
      ['65557', 1350, 3], // stock left empty: unchanged
      ['65562', 1420.5, 4],
      ['65569', null, 0], // not in the file: untouched
      ['65570', 1600, 2]
    ]);
    assert.equal(pump.stockQuantity, 9);
  });

  it('replaces names and texts too when asked, for a translated file', async () => {
    await send(catalogue, { dryRun: false }).expect(200);
    const french = [
      row(2, '65557', 'Pompe Victoria Plus Silent', '1/2 CV 230 V', 1290, 3, { description: 'Pompe auto-amorçante silencieuse.', subfamily: 'Pompes auto-amorçantes' }),
      row(3, '65562', 'Pompe Victoria Plus Silent', '1 CV 230 V', 1420.5, null),
      row(4, '65569', 'Pompe Victoria Plus Silent', '3 CV 230 V', null, 0)
    ];

    // Without the option, only the version names change
    let report = (await send(french, { dryRun: false }).expect(200)).body;
    assert.equal(report.textChanges, 0);
    let pump = await Product.findOne({ 'variants.sku': '65557' }).lean();
    assert.deepEqual([pump.name, pump.variants[0].label], ['Victoria Plus Silent', '1/2 CV 230 V']);

    report = (await send(french, { dryRun: false, texts: true }).expect(200)).body;
    assert.deepEqual([report.created, report.updated, report.textChanges], [0, 1, 1]);
    pump = await Product.findOne({ 'variants.sku': '65557' }).lean();
    assert.deepEqual([pump.name, pump.description, pump.subcategory, pump.tags], ['Pompe Victoria Plus Silent', 'Pompe auto-amorçante silencieuse.', 'Pompes auto-amorçantes', ['Pompes auto-amorçantes']]);
  });

  it('lists the rows it cannot read and imports the others', async () => {
    const report = (await send([
      row(2, '65557', 'Victoria Plus Silent', '1/2 HP', 'cher', 1),
      row(3, '65562', 'Victoria Plus Silent', '1 HP', 900, 1.5),
      row(4, '65557', 'Victoria Plus Silent', '1/2 HP', 800, 1),
      row(5, '', '', '', '', ''),
      row(6, '74831', '', '', 263, 1, { subfamily: '' }),
      row(7, '00001', 'Brush', 'Brush', 20, 5)
    ], { dryRun: false }).expect(200)).body;
    assert.deepEqual(report.errors.map(e => e.row), [2, 3, 4, 5, 6]);
    assert.match(report.errors[0].message, /price of 65557 must be a number/);
    assert.match(report.errors[1].message, /stock of 65562 must be a whole number/);
    assert.match(report.errors[2].message, /65557 is already on another row/);
    assert.match(report.errors[3].message, /No product code/);
    assert.deepEqual([report.created, await Product.countDocuments()], [1, 1]);
  });

  it('is for admins who manage products', async () => {
    await request(app).post('/api/admin/products/import').send({ rows: catalogue }).expect(401);
    assert.equal((await send([]).expect(400)).body.message, 'The file must have between 1 and 10000 rows');
  });

  it('takes a large file, while other requests stay small', async () => {
    // About 2.5 MB: 5 000 rows with a long description
    const big = Array.from({ length: 5000 }, (_, i) => row(i + 2, `C${i}`, `Produit ${i}`, 'Modèle', 100, 1, { description: 'x'.repeat(400) }));
    const report = (await send(big, { dryRun: true }).expect(200)).body;
    assert.equal(report.errors.length, 0);
    // A public form sent the same amount of data is refused before being read
    const refused = await request(app).post('/api/forms/contact').send({ name: 'Sami', message: 'x'.repeat(2 * 1024 * 1024) }).expect(413);
    assert.equal(refused.body.message, 'Les données envoyées sont trop volumineuses.');
    // Malformed JSON is the sender's mistake, not a server error
    await request(app).post('/api/forms/contact').set('Content-Type', 'application/json').send('{"name": ').expect(400);
  });
});
