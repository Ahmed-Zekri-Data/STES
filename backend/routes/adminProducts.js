const express = require('express');
const router = express.Router();
const { query, body, validationResult } = require('express-validator');
const { importProducts, MAX_ROWS } = require('../services/productImportService');
const Product = require('../models/Product');
const { auth, checkPermission } = require('../middleware/auth');
const { containing } = require('../utils/text');
const { getSettings } = require('../services/settingsService');
const { categoryNames } = require('../services/categoryService');

// "Low" uses the threshold set in Admin → Settings
const stockFilters = (lowStockThreshold) => ({
  all: {},
  in: { stockQuantity: { $gt: 0 } },
  low: { stockQuantity: { $gt: 0, $lte: lowStockThreshold } },
  out: { stockQuantity: { $lte: 0 } }
});

const SORTS = {
  newest: { createdAt: -1 },
  name: { name: 1 },
  price_asc: { price: 1 },
  price_desc: { price: -1 },
  stock: { stockQuantity: 1, name: 1 }
};

// GET /api/admin/products - Every product, for the admin: unlike the shop's
// list, it includes out-of-stock products and pages through all of them
router.get('/', auth, checkPermission('products'), [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('search').optional({ values: 'falsy' }).isString().isLength({ max: 100 }),
  query('category').optional({ values: 'falsy' }).isString().isLength({ max: 100 }),
  query('stock').optional().isIn(Object.keys(stockFilters(0))),
  query('sort').optional().isIn(Object.keys(SORTS))
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const page = parseInt(req.query.page || 1);
    const limit = parseInt(req.query.limit || 24);
    const { search, category, stock = 'all', sort = 'newest' } = req.query;

    // Search and category apply to the stock counts too
    const base = {};
    if (search) {
      const text = containing(search);
      base.$or = [{ name: text }, { description: text }, { brand: text }, { sku: text }, { 'variants.sku': text }];
    }
    if (category) {
      base.category = String(category).toLowerCase();
    }
    const { lowStockThreshold } = await getSettings();
    const filters = stockFilters(lowStockThreshold);
    const filter = { ...base, ...filters[stock] };

    const [products, total, all, low, out, names] = await Promise.all([
      Product.find(filter).sort(SORTS[sort]).skip((page - 1) * limit).limit(limit).lean(),
      Product.countDocuments(filter),
      Product.countDocuments(base),
      Product.countDocuments({ ...base, ...filters.low }),
      Product.countDocuments({ ...base, ...filters.out }),
      categoryNames()
    ]);

    res.json({
      products: products.map(product => ({
        ...product,
        categoryName: names.get(product.category) || product.category
      })),
      pagination: {
        currentPage: page,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        totalProducts: total
      },
      stockCounts: { all, low, out },
      lowStockThreshold
    });
  } catch (error) {
    console.error('Error fetching admin products:', error);
    res.status(500).json({ message: 'Error fetching products' });
  }
});

// POST /api/admin/products/import - Products from a spreadsheet (read in the
// browser into rows). With dryRun, reports what would change without saving.
router.post('/import', auth, checkPermission('products'), [
  body('rows').isArray({ min: 1, max: MAX_ROWS }).withMessage(`The file must have between 1 and ${MAX_ROWS} rows`),
  body('dryRun').optional().isBoolean().toBoolean(),
  body('texts').optional().isBoolean().toBoolean(),
  body('brand').optional({ values: 'falsy' }).isString().trim().isLength({ max: 60 }).withMessage('The brand is up to 60 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });
    }
    const { rows, dryRun = true, brand, texts = false } = req.body;
    res.json(await importProducts(rows, { dryRun, brand, texts }));
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    console.error('Error importing products:', error);
    res.status(500).json({ message: 'Error importing products' });
  }
});

module.exports = router;
