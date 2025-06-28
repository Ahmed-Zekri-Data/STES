const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const Order = require('../models/Order');
const { customerAuth, optionalCustomerAuth } = require('../middleware/customerAuth');

// GET /api/tracking/:identifier - Public order tracking (by order number or tracking code)
router.get('/:identifier', [
  param('identifier').isLength({ min: 1 }).withMessage('Order identifier is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { identifier } = req.params;
    let order;

    // Try to find by tracking code first, then by order number
    if (identifier.startsWith('TRK-')) {
      order = await Order.findByTrackingCode(identifier);
    } else if (identifier.startsWith('ORD-')) {
      order = await Order.findByOrderNumber(identifier);
    } else {
      // Try both if format is unclear
      order = await Order.findByTrackingCode(identifier) ||
              await Order.findByOrderNumber(identifier);
    }

    if (!order) {
      return res.status(404).json({ 
        message: 'Commande non trouvée. Vérifiez votre numéro de commande ou code de suivi.' 
      });
    }

    // Get tracking timeline
    const timeline = order.getTrackingTimeline();

    // Calculate delivery progress
    const completedSteps = timeline.filter(step => step.completed).length;
    const totalSteps = timeline.length;
    const progressPercentage = Math.round((completedSteps / totalSteps) * 100);

    // Determine if order is delayed
    const isDelayed = order.estimatedDelivery && 
                     new Date() > order.estimatedDelivery && 
                     !['delivered', 'cancelled'].includes(order.status);

    res.json({
      order: {
        orderNumber: order.orderNumber,
        trackingCode: order.trackingCode,
        status: order.status,
        statusLabel: order.getStatusLabel(order.status),
        createdAt: order.createdAt,
        estimatedDelivery: order.estimatedDelivery,
        actualDelivery: order.actualDelivery,
        isUrgent: order.isUrgent,
        isDelayed,
        progressPercentage,
        totalAmount: order.totalAmount,
        totalItems: order.totalItems,
        shippingProvider: order.shippingProvider,
        deliveryInstructions: order.deliveryInstructions,
        customer: {
          name: order.customer.name,
          city: order.customer.address.city,
          // Don't expose full address for privacy
        },
        items: order.items.map(item => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          image: item.image,
          product: item.product ? {
            name: item.product.name,
            images: item.product.images,
            category: item.product.category
          } : null
        }))
      },
      timeline,
      tracking: {
        lastUpdate: order.statusHistory[order.statusHistory.length - 1],
        totalEvents: order.statusHistory.length,
        history: order.statusHistory.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      }
    });
  } catch (error) {
    console.error('Error tracking order:', error);
    res.status(500).json({ message: 'Erreur lors du suivi de la commande' });
  }
});

// POST /api/tracking/search - Search orders by email (for guest users)
router.post('/search', [
  body('email').isEmail().normalizeEmail().withMessage('Email valide requis'),
  body('orderNumber').optional().isLength({ min: 1 }).withMessage('Numéro de commande invalide')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, orderNumber } = req.body;
    let query = { 'customer.email': email };

    if (orderNumber) {
      query.orderNumber = orderNumber;
    }

    const orders = await Order.find(query)
      .select('orderNumber trackingCode status createdAt estimatedDelivery totalAmount')
      .sort({ createdAt: -1 })
      .limit(10);

    if (orders.length === 0) {
      return res.status(404).json({ 
        message: 'Aucune commande trouvée pour cette adresse email.' 
      });
    }

    const ordersWithStatus = orders.map(order => ({
      orderNumber: order.orderNumber,
      trackingCode: order.trackingCode,
      status: order.status,
      statusLabel: order.getStatusLabel(order.status),
      createdAt: order.createdAt,
      estimatedDelivery: order.estimatedDelivery,
      totalAmount: order.totalAmount,
      isDelayed: order.estimatedDelivery && 
                new Date() > order.estimatedDelivery && 
                !['delivered', 'cancelled'].includes(order.status)
    }));

    res.json({
      orders: ordersWithStatus,
      total: orders.length
    });
  } catch (error) {
    console.error('Error searching orders:', error);
    res.status(500).json({ message: 'Erreur lors de la recherche de commandes' });
  }
});

// GET /api/tracking/customer/orders - Get customer's orders with tracking info (authenticated)
router.get('/customer/orders', customerAuth, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const skip = (page - 1) * limit;

    let query = { customerId: req.customer.customerId };
    if (status && status !== 'all') {
      query.status = status;
    }

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('items.product', 'name images category');

    const totalOrders = await Order.countDocuments(query);

    const ordersWithTracking = orders.map(order => {
      const timeline = order.getTrackingTimeline();
      const completedSteps = timeline.filter(step => step.completed).length;
      const progressPercentage = Math.round((completedSteps / timeline.length) * 100);
      
      return {
        id: order._id,
        orderNumber: order.orderNumber,
        trackingCode: order.trackingCode,
        status: order.status,
        statusLabel: order.getStatusLabel(order.status),
        createdAt: order.createdAt,
        estimatedDelivery: order.estimatedDelivery,
        actualDelivery: order.actualDelivery,
        totalAmount: order.totalAmount,
        totalItems: order.totalItems,
        isUrgent: order.isUrgent,
        progressPercentage,
        isDelayed: order.estimatedDelivery && 
                  new Date() > order.estimatedDelivery && 
                  !['delivered', 'cancelled'].includes(order.status),
        lastUpdate: order.statusHistory[order.statusHistory.length - 1],
        items: order.items
      };
    });

    res.json({
      orders: ordersWithTracking,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalOrders / limit),
        totalOrders,
        hasNextPage: page < Math.ceil(totalOrders / limit),
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching customer orders with tracking:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des commandes' });
  }
});

// GET /api/tracking/customer/stats - Get customer tracking statistics
router.get('/customer/stats', customerAuth, async (req, res) => {
  try {
    const customerId = req.customer.customerId;

    const stats = await Order.aggregate([
      { $match: { customerId: new mongoose.Types.ObjectId(customerId) } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' }
        }
      }
    ]);

    // Get delivery performance
    const deliveredOrders = await Order.find({
      customerId,
      status: 'delivered',
      actualDelivery: { $exists: true },
      estimatedDelivery: { $exists: true }
    });

    let onTimeDeliveries = 0;
    let totalDelivered = deliveredOrders.length;

    deliveredOrders.forEach(order => {
      if (order.actualDelivery <= order.estimatedDelivery) {
        onTimeDeliveries++;
      }
    });

    const onTimePercentage = totalDelivered > 0 ? 
      Math.round((onTimeDeliveries / totalDelivered) * 100) : 0;

    // Get current active orders
    const activeOrders = await Order.countDocuments({
      customerId,
      status: { $in: ['pending', 'confirmed', 'processing', 'shipped'] }
    });

    res.json({
      statusBreakdown: stats.reduce((acc, item) => {
        acc[item._id] = {
          count: item.count,
          totalAmount: item.totalAmount
        };
        return acc;
      }, {}),
      deliveryPerformance: {
        totalDelivered,
        onTimeDeliveries,
        onTimePercentage
      },
      activeOrders,
      totalOrders: stats.reduce((sum, item) => sum + item.count, 0)
    });
  } catch (error) {
    console.error('Error fetching customer tracking stats:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des statistiques' });
  }
});

// POST /api/tracking/:orderId/subscribe - Subscribe to order updates (authenticated)
router.post('/:orderId/subscribe', customerAuth, [
  param('orderId').isMongoId().withMessage('ID de commande invalide'),
  body('notifications').isObject().withMessage('Paramètres de notification requis'),
  body('notifications.email').optional().isBoolean(),
  body('notifications.sms').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { orderId } = req.params;
    const { notifications } = req.body;

    const order = await Order.findOne({
      _id: orderId,
      customerId: req.customer.customerId
    });

    if (!order) {
      return res.status(404).json({ message: 'Commande non trouvée' });
    }

    // Here you would typically save notification preferences
    // For now, we'll just return success
    res.json({
      message: 'Abonnement aux notifications configuré avec succès',
      notifications
    });
  } catch (error) {
    console.error('Error subscribing to order updates:', error);
    res.status(500).json({ message: 'Erreur lors de la configuration des notifications' });
  }
});

module.exports = router;
