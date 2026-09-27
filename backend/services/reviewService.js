const Product = require('../models/Product');
const Order = require('../models/Order');

const countRating = (rating) => ({
  $size: { $filter: { input: '$reviews', cond: { $eq: ['$$this.rating', rating] } } }
});

// Recomputes a product's average, count and distribution from its reviews in
// one database update, so two reviews saved at the same time can't leave a
// stale summary.
const refreshRatingStats = (productId) => Product.updateOne({ _id: productId }, [{
  $set: {
    ratingStats: {
      averageRating: { $round: [{ $ifNull: [{ $avg: '$reviews.rating' }, 0] }, 1] },
      totalReviews: { $size: '$reviews' },
      ratingDistribution: {
        5: countRating(5), 4: countRating(4), 3: countRating(3), 2: countRating(2), 1: countRating(1)
      }
    }
  }
}]);

// A review is marked "Achat vérifié" when the customer has received the product
const hasReceived = async (customerId, productId) =>
  Boolean(await Order.exists({ customerId, status: 'delivered', 'items.product': productId }));

// First name and last-name initial: "Fatma T."
const authorName = (customer) => {
  if (!customer?.firstName) return 'Client';
  const initial = customer.lastName?.trim()[0];
  return initial ? `${customer.firstName} ${initial.toUpperCase()}.` : customer.firstName;
};

const sameId = (a, b) => Boolean(a && b) && String(a._id || a) === String(b._id || b);

// What the shop shows of a review: no customer id or email
const publicReview = (review, viewerId) => {
  const votes = (review.helpful || []).filter(vote => vote.isHelpful);
  return {
    _id: review._id,
    author: authorName(review.customer),
    rating: review.rating,
    title: review.title,
    comment: review.comment,
    verified: Boolean(review.verified),
    createdAt: review.createdAt,
    editedAt: review.editedAt,
    helpfulCount: votes.length,
    votedHelpful: votes.some(vote => sameId(vote.customer, viewerId)),
    mine: sameId(review.customer, viewerId)
  };
};

module.exports = { refreshRatingStats, hasReceived, authorName, publicReview };
