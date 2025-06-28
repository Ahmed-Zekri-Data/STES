const express = require('express');
const router = express.Router();
const { body, validationResult, query } = require('express-validator');
const Category = require('../models/Category');
const { auth, checkPermission } = require('../middleware/auth');

// GET /api/admin/categories - Get all categories
router.get('/', auth, checkPermission('products'), [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('search').optional().isLength({ min: 1, max: 100 }),
  query('isActive').optional().isBoolean()
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
      sortBy = 'sortOrder',
      sortOrder = 'asc'
    } = req.query;

    const skip = (page - 1) * limit;
    const filter = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { nameEn: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const [categories, total] = await Promise.all([
      Category.find(filter)
        .populate('parentCategory', 'name')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit)),
      Category.countDocuments(filter)
    ]);

    res.json({
      categories,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ message: 'Error fetching categories' });
  }
});

// GET /api/admin/categories/tree - Get category tree
router.get('/tree', auth, checkPermission('products'), async (req, res) => {
  try {
    const tree = await Category.getCategoryTree();
    res.json(tree);
  } catch (error) {
    console.error('Error fetching category tree:', error);
    res.status(500).json({ message: 'Error fetching category tree' });
  }
});

// GET /api/admin/categories/:id - Get single category
router.get('/:id', auth, checkPermission('products'), async (req, res) => {
  try {
    const category = await Category.findById(req.params.id)
      .populate('parentCategory', 'name')
      .populate('subcategories', 'name');

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    res.json(category);
  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({ message: 'Error fetching category' });
  }
});

// POST /api/admin/categories - Create new category
router.post('/', auth, checkPermission('products'), [
  body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Name is required and must be less than 100 characters'),
  body('nameEn').trim().isLength({ min: 1, max: 100 }).withMessage('English name is required and must be less than 100 characters'),
  body('nameAr').optional().trim().isLength({ max: 100 }).withMessage('Arabic name must be less than 100 characters'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description must be less than 500 characters'),
  body('icon').optional().trim().isLength({ max: 10 }).withMessage('Icon must be less than 10 characters'),
  body('image').optional().isURL().withMessage('Image must be a valid URL'),
  body('parentCategory').optional().isMongoId().withMessage('Parent category must be a valid ID'),
  body('sortOrder').optional().isInt({ min: 0 }).withMessage('Sort order must be a non-negative integer'),
  body('seoTitle').optional().trim().isLength({ max: 60 }).withMessage('SEO title must be less than 60 characters'),
  body('seoDescription').optional().trim().isLength({ max: 160 }).withMessage('SEO description must be less than 160 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const category = new Category(req.body);
    await category.save();

    // If this is a subcategory, add it to parent's subcategories array
    if (category.parentCategory) {
      await Category.findByIdAndUpdate(
        category.parentCategory,
        { $addToSet: { subcategories: category._id } }
      );
    }

    await category.populate('parentCategory', 'name');
    res.status(201).json(category);
  } catch (error) {
    console.error('Error creating category:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Category name or slug already exists' });
    }
    res.status(500).json({ message: 'Error creating category' });
  }
});

// PUT /api/admin/categories/:id - Update category
router.put('/:id', auth, checkPermission('products'), [
  body('name').optional().trim().isLength({ min: 1, max: 100 }),
  body('nameEn').optional().trim().isLength({ min: 1, max: 100 }),
  body('nameAr').optional().trim().isLength({ max: 100 }),
  body('description').optional().trim().isLength({ max: 500 }),
  body('icon').optional().trim().isLength({ max: 10 }),
  body('image').optional().isURL(),
  body('parentCategory').optional().isMongoId(),
  body('sortOrder').optional().isInt({ min: 0 }),
  body('isActive').optional().isBoolean(),
  body('seoTitle').optional().trim().isLength({ max: 60 }),
  body('seoDescription').optional().trim().isLength({ max: 160 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const oldCategory = await Category.findById(req.params.id);
    if (!oldCategory) {
      return res.status(404).json({ message: 'Category not found' });
    }

    const category = await Category.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('parentCategory', 'name');

    // Handle parent category changes
    if (req.body.parentCategory !== undefined) {
      // Remove from old parent if it existed
      if (oldCategory.parentCategory && oldCategory.parentCategory.toString() !== req.body.parentCategory) {
        await Category.findByIdAndUpdate(
          oldCategory.parentCategory,
          { $pull: { subcategories: category._id } }
        );
      }

      // Add to new parent if it exists
      if (req.body.parentCategory) {
        await Category.findByIdAndUpdate(
          req.body.parentCategory,
          { $addToSet: { subcategories: category._id } }
        );
      }
    }

    res.json(category);
  } catch (error) {
    console.error('Error updating category:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Category name or slug already exists' });
    }
    res.status(500).json({ message: 'Error updating category' });
  }
});

// DELETE /api/admin/categories/:id - Delete category
router.delete('/:id', auth, checkPermission('products'), async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // Check if category has products
    const Product = require('../models/Product');
    const productCount = await Product.countDocuments({ category: category.slug });
    if (productCount > 0) {
      return res.status(400).json({ 
        message: `Cannot delete category. It has ${productCount} products associated with it.` 
      });
    }

    // Check if category has subcategories
    if (category.subcategories && category.subcategories.length > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete category. It has subcategories. Please delete or move subcategories first.' 
      });
    }

    // Remove from parent category if it exists
    if (category.parentCategory) {
      await Category.findByIdAndUpdate(
        category.parentCategory,
        { $pull: { subcategories: category._id } }
      );
    }

    await Category.findByIdAndDelete(req.params.id);
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ message: 'Error deleting category' });
  }
});

// PUT /api/admin/categories/:id/toggle-status - Toggle category status
router.put('/:id/toggle-status', auth, checkPermission('products'), async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    category.isActive = !category.isActive;
    await category.save();

    res.json({ message: 'Category status updated successfully', category });
  } catch (error) {
    console.error('Error toggling category status:', error);
    res.status(500).json({ message: 'Error updating category status' });
  }
});

module.exports = router;
