const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');

// Keep test uploads out of the real upload folder
const uploadDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stes-uploads-'));
process.env.UPLOAD_PATH = uploadDir;

const {
  startDatabase, stopDatabase, clearDatabase, createApp, adminToken, registerCustomer
} = require('./helpers');

// A real 1×1 PNG
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64'
);
const SVG = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');

describe('product image uploads', () => {
  let app;
  let admin;

  before(startDatabase);
  after(async () => {
    await stopDatabase();
    fs.rmSync(uploadDir, { recursive: true, force: true });
  });
  beforeEach(async () => {
    await clearDatabase();
    app = createApp();
    admin = await adminToken(app);
  });

  const upload = (token, buffer, filename, contentType) => {
    const req = request(app).post('/api/admin/uploads/product-image');
    if (token) {
      req.set('Authorization', `Bearer ${token}`);
    }
    return req.attach('image', buffer, { filename, contentType });
  };

  it('stores an uploaded image and serves it back', async () => {
    const res = await upload(admin, PNG, 'pompe.png', 'image/png').expect(201);

    assert.match(res.body.url, /^\/api\/uploads\/products\/[0-9a-f]{32}\.png$/);
    const served = await request(app).get(res.body.url).expect(200);
    assert.equal(served.headers['content-type'], 'image/png');
    assert.match(served.headers['cache-control'], /immutable/);
    assert.deepEqual(Buffer.from(served.body), PNG);
  });

  it('names files by their content, not by the uploaded name', async () => {
    const res = await upload(admin, PNG, 'photo.jpg', 'image/jpeg').expect(201);
    assert.match(res.body.url, /\.png$/);
  });

  it('requires an admin allowed to manage products', async () => {
    const Admin = require('../models/Admin');
    await Admin.create({
      username: 'orders-only', email: 'orders@example.com', password: 'orders-password',
      firstName: 'O', lastName: 'Nly', role: 'admin', permissions: ['orders'], isActive: true
    });
    const ordersOnly = (await request(app).post('/api/auth/login')
      .send({ username: 'orders-only', password: 'orders-password' })).body.token;
    const { token: customer } = await registerCustomer(app);

    await upload(null, PNG, 'a.png', 'image/png').expect(401);
    await upload(customer, PNG, 'a.png', 'image/png').expect(401);
    await upload(ordersOnly, PNG, 'a.png', 'image/png').expect(403);
  });

  it('rejects files that are not JPEG, PNG or WebP, whatever they claim to be', async () => {
    const fake = await upload(admin, Buffer.from('not really an image'), 'photo.jpg', 'image/jpeg').expect(400);
    assert.match(fake.body.message, /JPEG, PNG ou WebP/);
    await upload(admin, SVG, 'logo.svg', 'image/svg+xml').expect(400);
  });

  it('rejects images over 5 MB', async () => {
    const big = Buffer.concat([PNG, Buffer.alloc(5 * 1024 * 1024)]);
    const res = await upload(admin, big, 'big.png', 'image/png').expect(400);
    assert.match(res.body.message, /5 Mo/);
  });

  it('rejects a request without an image', async () => {
    await request(app)
      .post('/api/admin/uploads/product-image')
      .set('Authorization', `Bearer ${admin}`)
      .expect(400);
  });

  it('does not serve files outside the upload folder', async () => {
    fs.writeFileSync(path.join(uploadDir, '..', 'stes-secret.txt'), 'secret');
    try {
      const res = await request(app).get('/api/uploads/..%2fstes-secret.txt');
      assert.notEqual(res.status, 200);
      assert.doesNotMatch(res.text || '', /secret/);
    } finally {
      fs.rmSync(path.join(uploadDir, '..', 'stes-secret.txt'), { force: true });
    }
  });

  describe('product image field', () => {
    const product = (image) => ({
      name: 'Pompe', description: 'Test', price: 100, category: 'pumps-motors', stockQuantity: 5, image
    });
    const create = (image) => request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${admin}`)
      .send(product(image));

    it('accepts uploaded images, placeholders and http(s) links', async () => {
      const { url } = (await upload(admin, PNG, 'p.png', 'image/png')).body;

      for (const image of [url, '/api/placeholder/300/200', 'https://cdn.example.com/pompe.jpg']) {
        const res = await create(image).expect(201);
        assert.equal(res.body.image, image);
      }
    });

    it('rejects other schemes and paths', async () => {
      for (const image of ['javascript:alert(1)', 'data:image/png;base64,AAAA', '/api/uploads/../../package.json', '/etc/passwd']) {
        await create(image).expect(400);
      }
    });
  });
});
