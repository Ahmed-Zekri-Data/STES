const mongoose = require('mongoose');

const brandSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Brand name is required'],
    unique: true,
    trim: true,
    maxlength: [100, 'Brand name cannot exceed 100 characters']
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  description: {
    type: String,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  logo: {
    type: String,
    default: ''
  },
  website: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        return !v || /^https?:\/\/.+/.test(v);
      },
      message: 'Website must be a valid URL'
    }
  },
  country: {
    type: String,
    trim: true,
    maxlength: [50, 'Country cannot exceed 50 characters']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  sortOrder: {
    type: Number,
    default: 0
  },
  productCount: {
    type: Number,
    default: 0
  },
  categories: [{
    type: String,
    trim: true
  }],
  contactInfo: {
    email: {
      type: String,
      trim: true,
      lowercase: true
    },
    phone: {
      type: String,
      trim: true
    },
    address: {
      type: String,
      trim: true
    }
  },
  socialMedia: {
    facebook: String,
    instagram: String,
    twitter: String,
    linkedin: String,
    youtube: String
  },
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
  metaKeywords: [{
    type: String,
    trim: true
  }]
}, {
  timestamps: true
});

// Indexes
brandSchema.index({ slug: 1 });
brandSchema.index({ isActive: 1 });
brandSchema.index({ isFeatured: 1 });
brandSchema.index({ sortOrder: 1 });
brandSchema.index({ name: 'text', description: 'text' });

// Pre-save middleware to generate slug
brandSchema.pre('save', function(next) {
  if (this.isModified('name') || this.isNew) {
    this.slug = this.name.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-');
  }
  next();
});

// Method to update product count
brandSchema.methods.updateProductCount = async function() {
  const Product = mongoose.model('Product');
  this.productCount = await Product.countDocuments({ brand: this.name });
  await this.save();
};

// Static method to get featured brands
brandSchema.statics.getFeatured = function() {
  return this.find({ isActive: true, isFeatured: true })
    .sort({ sortOrder: 1, name: 1 });
};

// Static method to get brands by category
brandSchema.statics.getByCategory = function(category) {
  return this.find({ 
    isActive: true, 
    categories: { $in: [category] } 
  }).sort({ name: 1 });
};

module.exports = mongoose.model('Brand', brandSchema);
