const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const {
  startDatabase, stopDatabase, clearDatabase, createApp, adminToken, createProduct, createCategory
} = require('./helpers');

describe('brands managed in the admin, used by products and the shop filter', () => {
  let app;
  let as;

  before(async () => {
    await startDatabase();
    app = createApp();
  });
  after(stopDatabase);
  beforeEach(async () => {
    await clearDatabase();
    await createCategory();
    const token = await adminToken(app);
    as = (method, path) => request(app)[method](path).set('Authorization', `Bearer ${token}`);
  });

  const newBrand = (fields) => as('post', '/api/admin/brands').send(fields).expect(201).then(res => res.body);
  const newProduct = (fields) => as('post', '/api/products').send({
    name: 'Filtre', description: 'Test', price: 100, stockQuantity: 5, category: 'filters', ...fields
  });
  const shopBrands = async () => (await request(app).get('/api/products/categories').expect(200)).body.filters.brands;

  describe('assigning products', () => {
    it('saves the brand as spelled in the admin', async () => {
      await newBrand({ name: 'Hayward' });

      const res = await newProduct({ brand: 'hayward' }).expect(201);
      assert.equal(res.body.brand, 'Hayward');
    });

    it('refuses a brand that does not exist', async () => {
      const res = await newProduct({ brand: 'Inconnue' }).expect(400);
      assert.match(JSON.stringify(res.body), /Admin → Brands/);
    });

    it('allows no brand, and clearing it', async () => {
      await newBrand({ name: 'Hayward' });
      const product = (await newProduct({ brand: '' }).expect(201)).body;
      await as('put', `/api/products/${product._id}`).send({ brand: 'Hayward' }).expect(200);

      const cleared = await as('put', `/api/products/${product._id}`).send({ brand: '' }).expect(200);
      assert.equal(cleared.body.brand, '');
    });
  });

  describe('in the shop', () => {
    it('offers active brands that products use, in admin order', async () => {
      await newBrand({ name: 'Zodiac', sortOrder: 2 });
      await newBrand({ name: 'Pentair', sortOrder: 1 });
      await newBrand({ name: 'Sans produit' });
      const hidden = await newBrand({ name: 'Ancienne' });
      await as('put', `/api/admin/brands/${hidden._id}/toggle-status`).expect(200);
      await createProduct({ brand: 'Zodiac' });
      await createProduct({ brand: 'Pentair' });
      await createProduct({ brand: 'Ancienne' });

      assert.deepEqual(await shopBrands(), ['Pentair', 'Zodiac']);
    });

    it('filters by the exact brand, ignoring case', async () => {
      await createProduct({ name: 'Pompe Hayward', brand: 'Hayward' });
      await createProduct({ name: 'Pompe Hayward Pro', brand: 'Hayward Pro' });

      const res = await request(app).get('/api/products?brand=hayward').expect(200);
      assert.deepEqual(res.body.products.map(p => p.name), ['Pompe Hayward']);
    });
  });

  describe('in the admin', () => {
    it('shows how many products each brand has', async () => {
      const hayward = await newBrand({ name: 'Hayward' });
      await createProduct({ brand: 'Hayward' });
      await createProduct({ brand: 'hayward' });

      const res = await as('get', '/api/admin/brands').expect(200);
      assert.equal(res.body.brands.find(b => b._id === hayward._id).productCount, 2);
    });

    it('renames the brand on its products too', async () => {
      const brand = await newBrand({ name: 'Hayward' });
      const product = await createProduct({ brand: 'Hayward' });

      await as('put', `/api/admin/brands/${brand._id}`).send({ name: 'Hayward Pool' }).expect(200);

      const Product = require('../models/Product');
      assert.equal((await Product.findById(product._id).lean()).brand, 'Hayward Pool');
      assert.deepEqual(await shopBrands(), ['Hayward Pool']);
    });

    it('does not delete a brand that still has products', async () => {
      const brand = await newBrand({ name: 'Hayward' });
      await createProduct({ brand: 'hayward' });

      const res = await as('delete', `/api/admin/brands/${brand._id}`).expect(400);
      assert.match(res.body.message, /1 products/);
    });
  });

  describe('upgrading', () => {
    const { ensureProductBrandsExist } = require('../services/brandService');
    const Brand = require('../models/Brand');

    it('creates a brand for each one existing products name, once', async () => {
      await createProduct({ brand: 'AquaPro' });
      await createProduct({ brand: 'aquapro' });
      await createProduct({ brand: 'FilterMax' });
      await createProduct({ brand: '' });

      const created = await ensureProductBrandsExist();

      assert.equal(created.length, 2);
      assert.deepEqual((await Brand.find().sort({ name: 1 }).lean()).map(b => b.name.toLowerCase()), ['aquapro', 'filtermax']);
      assert.deepEqual(await ensureProductBrandsExist(), []);
    });
  });
});
