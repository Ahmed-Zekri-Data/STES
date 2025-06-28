const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Page = require('../models/Page');
const { auth } = require('../middleware/auth');

// GET /api/pages - Get all pages (public)
router.get('/', async (req, res) => {
  try {
    const pages = await Page.find({ isActive: true }).select('-__v');
    res.json(pages);
  } catch (error) {
    console.error('Error fetching pages:', error);
    res.status(500).json({ message: 'Error fetching pages' });
  }
});

// GET /api/pages/:slug - Get page by slug (public)
router.get('/:slug', async (req, res) => {
  try {
    const page = await Page.getBySlug(req.params.slug);
    
    if (!page) {
      return res.status(404).json({ message: 'Page not found' });
    }
    
    res.json(page);
  } catch (error) {
    console.error('Error fetching page:', error);
    res.status(500).json({ message: 'Error fetching page' });
  }
});

// GET /api/pages/admin/all - Get all pages for admin (Admin only)
router.get('/admin/all', auth, async (req, res) => {
  try {
    const pages = await Page.find({})
      .populate('lastModifiedBy', 'username email')
      .sort({ slug: 1 });
    
    res.json({ pages });
  } catch (error) {
    console.error('Error fetching admin pages:', error);
    res.status(500).json({ message: 'Error fetching pages' });
  }
});

// PUT /api/pages/:slug - Update page (Admin only)
router.put('/:slug', auth, [
  body('title').trim().isLength({ min: 1, max: 200 }).withMessage('Title is required and must be less than 200 characters'),
  body('titleEn').optional().trim().isLength({ max: 200 }).withMessage('English title must be less than 200 characters'),
  body('titleAr').optional().trim().isLength({ max: 200 }).withMessage('Arabic title must be less than 200 characters'),
  body('content').trim().isLength({ min: 1 }).withMessage('Content is required'),
  body('contentEn').optional().trim(),
  body('contentAr').optional().trim(),
  body('metaDescription').optional().trim().isLength({ max: 160 }).withMessage('Meta description must be less than 160 characters'),
  body('metaDescriptionEn').optional().trim().isLength({ max: 160 }).withMessage('English meta description must be less than 160 characters'),
  body('metaDescriptionAr').optional().trim().isLength({ max: 160 }).withMessage('Arabic meta description must be less than 160 characters'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { slug } = req.params;
    const updateData = {
      ...req.body,
      lastModifiedBy: req.admin.adminId
    };

    const page = await Page.findOneAndUpdate(
      { slug },
      updateData,
      { new: true, runValidators: true }
    ).populate('lastModifiedBy', 'username email');

    if (!page) {
      return res.status(404).json({ message: 'Page not found' });
    }

    res.json(page);
  } catch (error) {
    console.error('Error updating page:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Error updating page' });
  }
});

// POST /api/pages/initialize - Initialize default pages (Admin only)
router.post('/initialize', auth, async (req, res) => {
  try {
    await Page.initializeDefaultPages();
    res.json({ message: 'Default pages initialized successfully' });
  } catch (error) {
    console.error('Error initializing pages:', error);
    res.status(500).json({ message: 'Error initializing pages' });
  }
});

module.exports = router;
