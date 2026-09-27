const express = require('express');
const router = express.Router();
const { body, validationResult, query } = require('express-validator');
const Product = require('../models/Product');
const { auth, checkPermission } = require('../middleware/auth');
const { searchFilters } = require('../config/productCategories');
const { categoryExists, slugsWithin, categoryNames, shopCategories } = require('../services/categoryService');
const { findBrand, shopBrands } = require('../services/brandService');
const { containing, exactly, isImageLocation } = require('../utils/text');

// Products must belong to a category that exists in the admin
const existingCategory = async (value) => {
  if (!(await categoryExists(value))) {
    throw new Error('Unknown category');
  }
  return true;
};

// A product's brand must exist in Admin → Brands (or be left empty). It is
// saved as spelled there.
const brandRule = () => body('brand')
  .optional({ values: 'falsy' })
  .isString()
  .custom(async (value) => {
    if (!(await findBrand(value))) {
      throw new Error('Unknown brand');
    }
    return true;
  })
  .withMessage('Choose a brand that exists in Admin → Brands')
  .customSanitizer(async (value) => (await findBrand(value))?.name || value);

// Adds the category's name next to its slug, for display
const withCategoryNames = async (products) => {
  const names = await categoryNames();
  return products.map(product => ({ ...product, categoryName: names.get(product.category) || product.category }));
};

// GET /api/products - Get all products with filtering and pagination
router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('category').optional({ values: 'falsy' }).isString().isLength({ max: 100 }),
  query('subcategory').optional().custom(value => {
    if (value === '' || value === null || value === undefined) return true;
    return value.length >= 1 && value.length <= 50;
  }),
  query('minPrice').optional().isFloat({ min: 0 }),
  query('maxPrice').optional().isFloat({ min: 0 }),
  query('search').optional().custom(value => {
    if (value === '' || value === null || value === undefined) return true;
    return value.length >= 1 && value.length <= 100;
  }),
  query('featured').optional().isBoolean(),
  query('brand').optional().custom(value => {
    if (value === '' || value === null || value === undefined) return true;
    return value.length >= 1 && value.length <= 50;
  }),
  query('minRating').optional().isFloat({ min: 0, max: 5 }),
  query('inStock').optional().isBoolean(),
  query('sortBy').optional().isIn(['price', 'rating', 'name', 'createdAt', 'popularity']),
  query('sortOrder').optional().isIn(['asc', 'desc'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      page = 1,
      limit = 12,
      category,
      subcategory,
      minPrice,
      maxPrice,
      search,
      featured,
      brand,
      minRating,
      inStock,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = {};

    // Stock filter
    if (inStock !== undefined) {
      filter.inStock = inStock === 'true';
    } else {
      filter.inStock = true; // Default to in-stock products
    }

    // A category includes the categories under it
    if (category) filter.category = { $in: await slugsWithin(category) };
    if (subcategory) filter.subcategory = subcategory;
    if (featured !== undefined) filter.featured = featured === 'true';
    // The brand chosen in the shop's filter, not every brand containing it
    if (brand) filter.brand = exactly(brand);

    // Price range filter
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }

    // Rating filter
    if (minRating) {
      filter['ratingStats.averageRating'] = { $gte: parseFloat(minRating) };
    }

    // Search filter
    if (search) {
      filter.$or = [
        { name: containing(search) },
        { description: containing(search) },
        { brand: containing(search) },
        { tags: { $in: [containing(search)] } }
      ];
    }

    // Build sort object
    const sort = {};

    switch (sortBy) {
      case 'price':
        sort.price = sortOrder === 'asc' ? 1 : -1;
        break;
      case 'rating':
        sort['ratingStats.averageRating'] = sortOrder === 'asc' ? 1 : -1;
        sort['ratingStats.totalReviews'] = -1; // Secondary sort by review count
        break;
      case 'name':
        sort.name = sortOrder === 'asc' ? 1 : -1;
        break;
      case 'popularity':
        sort['ratingStats.totalReviews'] = -1;
        sort['ratingStats.averageRating'] = -1;
        break;
      default:
        sort.createdAt = sortOrder === 'asc' ? 1 : -1;
    }

    // Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .select('-reviews')
        .lean(),
      Product.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(total / parseInt(limit));

    res.json({
      products: await withCategoryNames(products),
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalProducts: total,
        hasNext: parseInt(page) < totalPages,
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ message: 'Error fetching products' });
  }
});

// GET /api/products/featured - Get featured products
router.get('/featured', async (req, res) => {
  try {
    const products = await Product.getFeatured().select('-reviews');
    res.json(products);
  } catch (error) {
    console.error('Error fetching featured products:', error);
    res.status(500).json({ message: 'Error fetching featured products' });
  }
});

// GET /api/products/categories - The shop's categories, as managed in the
// admin, and the other search filters
router.get('/categories', async (req, res) => {
  try {
    const [categories, brands] = await Promise.all([shopCategories(), shopBrands()]);
    res.json({
      categories,
      // Brands managed in the admin that products use
      filters: { ...searchFilters, brands }
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ message: 'Error fetching categories' });
  }
});

// GET /api/products/search/suggestions - Get search suggestions
router.get('/search/suggestions', [
  query('q').isLength({ min: 1, max: 50 }).withMessage('Query is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { q } = req.query;

    // Get product name suggestions
    const products = await Product.find({
      $or: [
        { name: containing(q) },
        { brand: containing(q) },
        { tags: { $in: [containing(q)] } }
      ],
      inStock: true
    })
    .select('name brand category')
    .limit(10);

    // Get category suggestions
    const categoryMatches = Object.entries(await shopCategories())
      .filter(([, category]) =>
        category.name.toLowerCase().includes(q.toLowerCase()) ||
        (category.nameEn || '').toLowerCase().includes(q.toLowerCase())
      )
      .map(([key, category]) => ({
        type: 'category',
        value: key,
        label: category.name,
        icon: category.icon
      }));

    // Get brand suggestions
    const brands = await Product.distinct('brand', {
      brand: containing(q),
      inStock: true
    });

    const suggestions = [
      ...products.map(p => ({
        type: 'product',
        value: p.name,
        label: p.name,
        category: p.category,
        brand: p.brand
      })),
      ...categoryMatches,
      ...brands.slice(0, 5).map(brand => ({
        type: 'brand',
        value: brand,
        label: brand
      }))
    ];

    res.json({ suggestions: suggestions.slice(0, 10) });
  } catch (error) {
    console.error('Error getting search suggestions:', error);
    res.status(500).json({ message: 'Error getting search suggestions' });
  }
});

// GET /api/products/:id - Get single product
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).select('-reviews').lean();

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const [named] = await withCategoryNames([product]);
    res.json(named);
  } catch (error) {
    console.error('Error fetching product:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid product ID' });
    }
    res.status(500).json({ message: 'Error fetching product' });
  }
});

// POST /api/products - Create new product (Admin only)
router.post('/', auth, checkPermission('products'), [
  body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Name is required and must be less than 100 characters'),
  body('description').trim().isLength({ min: 1, max: 1000 }).withMessage('Description is required and must be less than 1000 characters'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('category').isString().custom(existingCategory).withMessage('Choose a category that exists in Admin → Categories'),
  brandRule(),
  body('stockQuantity').optional().isInt({ min: 0 }).withMessage('Stock quantity must be a non-negative integer'),
  body('image').optional().custom(isImageLocation).withMessage('Image must be an http(s) URL or an uploaded image'),
  body('featured').optional().isBoolean().withMessage('Featured must be a boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const product = new Product(req.body);
    await product.save();
    
    res.status(201).json(product);
  } catch (error) {
    console.error('Error creating product:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Error creating product' });
  }
});

// PUT /api/products/:id - Update product (Admin only)
router.put('/:id', auth, checkPermission('products'), [
  body('name').optional().trim().isLength({ min: 1, max: 100 }),
  body('description').optional().trim().isLength({ min: 1, max: 1000 }),
  body('price').optional().isFloat({ min: 0 }),
  body('category').optional().isString().custom(existingCategory).withMessage('Choose a category that exists in Admin → Categories'),
  brandRule(),
  body('stockQuantity').optional().isInt({ min: 0 }),
  body('image').optional().custom(isImageLocation).withMessage('Image must be an http(s) URL or an uploaded image'),
  body('featured').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    console.error('Error updating product:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid product ID' });
    }
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Error updating product' });
  }
});

// DELETE /api/products/:id - Delete product (Admin only)
router.delete('/:id', auth, checkPermission('products'), async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid product ID' });
    }
    res.status(500).json({ message: 'Error deleting product' });
  }
});

module.exports = router;
