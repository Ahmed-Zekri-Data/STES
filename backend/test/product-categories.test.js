const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const {
  startDatabase, stopDatabase, clearDatabase, createApp, adminToken, createProduct, createCategory
} = require('./helpers');

describe('categories managed in the admin, used by products and the shop', () => {
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

  const newCategory = (fields) => as('post', '/api/admin/categories')
    .send({ nameEn: fields.name, icon: '🛁', ...fields })
    .expect(201)
    .then(res => res.body);

  const newProduct = (fields) => as('post', '/api/products').send({
    name: 'Spa gonflable', description: 'Test', price: 900, stockQuantity: 3, ...fields
  });

  describe('assigning products', () => {
    it('accepts a category created in the admin', async () => {
      const spas = await newCategory({ name: 'Spas' });

      const res = await newProduct({ category: spas.slug }).expect(201);
      assert.equal(res.body.category, 'spas');
    });

    it('refuses a category that does not exist', async () => {
      const res = await newProduct({ category: 'spas' }).expect(400);
      assert.match(JSON.stringify(res.body), /Admin → Categories/);
    });

    it('also checks the category when a product is edited', async () => {
      await newCategory({ name: 'Spas' });
      const product = (await newProduct({ category: 'spas' }).expect(201)).body;

      await as('put', `/api/products/${product._id}`).send({ category: 'nope' }).expect(400);
      await newCategory({ name: 'Saunas' });
      const moved = await as('put', `/api/products/${product._id}`).send({ category: 'saunas' }).expect(200);
      assert.equal(moved.body.category, 'saunas');
    });
  });

  describe('in the shop', () => {
    it('lists the active categories in admin order', async () => {
      await newCategory({ name: 'Spas', sortOrder: 2 });
      await newCategory({ name: 'Filtration', nameEn: 'Filters', sortOrder: 1 });
      const hidden = await newCategory({ name: 'Archives', sortOrder: 0 });
      await as('put', `/api/admin/categories/${hidden._id}/toggle-status`).expect(200);

      const res = await request(app).get('/api/products/categories').expect(200);

      assert.deepEqual(Object.keys(res.body.categories), ['filtration', 'spas']);
      assert.equal(res.body.categories.spas.name, 'Spas');
      assert.equal(res.body.categories.spas.icon, '🛁');
      assert.ok(res.body.filters.priceRanges.length > 0);
    });

    it('keeps the filter subcategories of the original categories', async () => {
      await createCategory(); // slug "filters", as in the original list
      const res = await request(app).get('/api/products/categories').expect(200);
      assert.equal(res.body.categories.filters.subcategories['sand-filters'], 'Filtres à sable');
    });

    it('filters products by category and names their category', async () => {
      const spas = await newCategory({ name: 'Spas & Jacuzzis' });
      await createCategory();
      await createProduct({ name: 'Spa 4 places', category: spas.slug });
      await createProduct({ name: 'Filtre à sable', category: 'filters' });

      const res = await request(app).get(`/api/products?category=${spas.slug}`).expect(200);

      assert.deepEqual(res.body.products.map(p => p.name), ['Spa 4 places']);
      assert.equal(res.body.products[0].categoryName, 'Spas & Jacuzzis');

      const one = await request(app).get(`/api/products/${res.body.products[0]._id}`).expect(200);
      assert.equal(one.body.categoryName, 'Spas & Jacuzzis');
    });

    it('includes products in the categories under the chosen one', async () => {
      const parent = await newCategory({ name: 'Bien-être' });
      const child = await newCategory({ name: 'Saunas', parentCategory: parent._id });
      await createProduct({ name: 'Sauna 2 places', category: child.slug });

      const res = await request(app).get(`/api/products?category=${parent.slug}`).expect(200);
      assert.deepEqual(res.body.products.map(p => p.name), ['Sauna 2 places']);
    });

    it('suggests categories by name', async () => {
      await newCategory({ name: 'Spas', nameEn: 'Hot tubs' });
      const res = await request(app).get('/api/products/search/suggestions?q=hot').expect(200);
      assert.ok(res.body.suggestions.some(s => s.type === 'category' && s.value === 'spas'));
    });
  });

  describe('in the admin', () => {
    it('shows how many products each category has', async () => {
      const spas = await newCategory({ name: 'Spas' });
      await createProduct({ category: spas.slug });
      await createProduct({ category: spas.slug });

      const res = await as('get', '/api/admin/categories').expect(200);
      assert.equal(res.body.categories.find(c => c.slug === 'spas').productCount, 2);
    });

    it('does not delete a category that still has products', async () => {
      const spas = await newCategory({ name: 'Spas' });
      await createProduct({ category: spas.slug });

      const res = await as('delete', `/api/admin/categories/${spas._id}`).expect(400);
      assert.match(res.body.message, /1 products/);
    });
  });

  describe('upgrading from the fixed category list', () => {
    const { ensureProductCategoriesExist, createDefaultCategories } = require('../services/categoryService');
    const Category = require('../models/Category');

    it('creates the categories existing products use, with their names', async () => {
      await createProduct({ category: 'pumps-motors' });
      await createProduct({ category: 'filters' });

      const created = await ensureProductCategoriesExist();

      assert.deepEqual(created.sort(), ['filters', 'pumps-motors']);
      const pumps = await Category.findOne({ slug: 'pumps-motors' }).lean();
      assert.equal(pumps.name, 'Pompes et Moteurs');
      assert.equal(pumps.nameEn, 'Pumps & Motors');
      // Running again changes nothing
      assert.deepEqual(await ensureProductCategoriesExist(), []);
    });

    it('does not bring back unused categories an admin deleted', async () => {
      await createDefaultCategories();
      await Category.deleteOne({ slug: 'lighting' });

      await ensureProductCategoriesExist();
      assert.equal(await Category.exists({ slug: 'lighting' }), null);
    });

    it('seeds the original categories once', async () => {
      assert.equal((await createDefaultCategories()).length, 9);
      assert.equal((await createDefaultCategories()).length, 0);
      const pools = await Category.findOne({ slug: 'pools' }).lean();
      assert.equal(pools.name, 'Piscines');
    });
  });
});
