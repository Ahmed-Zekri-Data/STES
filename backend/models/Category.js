const mongoose = require('mongoose');
const { slugify } = require('../utils/text');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    trim: true,
    maxlength: [100, 'Category name cannot exceed 100 characters']
  },
  nameEn: {
    type: String,
    required: [true, 'English name is required'],
    trim: true,
    maxlength: [100, 'English name cannot exceed 100 characters']
  },
  nameAr: {
    type: String,
    trim: true,
    maxlength: [100, 'Arabic name cannot exceed 100 characters']
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
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  icon: {
    type: String,
    default: '📦'
  },
  image: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  sortOrder: {
    type: Number,
    default: 0
  },
  parentCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  subcategories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  }],
  productCount: {
    type: Number,
    default: 0
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
categorySchema.index({ isActive: 1 });
categorySchema.index({ parentCategory: 1 });
categorySchema.index({ sortOrder: 1 });

// Virtual for full path
categorySchema.virtual('fullPath').get(function() {
  // This would need to be populated to work properly
  return this.parentCategory ? `${this.parentCategory.name} > ${this.name}` : this.name;
});

// Give new categories their slug. This runs before validation, which
// requires it. The slug then stays the same when the category is renamed,
// because products refer to their category by slug.
categorySchema.pre('validate', function(next) {
  if (!this.slug) {
    this.slug = slugify(this.name) || slugify(this.nameEn) || String(this._id);
  }
  next();
});

// Static method to get category tree
categorySchema.statics.getCategoryTree = async function() {
  const categories = await this.find({ isActive: true })
    .sort({ sortOrder: 1, name: 1 })
    .populate('subcategories');
  
  const tree = [];
  const categoryMap = {};
  
  // Create a map of all categories
  categories.forEach(cat => {
    categoryMap[cat._id] = { ...cat.toObject(), children: [] };
  });
  
  // Build the tree structure
  categories.forEach(cat => {
    if (cat.parentCategory) {
      if (categoryMap[cat.parentCategory]) {
        categoryMap[cat.parentCategory].children.push(categoryMap[cat._id]);
      }
    } else {
      tree.push(categoryMap[cat._id]);
    }
  });
  
  return tree;
};

// Method to update product count
categorySchema.methods.updateProductCount = async function() {
  const Product = mongoose.model('Product');
  this.productCount = await Product.countDocuments({ category: this.slug });
  await this.save();
};

module.exports = mongoose.model('Category', categorySchema);
