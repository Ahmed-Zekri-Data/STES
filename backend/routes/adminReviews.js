const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { param, query, validationResult } = require('express-validator');
const Product = require('../models/Product');
const { auth, checkPermission } = require('../middleware/auth');
const { refreshRatingStats } = require('../services/reviewService');
const { containing } = require('../utils/text');

// Reviews are part of the catalogue: admins who manage products moderate them
router.use(auth, checkPermission('products'));

const invalid = (req, res) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return false;
  res.status(400).json({ errors: errors.array() });
  return true;
};

// GET /api/admin/reviews - Every product's reviews, newest first
router.get('/', [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('rating').optional({ values: 'falsy' }).isInt({ min: 1, max: 5 }).toInt(),
  query('product').optional({ values: 'falsy' }).isMongoId(),
  query('search').optional({ values: 'falsy' }).isString().isLength({ max: 100 })
], async (req, res) => {
  try {
    if (invalid(req, res)) return;
    const { page = 1, limit = 20, rating, product, search } = req.query;

    const match = {};
    if (rating) match['reviews.rating'] = rating;
    if (search) {
      match.$or = ['name', 'reviews.title', 'reviews.comment'].map(field => ({ [field]: containing(search) }));
    }

    const [result] = await Product.aggregate([
      { $match: product ? { _id: new mongoose.Types.ObjectId(product) } : {} },
      { $unwind: '$reviews' },
      { $match: match },
      { $sort: { 'reviews.createdAt': -1, 'reviews._id': -1 } },
      {
        $facet: {
          reviews: [
            { $skip: (page - 1) * limit },
            { $limit: limit },
            { $lookup: { from: 'customers', localField: 'reviews.customer', foreignField: '_id', as: 'customer' } },
            {
              $project: {
                _id: '$reviews._id',
                product: { _id: '$_id', name: '$name', image: '$image' },
                customer: {
                  $let: {
                    vars: { c: { $arrayElemAt: ['$customer', 0] } },
                    in: { _id: '$$c._id', firstName: '$$c.firstName', lastName: '$$c.lastName', email: '$$c.email' }
                  }
                },
                rating: '$reviews.rating',
                title: '$reviews.title',
                comment: '$reviews.comment',
                verified: '$reviews.verified',
                createdAt: '$reviews.createdAt',
                editedAt: '$reviews.editedAt',
                helpfulCount: {
                  $size: { $filter: { input: { $ifNull: ['$reviews.helpful', []] }, cond: '$$this.isHelpful' } }
                }
              }
            }
          ],
          total: [{ $count: 'count' }]
        }
      }
    ]);

    const total = result.total[0]?.count || 0;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    res.json({
      reviews: result.reviews,
      pagination: { currentPage: page, totalPages, totalReviews: total, hasNext: page < totalPages, hasPrev: page > 1 }
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ message: 'Error fetching reviews' });
  }
});

// DELETE /api/admin/reviews/:productId/:reviewId - Remove a review (spam,
// insults, personal details...)
router.delete('/:productId/:reviewId', [
  param('productId').isMongoId().withMessage('Invalid product ID'),
  param('reviewId').isMongoId().withMessage('Invalid review ID')
], async (req, res) => {
  try {
    if (invalid(req, res)) return;
    const { productId, reviewId } = req.params;

    const { matchedCount } = await Product.updateOne(
      { _id: productId, 'reviews._id': reviewId },
      { $pull: { reviews: { _id: reviewId } } }
    );
    if (!matchedCount) {
      return res.status(404).json({ message: 'Review not found' });
    }

    await refreshRatingStats(productId);
    res.json({ message: 'Review deleted' });
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({ message: 'Error deleting review' });
  }
});

module.exports = router;
