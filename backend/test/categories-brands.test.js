const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const {
  startDatabase, stopDatabase, clearDatabase, createApp, adminToken
} = require('./helpers');

// What the admin forms send: every field, with empty strings for the
// optional ones left blank
const categoryForm = (overrides = {}) => ({
  name: 'Filtres à sable',
  nameEn: 'Sand filters',
  nameAr: '',
  description: '',
  icon: '📦',
  image: '',
  parentCategory: '',
  sortOrder: 0,
  isActive: true,
  ...overrides
});

const brandForm = (overrides = {}) => ({
  name: 'Maytronics',
  description: '',
  logo: '',
  website: '',
  country: '',
  isActive: true,
  isFeatured: false,
  sortOrder: 0,
  contactInfo: { email: '', phone: '', address: '' },
  ...overrides
});

describe('admin categories and brands', () => {
  let app;
  let as;

  before(async () => {
    await startDatabase();
    app = createApp();
  });
  after(stopDatabase);
  beforeEach(async () => {
    await clearDatabase();
    const token = await adminToken(app);
    as = (method, path) => request(app)[method](path).set('Authorization', `Bearer ${token}`);
  });

  describe('categories', () => {
    it('creates a category from the admin form', async () => {
      const res = await as('post', '/api/admin/categories').send(categoryForm()).expect(201);

      assert.equal(res.body.name, 'Filtres à sable');
      assert.equal(res.body.slug, 'filtres-a-sable');
      assert.equal(res.body.parentCategory, null);

      const list = await as('get', '/api/admin/categories').expect(200);
      assert.deepEqual(list.body.categories.map(c => c.slug), ['filtres-a-sable']);
    });

    it('keeps accented letters in the address', async () => {
      const res = await as('post', '/api/admin/categories')
        .send(categoryForm({ name: 'Équipements & Accessoires', nameEn: 'Equipment' }))
        .expect(201);
      assert.equal(res.body.slug, 'equipements-accessoires');
    });

    it('falls back to the English name when the name has no Latin letters', async () => {
      const res = await as('post', '/api/admin/categories')
        .send(categoryForm({ name: 'مضخات', nameEn: 'Pumps' }))
        .expect(201);
      assert.equal(res.body.slug, 'pumps');
    });

    it('creates a subcategory under its parent', async () => {
      const parent = await as('post', '/api/admin/categories').send(categoryForm()).expect(201);
      const child = await as('post', '/api/admin/categories')
        .send(categoryForm({ name: 'Sable de quartz', nameEn: 'Quartz sand', parentCategory: parent.body._id }))
        .expect(201);

      assert.equal(child.body.parentCategory.name, 'Filtres à sable');
      const reloaded = await as('get', `/api/admin/categories/${parent.body._id}`).expect(200);
      assert.deepEqual(reloaded.body.subcategories.map(c => c.name), ['Sable de quartz']);
    });

    it('explains a duplicate instead of failing', async () => {
      await as('post', '/api/admin/categories').send(categoryForm()).expect(201);
      const res = await as('post', '/api/admin/categories').send(categoryForm({ name: 'Filtres a sable' })).expect(400);
      assert.match(res.body.message, /already exists/);
    });

    it('updates from the edit form without changing the address', async () => {
      const created = await as('post', '/api/admin/categories').send(categoryForm()).expect(201);

      const res = await as('put', `/api/admin/categories/${created.body._id}`)
        .send(categoryForm({ name: 'Filtres à sable et verre', description: 'Pour piscines' }))
        .expect(200);

      assert.equal(res.body.name, 'Filtres à sable et verre');
      assert.equal(res.body.description, 'Pour piscines');
      // Products refer to categories by slug, so renaming must not break them
      assert.equal(res.body.slug, 'filtres-a-sable');
      assert.equal(res.body.parentCategory, null);
    });

    it('accepts web and uploaded images, and rejects other schemes', async () => {
      await as('post', '/api/admin/categories')
        .send(categoryForm({ image: '/api/uploads/products/abc.png' }))
        .expect(201);
      await as('post', '/api/admin/categories')
        .send(categoryForm({ name: 'Robots', nameEn: 'Robots', image: 'https://cdn.example.com/robot.jpg' }))
        .expect(201);
      await as('post', '/api/admin/categories')
        .send(categoryForm({ name: 'Autre', nameEn: 'Other', image: 'javascript:alert(1)' }))
        .expect(400);
    });

    it('searches literally', async () => {
      await as('post', '/api/admin/categories').send(categoryForm()).expect(201);
      const res = await as('get', `/api/admin/categories?search=${encodeURIComponent('(sable')}`).expect(200);
      assert.equal(res.body.categories.length, 0);
    });
  });

  describe('brands', () => {
    it('creates a brand from the admin form', async () => {
      const res = await as('post', '/api/admin/brands').send(brandForm()).expect(201);

      assert.equal(res.body.slug, 'maytronics');
      const list = await as('get', '/api/admin/brands').expect(200);
      assert.deepEqual(list.body.brands.map(b => b.name), ['Maytronics']);
    });

    it('saves the optional details when filled in', async () => {
      const res = await as('post', '/api/admin/brands').send(brandForm({
        name: 'Hayward Pool',
        website: 'https://hayward.com',
        logo: '/api/uploads/products/hayward.png',
        country: 'USA',
        contactInfo: { email: 'contact@hayward.com', phone: '+1 555', address: '' }
      })).expect(201);

      assert.equal(res.body.slug, 'hayward-pool');
      assert.equal(res.body.website, 'https://hayward.com');
      assert.equal(res.body.contactInfo.email, 'contact@hayward.com');
    });

    it('rejects an invalid website or contact email', async () => {
      await as('post', '/api/admin/brands').send(brandForm({ website: 'not a site' })).expect(400);
      await as('post', '/api/admin/brands').send(brandForm({ contactInfo: { email: 'nope' } })).expect(400);
    });

    it('updates from the edit form', async () => {
      const created = await as('post', '/api/admin/brands').send(brandForm()).expect(201);
      const res = await as('put', `/api/admin/brands/${created.body._id}`)
        .send(brandForm({ description: 'Robots de piscine' }))
        .expect(200);
      assert.equal(res.body.description, 'Robots de piscine');
      assert.equal(res.body.slug, 'maytronics');
    });

    it('explains a duplicate instead of failing', async () => {
      await as('post', '/api/admin/brands').send(brandForm()).expect(201);
      const res = await as('post', '/api/admin/brands').send(brandForm()).expect(400);
      assert.match(res.body.message, /already exists/);
    });
  });
});
