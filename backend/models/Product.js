const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [100, 'Product name cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Product description is required'],
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  price: {
    type: Number,
    required: [true, 'Product price is required'],
    min: [0, 'Price cannot be negative']
  },
  category: {
    type: String,
    required: [true, 'Product category is required'],
    enum: ['pools', 'pumps-motors', 'filters', 'chemicals', 'cleaning', 'heating', 'lighting', 'accessories', 'maintenance'],
    lowercase: true
  },
  subcategory: {
    type: String,
    trim: true
  },
  image: {
    type: String,
    default: '/api/placeholder/300/200'
  },
  specifications: {
    type: Map,
    of: String,
    default: {}
  },
  inStock: {
    type: Boolean,
    default: true
  },
  stockQuantity: {
    type: Number,
    default: 0,
    min: [0, 'Stock quantity cannot be negative']
  },
  featured: {
    type: Boolean,
    default: false
  },
  tags: [{
    type: String,
    trim: true
  }],
  weight: {
    type: Number,
    min: [0, 'Weight cannot be negative']
  },
  dimensions: {
    length: Number,
    width: Number,
    height: Number
  },
  // Reviews and Ratings
  reviews: [{
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    comment: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000
    },
    verified: {
      type: Boolean,
      default: false
    },
    helpful: [{
      customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer'
      },
      isHelpful: Boolean
    }],
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Rating Statistics
  ratingStats: {
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    totalReviews: {
      type: Number,
      default: 0,
      min: 0
    },
    ratingDistribution: {
      5: { type: Number, default: 0 },
      4: { type: Number, default: 0 },
      3: { type: Number, default: 0 },
      2: { type: Number, default: 0 },
      1: { type: Number, default: 0 }
    }
  },
  // SEO and Marketing
  seoTitle: {
    type: String,
    trim: true,
    maxlength: 60
  },
  seoDescription: {
    type: String,
    trim: true,
    maxlength: 160
  },
  brand: {
    type: String,
    trim: true
  },
  model: {
    type: String,
    trim: true
  },
  sku: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  }
}, {
  timestamps: true
});

// Index for search functionality
productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ category: 1 });
productSchema.index({ price: 1 });
productSchema.index({ featured: 1 });

// Virtual for formatted price
productSchema.virtual('formattedPrice').get(function() {
  return `${this.price.toFixed(2)} TND`;
});

// Method to check if product is available
productSchema.methods.isAvailable = function() {
  return this.inStock && this.stockQuantity > 0;
};

// Static method to get products by category
productSchema.statics.getByCategory = function(category) {
  return this.find({ category, inStock: true });
};

// Static method to get featured products
productSchema.statics.getFeatured = function() {
  return this.find({ featured: true, inStock: true }).limit(6);
};

// Method to add a review
productSchema.methods.addReview = function(customerId, rating, title, comment) {
  // Check if customer already reviewed this product
  const existingReview = this.reviews.find(review =>
    review.customer.toString() === customerId.toString()
  );

  if (existingReview) {
    throw new Error('You have already reviewed this product');
  }

  this.reviews.push({
    customer: customerId,
    rating,
    title,
    comment
  });

  this.updateRatingStats();
  return this.save();
};

// Method to update rating statistics
productSchema.methods.updateRatingStats = function() {
  const reviews = this.reviews;
  const totalReviews = reviews.length;

  if (totalReviews === 0) {
    this.ratingStats = {
      averageRating: 0,
      totalReviews: 0,
      ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    };
    return;
  }

  // Calculate average rating
  const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
  const averageRating = totalRating / totalReviews;

  // Calculate rating distribution
  const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  reviews.forEach(review => {
    distribution[review.rating]++;
  });

  this.ratingStats = {
    averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
    totalReviews,
    ratingDistribution: distribution
  };
};

// Method to get reviews with customer info
productSchema.methods.getReviewsWithCustomers = function() {
  return this.populate({
    path: 'reviews.customer',
    select: 'firstName lastName avatar'
  });
};

// Pre-save middleware to ensure stock consistency
productSchema.pre('save', function(next) {
  if (this.stockQuantity <= 0) {
    this.inStock = false;
  }
  next();
});

module.exports = mongoose.model('Product', productSchema);
