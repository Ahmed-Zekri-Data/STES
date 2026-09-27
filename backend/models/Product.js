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
    // The slug of a category managed in the admin (Category collection)
    lowercase: true,
    trim: true
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
    },
    editedAt: Date
  }],
  // Rating Statistics (kept up to date by services/reviewService)
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

// Pre-save middleware to ensure stock consistency
productSchema.pre('save', function(next) {
  if (this.stockQuantity <= 0) {
    this.inStock = false;
  }
  next();
});

module.exports = mongoose.model('Product', productSchema);
