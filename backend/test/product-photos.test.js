const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');

// Keep test uploads out of the real upload folder
const uploadDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stes-photos-'));
process.env.UPLOAD_PATH = uploadDir;

const { startDatabase, stopDatabase, clearDatabase, createApp, adminToken, createProduct } = require('./helpers');
const Product = require('../models/Product');

// A real 1×1 PNG
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');

describe('product photos named after a code', () => {
  let app;
  let token;

  before(startDatabase);
  after(async () => {
    await stopDatabase();
    fs.rmSync(uploadDir, { recursive: true, force: true });
  });
  beforeEach(async () => {
    await clearDatabase();
    app = createApp();
    token = await adminToken(app);
  });

  const send = (files, { replace } = {}) => {
    const req = request(app).post('/api/admin/products/photos').set('Authorization', `Bearer ${token}`);
    if (replace !== undefined) req.field('replace', String(replace));
    for (const [name, buffer] of files) req.attach('photos', buffer, { filename: name, contentType: 'image/png' });
    return req;
  };
  const imageOf = async (id) => (await Product.findById(id).lean()).image;

  it('puts each photo on the product with that code, itself or one of its versions', async () => {
    const pump = await createProduct({ name: 'Victoria Plus Silent', price: 0, variants: [{ sku: '65557', label: '1/2 CV', price: 865 }, { sku: '65562', label: '1 CV', price: 903 }] });
    const skimmer = await createProduct({ name: 'Skimmer', sku: '74831CL090' });

    const res = await send([['65562.png', PNG], ['74831CL090 (1).png', PNG], ['99999.png', PNG], ['00000.png', Buffer.from('not an image')]]).expect(200);
    assert.deepEqual(res.body.results.map(r => [r.code, r.status]), [['65562', 'set'], ['74831CL090', 'set'], ['99999', 'unknown'], ['00000', 'unknown']]);

    const url = await imageOf(pump._id);
    assert.match(url, /^\/api\/uploads\/products\/[a-f0-9]{32}\.png$/);
    assert.ok(fs.existsSync(path.join(uploadDir, 'products', path.basename(url))));
    assert.match(await imageOf(skimmer._id), /^\/api\/uploads\/products\//);
  });

  it('keeps photos already set, unless asked to replace them', async () => {
    const pump = await createProduct({ name: 'Pompe', sku: '65557', image: '/api/uploads/products/real-photo.jpg' });
    const kept = (await send([['65557.png', PNG]]).expect(200)).body.results[0];
    assert.deepEqual([kept.status, kept.product], ['kept', 'Pompe']);
    assert.equal(await imageOf(pump._id), '/api/uploads/products/real-photo.jpg');

    await send([['65557.png', PNG]], { replace: true }).expect(200);
    assert.notEqual(await imageOf(pump._id), '/api/uploads/products/real-photo.jpg');

    // A placeholder is not a photo: it is always replaced
    const other = await createProduct({ name: 'Autre', sku: '11111', image: '/api/placeholder/300/200' });
    await send([['11111.png', PNG]]).expect(200);
    assert.match(await imageOf(other._id), /^\/api\/uploads\/products\//);
  });

  it('refuses a file that is not an image, and is for admins who manage products', async () => {
    await createProduct({ name: 'Pompe', sku: '65557' });
    const res = await send([['65557.png', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>')]]).expect(200);
    assert.equal(res.body.results[0].status, 'invalid');
    await request(app).post('/api/admin/products/photos').attach('photos', PNG, '65557.png').expect(401);
    assert.equal((await request(app).post('/api/admin/products/photos').set('Authorization', `Bearer ${token}`).expect(400)).body.message, 'No photos received');
  });
});
