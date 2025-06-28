const express = require('express');
const router = express.Router();
const { body, validationResult, query } = require('express-validator');
const Product = require('../models/Product');
const { auth } = require('../middleware/auth');
const { customerAuth } = require('../middleware/customerAuth');
const { productCategories, searchFilters } = require('../config/productCategories');

// GET /api/products - Get all products with filtering and pagination
router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('category').optional().isIn(Object.keys(productCategories)),
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

    if (category) filter.category = category;
    if (subcategory) filter.subcategory = subcategory;
    if (featured !== undefined) filter.featured = featured === 'true';
    if (brand) filter.brand = new RegExp(brand, 'i');

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
        { $text: { $search: search } },
        { name: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') },
        { brand: new RegExp(search, 'i') },
        { tags: { $in: [new RegExp(search, 'i')] } }
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
        .lean(),
      Product.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(total / parseInt(limit));

    res.json({
      products,
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
    const products = await Product.getFeatured();
    res.json(products);
  } catch (error) {
    console.error('Error fetching featured products:', error);
    res.status(500).json({ message: 'Error fetching featured products' });
  }
});

// GET /api/products/categories - Get product categories
router.get('/categories', (req, res) => {
  res.json({
    categories: productCategories,
    filters: searchFilters
  });
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
        { name: new RegExp(q, 'i') },
        { brand: new RegExp(q, 'i') },
        { tags: { $in: [new RegExp(q, 'i')] } }
      ],
      inStock: true
    })
    .select('name brand category')
    .limit(10);

    // Get category suggestions
    const categoryMatches = Object.entries(productCategories)
      .filter(([key, category]) =>
        category.name.toLowerCase().includes(q.toLowerCase()) ||
        category.nameEn.toLowerCase().includes(q.toLowerCase())
      )
      .map(([key, category]) => ({
        type: 'category',
        value: key,
        label: category.name,
        icon: category.icon
      }));

    // Get brand suggestions
    const brands = await Product.distinct('brand', {
      brand: new RegExp(q, 'i'),
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
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid product ID' });
    }
    res.status(500).json({ message: 'Error fetching product' });
  }
});

// POST /api/products - Create new product (Admin only)
router.post('/', auth, [
  body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Name is required and must be less than 100 characters'),
  body('description').trim().isLength({ min: 1, max: 1000 }).withMessage('Description is required and must be less than 1000 characters'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('category').isIn(Object.keys(productCategories)).withMessage('Invalid category'),
  body('stockQuantity').optional().isInt({ min: 0 }).withMessage('Stock quantity must be a non-negative integer'),
  body('image').optional().isURL().withMessage('Image must be a valid URL'),
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
router.put('/:id', auth, [
  body('name').optional().trim().isLength({ min: 1, max: 100 }),
  body('description').optional().trim().isLength({ min: 1, max: 1000 }),
  body('price').optional().isFloat({ min: 0 }),
  body('category').optional().isIn(Object.keys(productCategories)),
  body('stockQuantity').optional().isInt({ min: 0 }),
  body('image').optional().isURL(),
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
router.delete('/:id', auth, async (req, res) => {
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

// POST /api/products/:id/reviews - Add a review to a product
router.post('/:id/reviews', customerAuth, [
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('title').trim().isLength({ min: 1, max: 100 }).withMessage('Title is required and must be less than 100 characters'),
  body('comment').trim().isLength({ min: 1, max: 1000 }).withMessage('Comment is required and must be less than 1000 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { rating, title, comment } = req.body;
    const productId = req.params.id;
    const customerId = req.customer.customerId;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    try {
      await product.addReview(customerId, rating, title, comment);

      // Get updated product with reviews
      const updatedProduct = await Product.findById(productId)
        .populate('reviews.customer', 'firstName lastName avatar');

      res.status(201).json({
        message: 'Review added successfully',
        review: updatedProduct.reviews[updatedProduct.reviews.length - 1],
        ratingStats: updatedProduct.ratingStats
      });
    } catch (reviewError) {
      if (reviewError.message === 'You have already reviewed this product') {
        return res.status(400).json({ message: reviewError.message });
      }
      throw reviewError;
    }
  } catch (error) {
    console.error('Error adding review:', error);
    res.status(500).json({ message: 'Error adding review' });
  }
});

// GET /api/products/:id/reviews - Get reviews for a product
router.get('/:id/reviews', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  query('sortBy').optional().isIn(['rating', 'createdAt', 'helpful']),
  query('sortOrder').optional().isIn(['asc', 'desc'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const product = await Product.findById(req.params.id)
      .populate('reviews.customer', 'firstName lastName avatar');

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Sort reviews
    let reviews = [...product.reviews];
    reviews.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'rating':
          comparison = a.rating - b.rating;
          break;
        case 'helpful':
          const aHelpful = a.helpful.filter(h => h.isHelpful).length;
          const bHelpful = b.helpful.filter(h => h.isHelpful).length;
          comparison = aHelpful - bHelpful;
          break;
        default:
          comparison = new Date(a.createdAt) - new Date(b.createdAt);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    // Paginate reviews
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const paginatedReviews = reviews.slice(skip, skip + parseInt(limit));

    res.json({
      reviews: paginatedReviews,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(reviews.length / parseInt(limit)),
        totalReviews: reviews.length,
        hasNext: skip + parseInt(limit) < reviews.length,
        hasPrev: parseInt(page) > 1
      },
      ratingStats: product.ratingStats
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ message: 'Error fetching reviews' });
  }
});

module.exports = router;
