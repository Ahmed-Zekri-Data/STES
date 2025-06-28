const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Wishlist = require('../models/Wishlist');
const Product = require('../models/Product');
const { customerAuth } = require('../middleware/customerAuth');

// GET /api/wishlist - Get customer's wishlist
router.get('/', customerAuth, async (req, res) => {
  try {
    const wishlist = await Wishlist.getWithProducts(req.customer.customerId);
    
    if (!wishlist) {
      return res.json({
        wishlist: {
          items: [],
          itemsCount: 0,
          name: 'Ma liste de souhaits',
          description: ''
        }
      });
    }

    res.json({
      wishlist: {
        id: wishlist._id,
        items: wishlist.items,
        itemsCount: wishlist.itemsCount,
        name: wishlist.name,
        description: wishlist.description,
        isPublic: wishlist.isPublic,
        createdAt: wishlist.createdAt,
        updatedAt: wishlist.updatedAt
      }
    });
  } catch (error) {
    console.error('Error fetching wishlist:', error);
    res.status(500).json({ message: 'Error fetching wishlist' });
  }
});

// POST /api/wishlist/items - Add item to wishlist
router.post('/items', customerAuth, [
  body('productId').isMongoId().withMessage('Valid product ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { productId } = req.body;

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Get or create wishlist
    const wishlist = await Wishlist.findOrCreateForCustomer(req.customer.customerId);

    // Create product snapshot
    const productSnapshot = {
      name: product.name,
      price: product.price,
      image: product.images && product.images.length > 0 ? product.images[0] : '',
      category: product.category
    };

    // Add item to wishlist
    await wishlist.addItem(productId, productSnapshot);

    // Get updated wishlist with populated products
    const updatedWishlist = await Wishlist.getWithProducts(req.customer.customerId);

    res.status(201).json({
      message: 'Product added to wishlist',
      wishlist: {
        id: updatedWishlist._id,
        items: updatedWishlist.items,
        itemsCount: updatedWishlist.itemsCount
      }
    });
  } catch (error) {
    console.error('Error adding to wishlist:', error);
    if (error.message === 'Product already in wishlist') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Error adding product to wishlist' });
  }
});

// DELETE /api/wishlist/items/:productId - Remove item from wishlist
router.delete('/items/:productId', customerAuth, async (req, res) => {
  try {
    const { productId } = req.params;

    // Get wishlist
    const wishlist = await Wishlist.findOne({ customer: req.customer.customerId });
    if (!wishlist) {
      return res.status(404).json({ message: 'Wishlist not found' });
    }

    // Remove item
    await wishlist.removeItem(productId);

    // Get updated wishlist with populated products
    const updatedWishlist = await Wishlist.getWithProducts(req.customer.customerId);

    res.json({
      message: 'Product removed from wishlist',
      wishlist: {
        id: updatedWishlist._id,
        items: updatedWishlist.items,
        itemsCount: updatedWishlist.itemsCount
      }
    });
  } catch (error) {
    console.error('Error removing from wishlist:', error);
    res.status(500).json({ message: 'Error removing product from wishlist' });
  }
});

// POST /api/wishlist/check - Check if product is in wishlist
router.post('/check', customerAuth, [
  body('productId').isMongoId().withMessage('Valid product ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { productId } = req.body;

    const wishlist = await Wishlist.findOne({ customer: req.customer.customerId });
    const isInWishlist = wishlist ? wishlist.hasProduct(productId) : false;

    res.json({
      isInWishlist,
      productId
    });
  } catch (error) {
    console.error('Error checking wishlist:', error);
    res.status(500).json({ message: 'Error checking wishlist' });
  }
});

// DELETE /api/wishlist - Clear entire wishlist
router.delete('/', customerAuth, async (req, res) => {
  try {
    const wishlist = await Wishlist.findOne({ customer: req.customer.customerId });
    if (!wishlist) {
      return res.status(404).json({ message: 'Wishlist not found' });
    }

    await wishlist.clearAll();

    res.json({
      message: 'Wishlist cleared successfully',
      wishlist: {
        id: wishlist._id,
        items: [],
        itemsCount: 0
      }
    });
  } catch (error) {
    console.error('Error clearing wishlist:', error);
    res.status(500).json({ message: 'Error clearing wishlist' });
  }
});

// PUT /api/wishlist/settings - Update wishlist settings
router.put('/settings', customerAuth, [
  body('name').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Name must be 1-100 characters'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),
  body('isPublic').optional().isBoolean().withMessage('isPublic must be a boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, isPublic } = req.body;

    const wishlist = await Wishlist.findOrCreateForCustomer(req.customer.customerId);

    if (name !== undefined) wishlist.name = name;
    if (description !== undefined) wishlist.description = description;
    if (isPublic !== undefined) wishlist.isPublic = isPublic;

    await wishlist.save();

    res.json({
      message: 'Wishlist settings updated successfully',
      wishlist: {
        id: wishlist._id,
        name: wishlist.name,
        description: wishlist.description,
        isPublic: wishlist.isPublic
      }
    });
  } catch (error) {
    console.error('Error updating wishlist settings:', error);
    res.status(500).json({ message: 'Error updating wishlist settings' });
  }
});

// GET /api/wishlist/public/:customerId - Get public wishlist (for sharing)
router.get('/public/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;

    const wishlist = await Wishlist.findOne({ 
      customer: customerId, 
      isPublic: true 
    }).populate({
      path: 'items.product',
      select: 'name price images category inStock'
    }).populate({
      path: 'customer',
      select: 'firstName lastName'
    });

    if (!wishlist) {
      return res.status(404).json({ message: 'Public wishlist not found' });
    }

    res.json({
      wishlist: {
        id: wishlist._id,
        name: wishlist.name,
        description: wishlist.description,
        items: wishlist.items,
        itemsCount: wishlist.itemsCount,
        owner: wishlist.customer,
        createdAt: wishlist.createdAt
      }
    });
  } catch (error) {
    console.error('Error fetching public wishlist:', error);
    res.status(500).json({ message: 'Error fetching public wishlist' });
  }
});

module.exports = router;
