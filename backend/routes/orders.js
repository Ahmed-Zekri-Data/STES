const express = require('express');
const router = express.Router();
const { body, validationResult, query } = require('express-validator');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const { auth, checkPermission } = require('../middleware/auth');

// Order pages in the admin: admins allowed to manage orders
const ordersAdmin = [auth, checkPermission('orders')];
const { optionalCustomerAuth } = require('../middleware/customerAuth');
const { CheckoutError, priceOrderItems, quoteOrder, reserveStock, releaseStock, reserveOrderStock, releaseOrderStock } = require('../services/orderService');

// Delivery is priced by governorate when the address has one, else by city
const deliveryPlace = (address) => address?.governorate || address?.city || 'tunis';
const emailNotificationService = require('../services/emailNotificationService');
const paymentService = require('../services/paymentService');

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
    // Only what checkout offers: no bank transfer without the shop's account,
    // no online gateway that isn't set up
    if (!(await paymentService.isAvailable(paymentMethodValue))) {
      return res.status(400).json({ message: "Ce mode de paiement n'est pas disponible." });
    }

    // Prices come from the catalog, never from the request
    const { orderItems, pricing } = await quoteOrder({
      items,
      place: deliveryPlace(shippingAddress || customer.address),
      isUrgent,
      paymentMethod: paymentMethodValue
    });

    // Only a logged-in customer's order goes into their account. A guest
    // order is never linked by email: anyone can type any address, and
    // the order would then show up in someone else's account.
    const customerId = req.customer ? req.customer.customerId : null;

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
          governorate: shippingAddress?.governorate || shippingAddress?.state || customer.address?.governorate,
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
        state: billing?.state || billing?.governorate || shippingAddress?.state || shippingAddress?.governorate || customer.address?.state,
        postalCode: billing?.postalCode || shippingAddress?.postalCode || customer.address?.postalCode,
        country: billing?.country || shippingAddress?.country || customer.address?.country || 'Tunisia',
        phone: billing?.phone || customer.phone,
        email: billing?.email || customer.email
      },

      // Pricing breakdown
      pricing,

      // Legacy fields for compatibility
      shippingCost: pricing.shippingCost,
      totalAmount: pricing.totalAmount,

      // Payment information
      paymentMethod: paymentMethodValue,
      paymentStatus: 'pending',

      // Order details
      notes: notes || '',
      isUrgent: isUrgent || false,
      status: 'pending'
    });

    await reserveStock(orderItems);
    order.stockReserved = true;
    try {
      await order.save();
    } catch (error) {
      await releaseStock(orderItems);
      throw error;
    }

    // In the background: a slow or unreachable mail server must not hold up
    // checkout. Failures are logged by the service.
    emailNotificationService.sendOrderConfirmation(order);

    await order.populate('items.product', '-reviews');

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
    if (error instanceof CheckoutError) {
      return res.status(error.status).json({ message: error.message });
    }
    console.error('Error creating order:', error);
    res.status(500).json({ message: 'Error creating order' });
  }
});

// POST /api/orders/quote - Price a cart exactly as POST /api/orders would
router.post('/quote', [
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('paymentMethod').optional().isIn(['cash_on_delivery', 'bank_transfer', 'card', 'paymee', 'flouci', 'd17', 'konnect'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { items, shipping, isUrgent, paymentMethod } = req.body;
    const { orderItems, pricing } = await quoteOrder({
      items,
      place: deliveryPlace(shipping),
      isUrgent: Boolean(isUrgent),
      paymentMethod: paymentMethod || 'cash_on_delivery'
    });

    res.json({ items: orderItems, pricing });
  } catch (error) {
    if (error instanceof CheckoutError) {
      return res.status(error.status).json({ message: error.message });
    }
    console.error('Error quoting order:', error);
    res.status(500).json({ message: 'Error quoting order' });
  }
});

// GET /api/orders - Get all orders (Admin only)
router.get('/', ordersAdmin, [
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

// The period's performance figures, null when there is nothing to measure:
// - customerSatisfaction: share of product reviews rated 4 or 5 stars
// - repeatCustomers: share of the period's customers with more than one order
// - coverageAreas: governorates (or cities) delivered to
const performanceMetrics = async (startDate) => {
  const inPeriod = { createdAt: { $gte: startDate }, status: { $ne: 'cancelled' } };
  const [[reviews], [customers], areas] = await Promise.all([
    Product.aggregate([
      { $unwind: '$reviews' },
      { $match: { 'reviews.createdAt': { $gte: startDate } } },
      { $group: { _id: null, total: { $sum: 1 }, happy: { $sum: { $cond: [{ $gte: ['$reviews.rating', 4] }, 1, 0] } } } }
    ]),
    Order.aggregate([
      { $match: inPeriod },
      { $group: { _id: '$customer.email' } },
      { $lookup: { from: 'orders', localField: '_id', foreignField: 'customer.email', as: 'orders' } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          repeat: {
            $sum: {
              $cond: [{ $gt: [{ $size: { $filter: { input: '$orders', cond: { $ne: ['$$this.status', 'cancelled'] } } } }, 1] }, 1, 0]
            }
          }
        }
      }
    ]),
    Order.aggregate([
      { $match: inPeriod },
      {
        $group: {
          _id: {
            $toLower: {
              $cond: [
                { $gt: [{ $strLenCP: { $ifNull: ['$customer.address.governorate', ''] } }, 0] },
                '$customer.address.governorate',
                '$customer.address.city'
              ]
            }
          }
        }
      }
    ])
  ]);

  const share = (part, total) => (total > 0 ? Math.round((part / total) * 100) : null);
  return {
    customerSatisfaction: share(reviews?.happy, reviews?.total),
    repeatCustomers: share(customers?.repeat, customers?.total),
    coverageAreas: areas.filter(area => area._id).length
  };
};

// GET /api/orders/stats - Get order statistics for tracking dashboard
router.get('/stats', ordersAdmin, async (req, res) => {
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
    // No delivered orders yet: nothing to measure (shown as "—")
    const avgDeliveryTime = deliveryData.totalDelivered > 0 ? Math.round(deliveryData.avgDeliveryTime) : null;
    const onTimeDelivery = deliveryData.totalDelivered > 0
      ? Math.round((deliveryData.onTimeCount / deliveryData.totalDelivered) * 100)
      : 0;
    const deliveryRate = totalOrders > 0 ? Math.round((delivered / totalOrders) * 100) : 0;

    const orderGrowth = previousPeriodOrders > 0
      ? Math.round(((totalOrders - previousPeriodOrders) / previousPeriodOrders) * 100)
      : 0;

    const { customerSatisfaction, repeatCustomers, coverageAreas } = await performanceMetrics(startDate);

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

// GET /api/orders/:id - Get single order (Admin only)
router.get('/:id', ordersAdmin, async (req, res) => {
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

// GET /api/orders/number/:orderNumber - Get order by order number (Admin only)
router.get('/number/:orderNumber', ordersAdmin, async (req, res) => {
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
router.post('/admin', ordersAdmin, [
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
  body('shippingCost').optional().isFloat({ min: 0 }).withMessage('Shipping cost must be non-negative').toFloat(),
  body('notes').optional().trim().isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters'),
  body('status').optional().isIn(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { customer, items, shippingCost = 0, notes, status = 'pending' } = req.body;

    const { orderItems, subtotal } = await priceOrderItems(items);

    const taxRate = 0.19; // 19% VAT in Tunisia
    const taxAmount = subtotal * taxRate;
    const totalAmount = subtotal + shippingCost + taxAmount;

    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Check if customer exists
    let existingCustomer = null;
    try {
      existingCustomer = await Customer.findOne({ email: customer.email });
    } catch {
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

    const takesStock = status !== 'cancelled';
    if (takesStock) {
      await reserveStock(orderItems);
      order.stockReserved = true;
    }
    try {
      await order.save();
    } catch (error) {
      if (takesStock) {
        await releaseStock(orderItems);
      }
      throw error;
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
    if (error instanceof CheckoutError) {
      return res.status(error.status).json({ message: error.message });
    }
    console.error('Error creating admin order:', error);
    res.status(500).json({ message: 'Error creating order' });
  }
});

// PUT /api/orders/:id/status - Update order status (Admin only)
router.put('/:id/status', ordersAdmin, [
  body('status').isIn(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']).withMessage('Invalid status'),
  body('trackingNumber').optional().trim().isLength({ max: 100 }),
  body('note').optional().trim().isLength({ max: 200 }).withMessage('Note cannot exceed 200 characters'),
  body('location').optional().trim().isLength({ max: 100 }).withMessage('Location cannot exceed 100 characters'),
  body('sendNotification').optional().isBoolean().toBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { status, trackingNumber, note, location, sendNotification = true } = req.body;

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const previousStatus = order.status;
    const statusChanged = previousStatus !== status;
    const updatedBy = req.admin?.username || 'admin';

    // Reactivating a cancelled order needs its stock back first
    if (previousStatus === 'cancelled' && status !== 'cancelled') {
      await reserveOrderStock(order);
    }

    // Saved (not updated in place) so the change is added to the order's
    // history, which the customer's tracking page shows, and the delivery
    // date is set
    order.status = status;
    if (trackingNumber) order.trackingNumber = trackingNumber;
    order.$locals.statusUpdate = { note, location, updatedBy };
    await order.save();

    if (status === 'cancelled' && previousStatus !== 'cancelled') {
      await releaseOrderStock(order);
    }

    // A note or place without a new status is its own tracking event
    if (!statusChanged && (note || location)) {
      await order.addTrackingEvent(status, note, location, updatedBy);
    }

    // In the background: slow email or SMS providers must not hold up the
    // admin. Failures are logged by the services.
    const notifyCustomer = sendNotification && statusChanged;
    if (notifyCustomer) {
      require('../services/notificationService')
        .notifyOrderStatusChange(order, previousStatus, { note })
        .catch(error => console.error(`Status notification failed for order ${order.orderNumber}:`, error));
    }

    await order.populate('items.product', '-reviews');
    res.json({
      order,
      message: 'Order status updated successfully',
      customerNotified: notifyCustomer
    });
  } catch (error) {
    if (error instanceof CheckoutError) {
      return res.status(error.status).json({ message: error.message });
    }
    console.error('Error updating order status:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid order ID' });
    }
    res.status(500).json({ message: 'Error updating order status' });
  }
});

// POST /api/orders/:id/notes - Add internal note to order (Admin only)
router.post('/:id/notes', ordersAdmin, [
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
router.get('/:id/timeline', ordersAdmin, async (req, res) => {
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
router.get('/stats/summary', ordersAdmin, async (req, res) => {
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


// DELETE /api/orders/:id - Delete order (Admin only)
router.delete('/:id', ordersAdmin, async (req, res) => {
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
    await releaseOrderStock(order);

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


module.exports = router;
