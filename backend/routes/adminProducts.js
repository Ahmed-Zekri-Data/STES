const express = require('express');
const path = require('path');
const multer = require('multer');
const router = express.Router();
const { query, body, validationResult } = require('express-validator');
const { importProducts, MAX_ROWS } = require('../services/productImportService');
const { saveProductImage, hasPhoto } = require('../services/productImageService');
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

// POST /api/admin/products/photos - Photos named after a product code
// ("65557.jpg"): each goes on the product that has this code (itself or
// one of its versions). Products that already have a photo keep it unless
// `replace` is set. Up to PHOTOS_PER_REQUEST files at a time.
const PHOTOS_PER_REQUEST = 25;
const receivePhotos = (req, res, next) => {
  multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: PHOTOS_PER_REQUEST } })
    .array('photos', PHOTOS_PER_REQUEST)(req, res, (error) => {
      if (error instanceof multer.MulterError) {
        const message = error.code === 'LIMIT_FILE_SIZE'
          ? 'Each photo must be 5 MB or smaller'
          : `Send up to ${PHOTOS_PER_REQUEST} photos at a time, in the “photos” field`;
        return res.status(400).json({ message });
      }
      next(error);
    });
};

// "65557.jpg", "65557 (1).png", "74839CL090.webp" → the code
const codeOfFile = (name) => path.basename(String(name || ''))
  .replace(/\.[a-z0-9]+$/i, '')
  .replace(/\s*\(\d+\)$/, '')
  .trim();

router.post('/photos', auth, checkPermission('products'), receivePhotos, async (req, res) => {
  try {
    const files = req.files || [];
    if (!files.length) {
      return res.status(400).json({ message: 'No photos received' });
    }
    const replace = req.body.replace === 'true';
    const results = [];
    for (const file of files) {
      const code = codeOfFile(file.originalname);
      const product = code && await Product.findOne({ $or: [{ sku: code }, { 'variants.sku': code }] }).select('name image').lean();
      if (!product) {
        results.push({ file: file.originalname, code, status: 'unknown' });
        continue;
      }
      if (hasPhoto(product.image) && !replace) {
        results.push({ file: file.originalname, code, status: 'kept', product: product.name });
        continue;
      }
      const url = await saveProductImage(file.buffer);
      if (!url) {
        results.push({ file: file.originalname, code, status: 'invalid', product: product.name });
        continue;
      }
      await Product.updateOne({ _id: product._id }, { $set: { image: url } });
      results.push({ file: file.originalname, code, status: 'set', product: product.name });
    }
    res.json({ results });
  } catch (error) {
    console.error('Error importing product photos:', error);
    res.status(500).json({ message: 'Error importing photos' });
  }
});

module.exports = router;
