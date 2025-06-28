const express = require('express');
const router = express.Router();
const { body, validationResult, query } = require('express-validator');
const Brand = require('../models/Brand');
const { auth, checkPermission } = require('../middleware/auth');

// GET /api/admin/brands - Get all brands
router.get('/', auth, checkPermission('products'), [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('search').optional().isLength({ min: 1, max: 100 }),
  query('isActive').optional().isBoolean(),
  query('isFeatured').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      page = 1,
      limit = 20,
      search,
      isActive,
      isFeatured,
      sortBy = 'sortOrder',
      sortOrder = 'asc'
    } = req.query;

    const skip = (page - 1) * limit;
    const filter = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { country: { $regex: search, $options: 'i' } }
      ];
    }

    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    if (isFeatured !== undefined) {
      filter.isFeatured = isFeatured === 'true';
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const [brands, total] = await Promise.all([
      Brand.find(filter)
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit)),
      Brand.countDocuments(filter)
    ]);

    res.json({
      brands,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching brands:', error);
    res.status(500).json({ message: 'Error fetching brands' });
  }
});

// GET /api/admin/brands/:id - Get single brand
router.get('/:id', auth, checkPermission('products'), async (req, res) => {
  try {
    const brand = await Brand.findById(req.params.id);

    if (!brand) {
      return res.status(404).json({ message: 'Brand not found' });
    }

    res.json(brand);
  } catch (error) {
    console.error('Error fetching brand:', error);
    res.status(500).json({ message: 'Error fetching brand' });
  }
});

// POST /api/admin/brands - Create new brand
router.post('/', auth, checkPermission('products'), [
  body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Name is required and must be less than 100 characters'),
  body('description').optional().trim().isLength({ max: 1000 }).withMessage('Description must be less than 1000 characters'),
  body('logo').optional().isURL().withMessage('Logo must be a valid URL'),
  body('website').optional().isURL().withMessage('Website must be a valid URL'),
  body('country').optional().trim().isLength({ max: 50 }).withMessage('Country must be less than 50 characters'),
  body('sortOrder').optional().isInt({ min: 0 }).withMessage('Sort order must be a non-negative integer'),
  body('contactInfo.email').optional().isEmail().withMessage('Contact email must be valid'),
  body('contactInfo.phone').optional().trim().isLength({ max: 20 }).withMessage('Phone must be less than 20 characters'),
  body('contactInfo.address').optional().trim().isLength({ max: 200 }).withMessage('Address must be less than 200 characters'),
  body('seoTitle').optional().trim().isLength({ max: 60 }).withMessage('SEO title must be less than 60 characters'),
  body('seoDescription').optional().trim().isLength({ max: 160 }).withMessage('SEO description must be less than 160 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const brand = new Brand(req.body);
    await brand.save();

    res.status(201).json(brand);
  } catch (error) {
    console.error('Error creating brand:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Brand name already exists' });
    }
    res.status(500).json({ message: 'Error creating brand' });
  }
});

// PUT /api/admin/brands/:id - Update brand
router.put('/:id', auth, checkPermission('products'), [
  body('name').optional().trim().isLength({ min: 1, max: 100 }),
  body('description').optional().trim().isLength({ max: 1000 }),
  body('logo').optional().isURL(),
  body('website').optional().isURL(),
  body('country').optional().trim().isLength({ max: 50 }),
  body('sortOrder').optional().isInt({ min: 0 }),
  body('isActive').optional().isBoolean(),
  body('isFeatured').optional().isBoolean(),
  body('contactInfo.email').optional().isEmail(),
  body('contactInfo.phone').optional().trim().isLength({ max: 20 }),
  body('contactInfo.address').optional().trim().isLength({ max: 200 }),
  body('seoTitle').optional().trim().isLength({ max: 60 }),
  body('seoDescription').optional().trim().isLength({ max: 160 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const brand = await Brand.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!brand) {
      return res.status(404).json({ message: 'Brand not found' });
    }

    res.json(brand);
  } catch (error) {
    console.error('Error updating brand:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Brand name already exists' });
    }
    res.status(500).json({ message: 'Error updating brand' });
  }
});

// DELETE /api/admin/brands/:id - Delete brand
router.delete('/:id', auth, checkPermission('products'), async (req, res) => {
  try {
    const brand = await Brand.findById(req.params.id);
    if (!brand) {
      return res.status(404).json({ message: 'Brand not found' });
    }

    // Check if brand has products
    const Product = require('../models/Product');
    const productCount = await Product.countDocuments({ brand: brand.name });
    if (productCount > 0) {
      return res.status(400).json({ 
        message: `Cannot delete brand. It has ${productCount} products associated with it.` 
      });
    }

    await Brand.findByIdAndDelete(req.params.id);
    res.json({ message: 'Brand deleted successfully' });
  } catch (error) {
    console.error('Error deleting brand:', error);
    res.status(500).json({ message: 'Error deleting brand' });
  }
});

// PUT /api/admin/brands/:id/toggle-status - Toggle brand status
router.put('/:id/toggle-status', auth, checkPermission('products'), async (req, res) => {
  try {
    const brand = await Brand.findById(req.params.id);
    if (!brand) {
      return res.status(404).json({ message: 'Brand not found' });
    }

    brand.isActive = !brand.isActive;
    await brand.save();

    res.json({ message: 'Brand status updated successfully', brand });
  } catch (error) {
    console.error('Error toggling brand status:', error);
    res.status(500).json({ message: 'Error updating brand status' });
  }
});

// PUT /api/admin/brands/:id/toggle-featured - Toggle brand featured status
router.put('/:id/toggle-featured', auth, checkPermission('products'), async (req, res) => {
  try {
    const brand = await Brand.findById(req.params.id);
    if (!brand) {
      return res.status(404).json({ message: 'Brand not found' });
    }

    brand.isFeatured = !brand.isFeatured;
    await brand.save();

    res.json({ message: 'Brand featured status updated successfully', brand });
  } catch (error) {
    console.error('Error toggling brand featured status:', error);
    res.status(500).json({ message: 'Error updating brand featured status' });
  }
});

// PUT /api/admin/brands/bulk-update-product-counts - Update product counts for all brands
router.put('/bulk-update-product-counts', auth, checkPermission('products'), async (req, res) => {
  try {
    const brands = await Brand.find();
    
    for (const brand of brands) {
      await brand.updateProductCount();
    }

    res.json({ message: 'Product counts updated successfully for all brands' });
  } catch (error) {
    console.error('Error updating product counts:', error);
    res.status(500).json({ message: 'Error updating product counts' });
  }
});

module.exports = router;
