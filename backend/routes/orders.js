const express = require('express');
const router = express.Router();
const { body, validationResult, query } = require('express-validator');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const { auth } = require('../middleware/auth');
const { optionalCustomerAuth } = require('../middleware/customerAuth');
// const emailNotificationService = require('../services/emailNotificationService');

// POST /api/orders - Create new order
router.post('/', optionalCustomerAuth, [
  // Support both old and new format
  body('customer.name').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Customer name is required'),
  body('customer.firstName').optional().trim().isLength({ min: 1, max: 50 }).withMessage('First name is required'),
  body('customer.lastName').optional().trim().isLength({ min: 1, max: 50 }).withMessage('Last name is required'),
  body('customer.email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('customer.phone').trim().isLength({ min: 8, max: 20 }).withMessage('Valid phone number is required'),

  // Shipping address (required)
  body('shipping.address').optional().trim().isLength({ min: 1, max: 200 }).withMessage('Shipping address is required'),
  body('shipping.city').optional().trim().isLength({ min: 1, max: 50 }).withMessage('Shipping city is required'),

  // Legacy support
  body('customer.address.street').optional().trim().isLength({ min: 1, max: 200 }).withMessage('Street address is required'),
  body('customer.address.city').optional().trim().isLength({ min: 1, max: 50 }).withMessage('City is required'),

  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.product').optional().isMongoId().withMessage('Valid product ID is required'),
  body('items.*.productId').optional().isMongoId().withMessage('Valid product ID is required'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('paymentMethod').optional().isIn(['cash_on_delivery', 'bank_transfer', 'card', 'paymee', 'flouci', 'd17', 'konnect']),
  body('payment.method').optional().isIn(['cash_on_delivery', 'bank_transfer', 'card', 'paymee', 'flouci', 'd17', 'konnect']),
  body('notes').optional().isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { customer, items, paymentMethod, payment, shipping, billing, notes, isUrgent } = req.body;

    // Support both old and new format
    const customerName = customer.name || `${customer.firstName} ${customer.lastName}`;
    const shippingAddress = shipping || customer.address;
    const paymentMethodValue = payment?.method || paymentMethod || 'cash_on_delivery';

    // Validate products and calculate total
    const productIds = items.map(item => item.product || item.productId);
    let orderItems = [];
    let subtotal = 0;

    // If products are provided, validate them
    if (productIds.some(id => id)) {
      const products = await Product.find({ _id: { $in: productIds.filter(id => id) } });

      orderItems = items.map(item => {
        const productId = item.product || item.productId;
        if (productId) {
          const product = products.find(p => p._id.toString() === productId);
          if (!product) {
            throw new Error(`Product ${productId} not found`);
          }

          const itemTotal = product.price * item.quantity;
          subtotal += itemTotal;

          return {
            product: product._id,
            name: item.name || product.name,
            price: item.price || product.price,
            quantity: item.quantity,
            image: item.image || product.image || product.images?.[0]
          };
        } else {
          // For items without product ID (from checkout)
          const itemTotal = item.price * item.quantity;
          subtotal += itemTotal;

          return {
            product: null,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            image: item.image
          };
        }
      });
    } else {
      // All items are from checkout without product validation
      orderItems = items.map(item => {
        const itemTotal = item.price * item.quantity;
        subtotal += itemTotal;

        return {
          product: item.productId || null,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          image: item.image
        };
      });
    }

    // Calculate shipping cost
    const city = shippingAddress?.city || customer.address?.city || 'tunis';
    const shippingCost = calculateShippingCost(city, isUrgent);

    // Calculate pricing
    const taxRate = 0.19; // 19% VAT in Tunisia
    const taxAmount = subtotal * taxRate;
    const paymentFee = paymentMethodValue === 'cash_on_delivery' ? 5 : 0;
    const totalAmount = subtotal + shippingCost + taxAmount + paymentFee;

    // Find or create customer
    let customerId = null;
    if (req.customer) {
      customerId = req.customer.customerId;
    } else {
      // Check if customer exists by email
      const existingCustomer = await Customer.findOne({ email: customer.email });
      if (existingCustomer) {
        customerId = existingCustomer._id;
      }
    }

    // Create order
    const order = new Order({
      customerId,
      customer: {
        name: customerName,
        email: customer.email,
        phone: customer.phone,
        company: customer.company,
        address: {
          street: shippingAddress?.address || shippingAddress?.street || customer.address?.street,
          city: shippingAddress?.city || customer.address?.city,
          state: shippingAddress?.state || customer.address?.state,
          postalCode: shippingAddress?.postalCode || customer.address?.postalCode,
          country: shippingAddress?.country || customer.address?.country || 'Tunisia'
        }
      },
      items: orderItems,
      totalItems: orderItems.reduce((sum, item) => sum + item.quantity, 0),

      // Billing information
      billing: {
        sameAsShipping: !billing || billing.sameAsShipping !== false,
        firstName: billing?.firstName || customer.firstName || customer.name?.split(' ')[0],
        lastName: billing?.lastName || customer.lastName || customer.name?.split(' ').slice(1).join(' '),
        company: billing?.company || customer.company,
        address: billing?.address || shippingAddress?.address || customer.address?.street,
        city: billing?.city || shippingAddress?.city || customer.address?.city,
        state: billing?.state || shippingAddress?.state || customer.address?.state,
        postalCode: billing?.postalCode || shippingAddress?.postalCode || customer.address?.postalCode,
        country: billing?.country || shippingAddress?.country || customer.address?.country || 'Tunisia',
        phone: billing?.phone || customer.phone,
        email: billing?.email || customer.email
      },

      // Pricing breakdown
      pricing: {
        subtotal,
        shippingCost,
        taxAmount,
        taxRate,
        paymentFee,
        totalAmount
      },

      // Legacy fields for compatibility
      shippingCost,
      totalAmount,

      // Payment information
      paymentMethod: paymentMethodValue,
      paymentStatus: 'pending',

      // Order details
      notes: notes || '',
      isUrgent: isUrgent || false,
      status: 'pending'
    });

    await order.save();

    // Populate product details for response
    if (orderItems.some(item => item.product)) {
      await order.populate('items.product');
    }

    res.status(201).json({
      message: 'Order created successfully',
      order: {
        id: order._id,
        orderNumber: order.orderNumber,
        trackingCode: order.trackingCode,
        status: order.status,
        paymentStatus: order.paymentStatus,
        totalAmount: order.totalAmount,
        estimatedDelivery: order.estimatedDelivery,
        customer: order.customer,
        items: order.items,
        pricing: order.pricing,
        createdAt: order.createdAt
      }
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ message: 'Error creating order' });
  }
});

// GET /api/orders - Get all orders (Admin only)
router.get('/', auth, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']),
  query('search').optional().isLength({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      page = 1,
      limit = 20,
      status,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter
    const filter = {};
    if (status) filter.status = status;
    
    if (search) {
      filter.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { 'customer.name': { $regex: search, $options: 'i' } },
        { 'customer.email': { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .populate('items.product', 'name image')
        .lean(),
      Order.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(total / parseInt(limit));

    res.json({
      orders,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalOrders: total,
        hasNext: parseInt(page) < totalPages,
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ message: 'Error fetching orders' });
  }
});

// GET /api/orders/:id - Get single order
router.get('/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('items.product');
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid order ID' });
    }
    res.status(500).json({ message: 'Error fetching order' });
  }
});

// GET /api/orders/number/:orderNumber - Get order by order number
router.get('/number/:orderNumber', async (req, res) => {
  try {
    const order = await Order.findOne({ orderNumber: req.params.orderNumber })
      .populate('items.product');
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ message: 'Error fetching order' });
  }
});

// POST /api/orders/admin - Create order manually (Admin only)
router.post('/admin', auth, [
  body('customer.firstName').trim().isLength({ min: 1, max: 50 }).withMessage('Customer first name is required'),
  body('customer.lastName').trim().isLength({ min: 1, max: 50 }).withMessage('Customer last name is required'),
  body('customer.email').isEmail().withMessage('Valid customer email is required'),
  body('customer.phone').optional().matches(/^(\+216)?[0-9]{8}$/).withMessage('Invalid phone number'),
  body('customer.address.street').trim().isLength({ min: 1, max: 200 }).withMessage('Street address is required'),
  body('customer.address.city').trim().isLength({ min: 1, max: 50 }).withMessage('City is required'),
  body('customer.address.postalCode').optional().trim().isLength({ max: 10 }),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.product').isMongoId().withMessage('Valid product ID is required'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('shippingCost').optional().isFloat({ min: 0 }).withMessage('Shipping cost must be non-negative'),
  body('notes').optional().trim().isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters'),
  body('status').optional().isIn(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { customer, items, shippingCost = 0, notes, status = 'pending' } = req.body;

    // Validate and get products
    const productIds = items.map(item => item.product);
    const products = await Product.find({ _id: { $in: productIds } });

    if (products.length !== productIds.length) {
      return res.status(400).json({ message: 'One or more products not found' });
    }

    // Check stock availability
    for (const item of items) {
      const product = products.find(p => p._id.toString() === item.product);
      if (!product.inStock || product.stockQuantity < item.quantity) {
        return res.status(400).json({
          message: `Insufficient stock for product: ${product.name}`
        });
      }
    }

    // Calculate totals
    let subtotal = 0;
    const orderItems = items.map(item => {
      const product = products.find(p => p._id.toString() === item.product);
      const itemTotal = product.price * item.quantity;
      subtotal += itemTotal;

      return {
        product: product._id,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
        image: product.image
      };
    });

    const taxRate = 0.19; // 19% VAT in Tunisia
    const taxAmount = subtotal * taxRate;
    const totalAmount = subtotal + shippingCost + taxAmount;

    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Check if customer exists
    let existingCustomer = null;
    try {
      existingCustomer = await Customer.findOne({ email: customer.email });
    } catch (error) {
      // Customer model might not be available, continue without it
    }

    // Create order
    const order = new Order({
      orderNumber,
      customerId: existingCustomer ? existingCustomer._id : null,
      customer: {
        name: `${customer.firstName} ${customer.lastName}`, // Combine firstName and lastName
        email: customer.email,
        phone: customer.phone || '',
        address: customer.address
      },
      items: orderItems,
      pricing: {
        subtotal,
        shippingCost,
        taxAmount,
        taxRate,
        totalAmount
      },
      shippingCost,
      totalAmount,
      status,
      notes,
      paymentStatus: 'pending',
      paymentMethod: 'cash_on_delivery' // Use valid enum value
    });

    await order.save();

    // Update product stock
    for (const item of items) {
      await Product.findByIdAndUpdate(
        item.product,
        {
          $inc: { stockQuantity: -item.quantity },
          $set: { inStock: true } // Will be updated by pre-save middleware
        }
      );
    }

    // Update customer stats if customer exists
    if (existingCustomer) {
      existingCustomer.totalSpent += totalAmount;
      existingCustomer.orderCount += 1;
      await existingCustomer.save();
    }

    await order.populate('items.product', 'name category');
    res.status(201).json(order);
  } catch (error) {
    console.error('Error creating admin order:', error);
    res.status(500).json({ message: 'Error creating order' });
  }
});

// PUT /api/orders/:id/status - Update order status (Admin only)
router.put('/:id/status', auth, [
  body('status').isIn(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']).withMessage('Invalid status'),
  body('trackingNumber').optional().trim().isLength({ max: 100 }),
  body('note').optional().trim().isLength({ max: 200 }).withMessage('Note cannot exceed 200 characters'),
  body('location').optional().trim().isLength({ max: 100 }).withMessage('Location cannot exceed 100 characters'),
  body('sendNotification').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { status, trackingNumber, note, location, sendNotification = true } = req.body;

    // Get the current order to track previous status
    const currentOrder = await Order.findById(req.params.id);
    if (!currentOrder) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const previousStatus = currentOrder.status;

    const updateData = { status };
    if (trackingNumber) updateData.trackingNumber = trackingNumber;

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('items.product');

    // Add custom tracking event if note or location provided
    if (note || location) {
      await order.addTrackingEvent(status, note, location, req.admin?.username || 'admin');
    }

    // Send notifications if enabled and status changed
    if (sendNotification && previousStatus !== status) {
      try {
        const notificationService = require('../services/notificationService');
        const notificationResult = await notificationService.sendOrderStatusUpdate(order, previousStatus);
        console.log(`Notification result for order ${order.orderNumber}:`, notificationResult);
      } catch (notificationError) {
        console.error('Notification failed:', notificationError);
        // Don't fail the status update if notification fails
      }
    }

    // Send delivery notification for delivered status
    if (status === 'delivered' && previousStatus !== 'delivered') {
      try {
        // await emailNotificationService.sendDeliveryNotification(order);
        console.log(`Delivery notification would be sent for order ${order.orderNumber} (temporarily disabled)`);
      } catch (emailError) {
        console.error('Delivery notification failed:', emailError);
      }
    }

    res.json({
      order,
      message: 'Order status updated successfully',
      emailSent: sendNotification && previousStatus !== status
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid order ID' });
    }
    res.status(500).json({ message: 'Error updating order status' });
  }
});

// POST /api/orders/:id/notes - Add internal note to order (Admin only)
router.post('/:id/notes', auth, [
  body('note').trim().isLength({ min: 1, max: 500 }).withMessage('Note is required and cannot exceed 500 characters'),
  body('isPrivate').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { note, isPrivate = true } = req.body;

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    order.internalNotes.push({
      note,
      addedBy: req.admin?.username || 'admin',
      isPrivate,
      timestamp: new Date()
    });

    await order.save();

    res.json({
      message: 'Note added successfully',
      note: order.internalNotes[order.internalNotes.length - 1]
    });
  } catch (error) {
    console.error('Error adding note:', error);
    res.status(500).json({ message: 'Error adding note' });
  }
});

// GET /api/orders/:id/timeline - Get order timeline (Admin only)
router.get('/:id/timeline', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const timeline = order.getTrackingTimeline();

    res.json({
      timeline,
      statusHistory: order.statusHistory,
      internalNotes: order.internalNotes
    });
  } catch (error) {
    console.error('Error fetching timeline:', error);
    res.status(500).json({ message: 'Error fetching timeline' });
  }
});

// GET /api/orders/stats/summary - Get order statistics (Admin only)
router.get('/stats/summary', auth, async (req, res) => {
  try {
    const stats = await Order.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' }
        }
      }
    ]);

    const totalOrders = await Order.countDocuments();
    const totalRevenue = await Order.aggregate([
      { $match: { status: { $in: ['delivered', 'shipped'] } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);

    res.json({
      totalOrders,
      totalRevenue: totalRevenue[0]?.total || 0,
      statusBreakdown: stats
    });
  } catch (error) {
    console.error('Error fetching order stats:', error);
    res.status(500).json({ message: 'Error fetching order statistics' });
  }
});

// Helper function to calculate shipping cost
function calculateShippingCost(city, isUrgent = false) {
  const baseCost = 7; // Base shipping cost in TND
  const urgentMultiplier = isUrgent ? 2 : 1;

  // Different rates for different cities
  const cityRates = {
    'tunis': 1,
    'sfax': 1.2,
    'sousse': 1.1,
    'kairouan': 1.3,
    'bizerte': 1.2,
    'gabes': 1.4,
    'ariana': 1,
    'gafsa': 1.5,
    'monastir': 1.1,
    'ben arous': 1,
    'kasserine': 1.6,
    'medenine': 1.5,
    'nabeul': 1.1,
    'tataouine': 1.7,
    'beja': 1.4,
    'jendouba': 1.5,
    'mahdia': 1.2,
    'manouba': 1,
    'siliana': 1.4,
    'tozeur': 1.6,
    'zaghouan': 1.3,
    'kef': 1.5,
    'sidi bouzid': 1.4,
    'kebili': 1.6
  };

  const cityKey = city.toLowerCase();
  const cityRate = cityRates[cityKey] || 1.3; // Default rate for unlisted cities

  return Math.round(baseCost * cityRate * urgentMultiplier);
}

// DELETE /api/orders/:id - Delete order (Admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Only allow deletion of pending or cancelled orders
    if (!['pending', 'cancelled'].includes(order.status)) {
      return res.status(400).json({
        message: 'Only pending or cancelled orders can be deleted'
      });
    }

    // Restore product stock if order is being deleted
    if (order.status === 'pending') {
      for (const item of order.items) {
        await Product.findByIdAndUpdate(
          item.product,
          { $inc: { stockQuantity: item.quantity } }
        );
      }
    }

    // Update customer stats if customer exists
    if (order.customerId) {
      try {
        const Customer = require('../models/Customer');
        const customer = await Customer.findById(order.customerId);
        if (customer) {
          customer.totalSpent = Math.max(0, customer.totalSpent - order.totalAmount);
          customer.orderCount = Math.max(0, customer.orderCount - 1);
          await customer.save();
        }
      } catch (error) {
        console.error('Error updating customer stats:', error);
        // Continue with deletion even if customer update fails
      }
    }

    await Order.findByIdAndDelete(req.params.id);
    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).json({ message: 'Error deleting order' });
  }
});

// GET /api/orders/stats - Get order statistics for tracking dashboard
router.get('/stats', auth, async (req, res) => {
  try {
    const { timeRange = '7d' } = req.query;

    // Calculate date range
    const now = new Date();
    let startDate = new Date();

    switch (timeRange) {
      case '24h':
        startDate.setHours(now.getHours() - 24);
        break;
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      default:
        startDate.setDate(now.getDate() - 7);
    }

    // Get order statistics
    const [
      totalOrders,
      statusDistribution,
      deliveryStats,
      previousPeriodOrders
    ] = await Promise.all([
      // Total orders in period
      Order.countDocuments({
        createdAt: { $gte: startDate }
      }),

      // Status distribution
      Order.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),

      // Delivery statistics
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate },
            status: 'delivered',
            actualDelivery: { $exists: true },
            estimatedDelivery: { $exists: true }
          }
        },
        {
          $project: {
            deliveryDays: {
              $divide: [
                { $subtract: ['$actualDelivery', '$createdAt'] },
                1000 * 60 * 60 * 24
              ]
            },
            onTime: {
              $lte: ['$actualDelivery', '$estimatedDelivery']
            }
          }
        },
        {
          $group: {
            _id: null,
            avgDeliveryTime: { $avg: '$deliveryDays' },
            onTimeCount: { $sum: { $cond: ['$onTime', 1, 0] } },
            totalDelivered: { $sum: 1 }
          }
        }
      ]),

      // Previous period for growth calculation
      Order.countDocuments({
        createdAt: {
          $gte: new Date(startDate.getTime() - (now.getTime() - startDate.getTime())),
          $lt: startDate
        }
      })
    ]);

    // Process status distribution
    const statusDistributionObj = statusDistribution.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    // Calculate metrics
    const delivered = statusDistributionObj.delivered || 0;
    const inTransit = (statusDistributionObj.shipped || 0) + (statusDistributionObj.processing || 0);
    const urgentOrders = await Order.countDocuments({
      createdAt: { $gte: startDate },
      isUrgent: true,
      status: { $in: ['pending', 'confirmed', 'processing', 'shipped'] }
    });

    const deliveryData = deliveryStats[0] || {};
    const avgDeliveryTime = Math.round(deliveryData.avgDeliveryTime || 4);
    const onTimeDelivery = deliveryData.totalDelivered > 0
      ? Math.round((deliveryData.onTimeCount / deliveryData.totalDelivered) * 100)
      : 0;
    const deliveryRate = totalOrders > 0 ? Math.round((delivered / totalOrders) * 100) : 0;

    const orderGrowth = previousPeriodOrders > 0
      ? Math.round(((totalOrders - previousPeriodOrders) / previousPeriodOrders) * 100)
      : 0;

    // Additional metrics
    const customerSatisfaction = 95; // This would come from reviews/feedback
    const repeatCustomers = 65; // This would come from customer analysis
    const coverageAreas = 24; // Number of cities/areas covered

    res.json({
      totalOrders,
      inTransit,
      delivered,
      urgentOrders,
      avgDeliveryTime,
      onTimeDelivery,
      deliveryRate,
      orderGrowth,
      customerSatisfaction,
      repeatCustomers,
      coverageAreas,
      statusDistribution: statusDistributionObj
    });

  } catch (error) {
    console.error('Error fetching order statistics:', error);
    res.status(500).json({ message: 'Error fetching statistics' });
  }
});

module.exports = router;
