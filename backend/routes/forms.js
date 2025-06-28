const express = require('express');
const router = express.Router();
const { body, validationResult, query } = require('express-validator');
const FormSubmission = require('../models/FormSubmission');
const { auth } = require('../middleware/auth');

// POST /api/forms/contact - Submit contact form
router.post('/contact', [
  body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Name is required and must be less than 100 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('phone').optional().trim().isLength({ max: 20 }).withMessage('Phone number cannot exceed 20 characters'),
  body('message').trim().isLength({ min: 1, max: 1000 }).withMessage('Message is required and must be less than 1000 characters'),
  body('subject').optional().trim().isLength({ max: 200 }).withMessage('Subject cannot exceed 200 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, phone, message, subject } = req.body;

    const submission = new FormSubmission({
      type: 'contact',
      name,
      email,
      phone,
      message,
      subject,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      language: req.get('Accept-Language')?.split(',')[0]?.split('-')[0] || 'fr'
    });

    await submission.save();

    res.status(201).json({
      message: 'Message envoyé avec succès. Nous vous répondrons dans les plus brefs délais.',
      submissionId: submission._id
    });
  } catch (error) {
    console.error('Error submitting contact form:', error);
    res.status(500).json({ message: 'Erreur lors de l\'envoi du message' });
  }
});

// POST /api/forms/quote - Submit quote request form
router.post('/quote', [
  body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('phone').trim().isLength({ min: 8, max: 20 }).withMessage('Valid phone number is required'),
  body('city').trim().isLength({ min: 1, max: 50 }).withMessage('City is required'),
  body('message').trim().isLength({ min: 1, max: 1000 }).withMessage('Message describing your needs is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, phone, city, message } = req.body;

    const submission = new FormSubmission({
      type: 'quote',
      name,
      email,
      phone,
      city,
      message,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      language: req.get('Accept-Language')?.split(',')[0]?.split('-')[0] || 'fr'
    });

    await submission.save();

    res.status(201).json({
      message: 'Demande de devis envoyée avec succès. Nous vous contacterons sous 24h.',
      submissionId: submission._id
    });
  } catch (error) {
    console.error('Error submitting quote form:', error);
    res.status(500).json({ message: 'Erreur lors de l\'envoi de la demande' });
  }
});

// POST /api/forms/newsletter - Subscribe to newsletter
router.post('/newsletter', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('name').optional().trim().isLength({ max: 100 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, name } = req.body;

    // Check if email already exists
    const existingSubscription = await FormSubmission.findOne({
      type: 'newsletter',
      email
    });

    if (existingSubscription) {
      return res.status(400).json({ message: 'Cette adresse email est déjà inscrite à notre newsletter' });
    }

    const submission = new FormSubmission({
      type: 'newsletter',
      name: name || 'Abonné',
      email,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      language: req.get('Accept-Language')?.split(',')[0]?.split('-')[0] || 'fr'
    });

    await submission.save();

    res.status(201).json({
      message: 'Inscription à la newsletter réussie !',
      submissionId: submission._id
    });
  } catch (error) {
    console.error('Error subscribing to newsletter:', error);
    res.status(500).json({ message: 'Erreur lors de l\'inscription' });
  }
});

// GET /api/forms - Get all form submissions (Admin only)
router.get('/', auth, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('type').optional().isIn(['contact', 'quote', 'newsletter']),
  query('status').optional().isIn(['new', 'read', 'replied', 'archived']),
  query('search').optional().isLength({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      page = 1,
      limit = 20,
      type,
      status,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter
    const filter = {};
    if (type) filter.type = type;
    if (status) filter.status = status;
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { message: { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [submissions, total] = await Promise.all([
      FormSubmission.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      FormSubmission.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(total / parseInt(limit));

    res.json({
      submissions,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalSubmissions: total,
        hasNext: parseInt(page) < totalPages,
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error('Error fetching form submissions:', error);
    res.status(500).json({ message: 'Error fetching form submissions' });
  }
});

// GET /api/forms/:id - Get single form submission (Admin only)
router.get('/:id', auth, async (req, res) => {
  try {
    const submission = await FormSubmission.findById(req.params.id);
    
    if (!submission) {
      return res.status(404).json({ message: 'Form submission not found' });
    }

    // Mark as read if it's new
    if (submission.status === 'new') {
      await submission.markAsRead();
    }

    res.json(submission);
  } catch (error) {
    console.error('Error fetching form submission:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid submission ID' });
    }
    res.status(500).json({ message: 'Error fetching form submission' });
  }
});

// PUT /api/forms/:id/status - Update form submission status (Admin only)
router.put('/:id/status', auth, [
  body('status').isIn(['new', 'read', 'replied', 'archived']).withMessage('Invalid status'),
  body('adminNotes').optional().isLength({ max: 500 }).withMessage('Admin notes cannot exceed 500 characters'),
  body('repliedBy').optional().trim().isLength({ max: 100 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { status, adminNotes, repliedBy } = req.body;
    
    const updateData = { status };
    if (adminNotes) updateData.adminNotes = adminNotes;
    
    if (status === 'replied') {
      updateData.repliedAt = new Date();
      if (repliedBy) updateData.repliedBy = repliedBy;
    }

    const submission = await FormSubmission.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!submission) {
      return res.status(404).json({ message: 'Form submission not found' });
    }

    res.json(submission);
  } catch (error) {
    console.error('Error updating form submission:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid submission ID' });
    }
    res.status(500).json({ message: 'Error updating form submission' });
  }
});

// GET /api/forms/stats/summary - Get form submission statistics (Admin only)
router.get('/stats/summary', auth, async (req, res) => {
  try {
    const stats = await FormSubmission.aggregate([
      {
        $group: {
          _id: {
            type: '$type',
            status: '$status'
          },
          count: { $sum: 1 }
        }
      }
    ]);

    const totalSubmissions = await FormSubmission.countDocuments();
    const unreadCount = await FormSubmission.countDocuments({ status: 'new' });

    res.json({
      totalSubmissions,
      unreadCount,
      breakdown: stats
    });
  } catch (error) {
    console.error('Error fetching form stats:', error);
    res.status(500).json({ message: 'Error fetching form statistics' });
  }
});

module.exports = router;
