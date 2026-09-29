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
  },
  // Versions of the product (e.g. a pump in 1/2, 3/4 or 1 HP), each with the
  // maker's code, its own price and stock. With versions, the product's
  // price is the lowest one and its stock their total (see pre-validate).
  variants: [{
    _id: false,
    sku: { type: String, trim: true, maxlength: 40 },
    label: { type: String, trim: true, required: true, maxlength: 120 },
    price: { type: Number, min: 0, default: null }, // null: price on request
    stockQuantity: { type: Number, min: 0, default: 0 }
  }],
  // "Prix sur demande": shown without a price, with a quote request instead
  // of "add to cart". Worked out from the versions when there are some.
  priceOnRequest: {
    type: Boolean,
    default: false
  },
  // "Sur commande": can still be ordered when out of stock (the shop orders
  // it from the supplier)
  backorder: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for search functionality
productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ category: 1 });
productSchema.index({ price: 1 });
productSchema.index({ featured: 1 });
productSchema.index({ 'variants.sku': 1 });

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

// With versions, the product shows the lowest price ("à partir de") and the
// total stock, so lists, filters and stock alerts work unchanged
productSchema.pre('validate', function(next) {
  if (this.variants?.length) {
    const priced = this.variants.filter(v => v.price !== null && v.price !== undefined);
    this.price = priced.length ? Math.min(...priced.map(v => v.price)) : 0;
    this.priceOnRequest = priced.length === 0;
    this.stockQuantity = this.variants.reduce((sum, v) => sum + (v.stockQuantity || 0), 0);
    this.inStock = this.stockQuantity > 0;
  }
  next();
});

// Pre-save middleware to ensure stock consistency
productSchema.pre('save', function(next) {
  if (this.stockQuantity <= 0) {
    this.inStock = false;
  }
  next();
});

module.exports = mongoose.model('Product', productSchema);
