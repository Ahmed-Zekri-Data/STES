const mongoose = require('mongoose');

const wishlistItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  addedAt: {
    type: Date,
    default: Date.now
  },
  // Store product details at time of adding to wishlist
  // in case product gets deleted or modified
  productSnapshot: {
    name: String,
    price: Number,
    image: String,
    category: String
  }
});

const wishlistSchema = new mongoose.Schema({
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true,
    unique: true
  },
  items: [wishlistItemSchema],
  isPublic: {
    type: Boolean,
    default: false
  },
  name: {
    type: String,
    default: 'Ma liste de souhaits'
  },
  description: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Indexes
wishlistSchema.index({ customer: 1 });
wishlistSchema.index({ 'items.product': 1 });

// Virtual for items count
wishlistSchema.virtual('itemsCount').get(function() {
  return this.items.length;
});

// Method to add item to wishlist
wishlistSchema.methods.addItem = function(productId, productSnapshot) {
  // Check if item already exists
  const existingItem = this.items.find(item => 
    item.product.toString() === productId.toString()
  );
  
  if (existingItem) {
    throw new Error('Product already in wishlist');
  }
  
  this.items.push({
    product: productId,
    productSnapshot
  });
  
  return this.save();
};

// Method to remove item from wishlist
wishlistSchema.methods.removeItem = function(productId) {
  this.items = this.items.filter(item => 
    item.product.toString() !== productId.toString()
  );
  
  return this.save();
};

// Method to check if product is in wishlist
wishlistSchema.methods.hasProduct = function(productId) {
  return this.items.some(item => 
    item.product.toString() === productId.toString()
  );
};

// Method to clear all items
wishlistSchema.methods.clearAll = function() {
  this.items = [];
  return this.save();
};

// Static method to find or create wishlist for customer
wishlistSchema.statics.findOrCreateForCustomer = async function(customerId) {
  let wishlist = await this.findOne({ customer: customerId }).populate('items.product');
  
  if (!wishlist) {
    wishlist = new this({
      customer: customerId,
      items: []
    });
    await wishlist.save();
  }
  
  return wishlist;
};

// Static method to get wishlist with populated products
wishlistSchema.statics.getWithProducts = async function(customerId) {
  return this.findOne({ customer: customerId })
    .populate({
      path: 'items.product',
      select: 'name price images category inStock'
    });
};

module.exports = mongoose.model('Wishlist', wishlistSchema);
