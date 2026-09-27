const express = require('express');
const router = express.Router({ mergeParams: true });
const { body, param, query, validationResult } = require('express-validator');
const Product = require('../models/Product');
const { customerAuth, optionalCustomerAuth } = require('../middleware/customerAuth');
const { refreshRatingStats, hasReceived, publicReview } = require('../services/reviewService');

// Mounted at /api/products/:id/reviews

const SORTS = {
  recent: (a, b) => b.createdAt - a.createdAt,
  rating_desc: (a, b) => b.rating - a.rating || b.createdAt - a.createdAt,
  rating_asc: (a, b) => a.rating - b.rating || b.createdAt - a.createdAt,
  helpful: (a, b) => b.helpfulCount - a.helpfulCount || b.createdAt - a.createdAt
};

const reviewRules = [
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5').toInt(),
  body('title').isString().trim().isLength({ min: 1, max: 100 }).withMessage('Title is required and must be less than 100 characters'),
  body('comment').isString().trim().isLength({ min: 1, max: 1000 }).withMessage('Comment is required and must be less than 1000 characters')
];

const productId = param('id').isMongoId().withMessage('Invalid product ID');

const invalid = (req, res) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return false;
  res.status(400).json({ errors: errors.array() });
  return true;
};

const failed = (res, action) => (error) => {
  console.error(`Error ${action} review:`, error);
  res.status(500).json({ message: `Error ${action} review` });
};

// The customer's own review of this product, as the shop shows it
const ownReview = async (id, customerId) => {
  const product = await Product.findOne({ _id: id, 'reviews.customer': customerId }, { 'reviews.$': 1 })
    .populate('reviews.customer', 'firstName lastName')
    .lean();
  return product ? publicReview(product.reviews[0], customerId) : null;
};

const ratingStatsOf = async (id) => (await Product.findById(id).select('ratingStats').lean())?.ratingStats;

// GET - Reviews of a product. Signed-in customers also get their own review.
router.get('/', optionalCustomerAuth, [
  productId,
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
  query('sort').optional().isIn(Object.keys(SORTS))
], async (req, res) => {
  try {
    if (invalid(req, res)) return;
    const { page = 1, limit = 10, sort = 'recent' } = req.query;
    const viewerId = req.customer?.customerId;

    const product = await Product.findById(req.params.id)
      .select('reviews ratingStats')
      .populate('reviews.customer', 'firstName lastName')
      .lean();
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const reviews = product.reviews.map(review => publicReview(review, viewerId)).sort(SORTS[sort]);
    const totalPages = Math.max(1, Math.ceil(reviews.length / limit));

    res.json({
      reviews: reviews.slice((page - 1) * limit, page * limit),
      pagination: {
        currentPage: page,
        totalPages,
        totalReviews: reviews.length,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      ratingStats: product.ratingStats,
      myReview: reviews.find(review => review.mine) || null
    });
  } catch (error) {
    failed(res, 'fetching')(error);
  }
});

// POST - Review a product, once per customer
router.post('/', customerAuth, [productId, ...reviewRules], async (req, res) => {
  try {
    if (invalid(req, res)) return;
    const { customerId } = req.customer;
    const { rating, title, comment } = req.body;

    if (!(await Product.exists({ _id: req.params.id }))) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const verified = await hasReceived(customerId, req.params.id);
    // Only added when the customer has no review yet, even if they post twice at once
    const { matchedCount } = await Product.updateOne(
      { _id: req.params.id, 'reviews.customer': { $ne: customerId } },
      { $push: { reviews: { customer: customerId, rating, title, comment, verified, createdAt: new Date() } } },
      { runValidators: true }
    );
    if (!matchedCount) {
      return res.status(409).json({ message: 'You have already reviewed this product' });
    }

    await refreshRatingStats(req.params.id);
    res.status(201).json({
      message: 'Review added successfully',
      review: await ownReview(req.params.id, customerId),
      ratingStats: await ratingStatsOf(req.params.id)
    });
  } catch (error) {
    failed(res, 'adding')(error);
  }
});

// PUT /mine - Change one's review
router.put('/mine', customerAuth, [productId, ...reviewRules], async (req, res) => {
  try {
    if (invalid(req, res)) return;
    const { customerId } = req.customer;
    const { rating, title, comment } = req.body;

    const { matchedCount } = await Product.updateOne(
      { _id: req.params.id, 'reviews.customer': customerId },
      {
        $set: {
          'reviews.$.rating': rating,
          'reviews.$.title': title,
          'reviews.$.comment': comment,
          'reviews.$.verified': await hasReceived(customerId, req.params.id),
          'reviews.$.editedAt': new Date()
        }
      },
      { runValidators: true }
    );
    if (!matchedCount) {
      return res.status(404).json({ message: 'Review not found' });
    }

    await refreshRatingStats(req.params.id);
    res.json({
      message: 'Review updated successfully',
      review: await ownReview(req.params.id, customerId),
      ratingStats: await ratingStatsOf(req.params.id)
    });
  } catch (error) {
    failed(res, 'updating')(error);
  }
});

// DELETE /mine - Remove one's review
router.delete('/mine', customerAuth, [productId], async (req, res) => {
  try {
    if (invalid(req, res)) return;
    // Matched on the review: the product's updatedAt changes on every update
    const { matchedCount } = await Product.updateOne(
      { _id: req.params.id, 'reviews.customer': req.customer.customerId },
      { $pull: { reviews: { customer: req.customer.customerId } } }
    );
    if (!matchedCount) {
      return res.status(404).json({ message: 'Review not found' });
    }

    await refreshRatingStats(req.params.id);
    res.json({ message: 'Review deleted successfully', ratingStats: await ratingStatsOf(req.params.id) });
  } catch (error) {
    failed(res, 'deleting')(error);
  }
});

// POST /:reviewId/helpful - Mark someone else's review as helpful, or take it back
router.post('/:reviewId/helpful', customerAuth, [
  productId,
  param('reviewId').isMongoId().withMessage('Invalid review ID'),
  body('helpful').isBoolean().withMessage('helpful must be true or false').toBoolean()
], async (req, res) => {
  try {
    if (invalid(req, res)) return;
    const { customerId } = req.customer;
    const { id, reviewId } = req.params;

    const product = await Product.findOne({ _id: id, 'reviews._id': reviewId }, { 'reviews.$': 1 }).lean();
    const review = product?.reviews[0];
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }
    if (String(review.customer) === String(customerId)) {
      return res.status(400).json({ message: 'You cannot vote for your own review' });
    }

    // One vote per customer: drop any earlier one, then add it back if wanted
    await Product.updateOne(
      { _id: id, 'reviews._id': reviewId },
      { $pull: { 'reviews.$.helpful': { customer: customerId } } }
    );
    if (req.body.helpful) {
      await Product.updateOne(
        { _id: id, reviews: { $elemMatch: { _id: reviewId, 'helpful.customer': { $ne: customerId } } } },
        { $push: { 'reviews.$.helpful': { customer: customerId, isHelpful: true } } }
      );
    }

    const updated = await Product.findOne({ _id: id, 'reviews._id': reviewId }, { 'reviews.$': 1 }).lean();
    const { helpfulCount, votedHelpful } = publicReview(updated.reviews[0], customerId);
    res.json({ helpfulCount, votedHelpful });
  } catch (error) {
    failed(res, 'voting for')(error);
  }
});

module.exports = router;
