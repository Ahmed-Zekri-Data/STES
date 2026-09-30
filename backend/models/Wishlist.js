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
wishlistSchema.index({ 'items.product': 1 });

// Virtual for items count
wishlistSchema.virtual('itemsCount').get(function() {
  return this.items.length;
});

// The product id of an item, whether or not the product is loaded
const itemProductId = (item) => String(item.product?._id || item.product);

// Method to add item to wishlist
wishlistSchema.methods.addItem = function(productId, productSnapshot) {
  // Check if item already exists
  const existingItem = this.items.find(item => itemProductId(item) === String(productId));
  
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
  this.items = this.items.filter(item => itemProductId(item) !== String(productId));
  
  return this.save();
};

// Method to check if product is in wishlist
wishlistSchema.methods.hasProduct = function(productId) {
  return this.items.some(item => itemProductId(item) === String(productId));
};

// Method to clear all items
wishlistSchema.methods.clearAll = function() {
  this.items = [];
  return this.save();
};

// Static method to find or create wishlist for customer
wishlistSchema.statics.findOrCreateForCustomer = async function(customerId) {
  let wishlist = await this.findOne({ customer: customerId });
  
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
// Products deleted from the catalog are dropped from the list: they can no
// longer be bought
wishlistSchema.statics.getWithProducts = async function(customerId) {
  const wishlist = await this.findOne({ customer: customerId })
    .populate({
      path: 'items.product',
      select: 'name price image category inStock stockQuantity variants priceOnRequest backorder'
    });
  if (wishlist && wishlist.items.some(item => !item.product)) {
    wishlist.items = wishlist.items.filter(item => item.product);
    await wishlist.save();
  }
  return wishlist;
};

module.exports = mongoose.model('Wishlist', wishlistSchema);
