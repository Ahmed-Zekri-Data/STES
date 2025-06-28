const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Customer = require('../models/Customer');
const { customerAuth } = require('../middleware/customerAuth');

// GET /api/customer-orders - Get customer's orders
router.get('/', customerAuth, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const skip = (page - 1) * limit;

    // Build query
    let query = { customerId: req.customer.customerId };
    if (status && status !== 'all') {
      query.status = status;
    }

    // Get orders with pagination
    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('items.product', 'name images category');

    // Get total count for pagination
    const totalOrders = await Order.countDocuments(query);
    const totalPages = Math.ceil(totalOrders / limit);

    res.json({
      orders,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalOrders,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching customer orders:', error);
    res.status(500).json({ message: 'Error fetching orders' });
  }
});

// GET /api/customer-orders/stats - Get customer order statistics
router.get('/stats', customerAuth, async (req, res) => {
  try {
    const stats = await Order.getCustomerStats(req.customer.customerId);
    
    // Get status breakdown
    const statusBreakdown = await Order.aggregate([
      { $match: { customerId: req.customer.customerId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get recent orders
    const recentOrders = await Order.getByCustomer(req.customer.customerId, 5);

    res.json({
      stats: {
        ...stats,
        statusBreakdown: statusBreakdown.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {})
      },
      recentOrders
    });
  } catch (error) {
    console.error('Error fetching customer order stats:', error);
    res.status(500).json({ message: 'Error fetching order statistics' });
  }
});

// GET /api/customer-orders/:orderId - Get specific order details
router.get('/:orderId', customerAuth, async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findOne({
      _id: orderId,
      customerId: req.customer.customerId
    }).populate('items.product', 'name images category description');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json({ order });
  } catch (error) {
    console.error('Error fetching order details:', error);
    res.status(500).json({ message: 'Error fetching order details' });
  }
});

// POST /api/customer-orders/:orderId/cancel - Cancel an order
router.post('/:orderId/cancel', customerAuth, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;

    const order = await Order.findOne({
      _id: orderId,
      customerId: req.customer.customerId
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if order can be cancelled
    if (!['pending', 'confirmed'].includes(order.status)) {
      return res.status(400).json({ 
        message: 'Order cannot be cancelled at this stage' 
      });
    }

    // Update order status
    order.status = 'cancelled';
    if (reason) {
      order.notes = order.notes ? `${order.notes}\nCancellation reason: ${reason}` : `Cancellation reason: ${reason}`;
    }
    await order.save();

    res.json({
      message: 'Order cancelled successfully',
      order
    });
  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).json({ message: 'Error cancelling order' });
  }
});

// POST /api/customer-orders - Create new order (for authenticated customers)
router.post('/', customerAuth, async (req, res) => {
  try {
    const { items, shippingAddress, paymentMethod, notes } = req.body;

    // Get customer details
    const customer = await Customer.findById(req.customer.customerId);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    // Calculate total
    let totalAmount = 0;
    const orderItems = items.map(item => {
      const itemTotal = item.price * item.quantity;
      totalAmount += itemTotal;
      return {
        product: item.productId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        image: item.image
      };
    });

    // Create order
    const order = new Order({
      customerId: customer._id,
      customer: {
        name: customer.fullName,
        email: customer.email,
        phone: customer.phone || '',
        address: {
          street: shippingAddress.street,
          city: shippingAddress.city,
          postalCode: shippingAddress.postalCode,
          country: shippingAddress.country || 'Tunisia'
        }
      },
      items: orderItems,
      totalAmount,
      paymentMethod: paymentMethod || 'cash_on_delivery',
      notes
    });

    await order.save();

    // Update customer stats
    customer.orderCount += 1;
    customer.totalSpent += totalAmount;
    customer.loyaltyPoints += Math.floor(totalAmount / 10); // 1 point per 10 TND
    await customer.save();

    res.status(201).json({
      message: 'Order created successfully',
      order,
      loyaltyPointsEarned: Math.floor(totalAmount / 10)
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ message: 'Error creating order' });
  }
});

// GET /api/customer-orders/tracking/:orderNumber - Track order by order number
router.get('/tracking/:orderNumber', customerAuth, async (req, res) => {
  try {
    const { orderNumber } = req.params;

    const order = await Order.findOne({
      orderNumber,
      customerId: req.customer.customerId
    }).populate('items.product', 'name images');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Create tracking timeline
    const timeline = [
      {
        status: 'pending',
        label: 'Commande reçue',
        completed: true,
        date: order.createdAt
      },
      {
        status: 'confirmed',
        label: 'Commande confirmée',
        completed: ['confirmed', 'processing', 'shipped', 'delivered'].includes(order.status),
        date: order.status === 'confirmed' ? order.updatedAt : null
      },
      {
        status: 'processing',
        label: 'En préparation',
        completed: ['processing', 'shipped', 'delivered'].includes(order.status),
        date: order.status === 'processing' ? order.updatedAt : null
      },
      {
        status: 'shipped',
        label: 'Expédiée',
        completed: ['shipped', 'delivered'].includes(order.status),
        date: order.status === 'shipped' ? order.updatedAt : null
      },
      {
        status: 'delivered',
        label: 'Livrée',
        completed: order.status === 'delivered',
        date: order.status === 'delivered' ? order.updatedAt : null
      }
    ];

    res.json({
      order: {
        orderNumber: order.orderNumber,
        status: order.status,
        totalAmount: order.totalAmount,
        items: order.items,
        trackingNumber: order.trackingNumber,
        createdAt: order.createdAt
      },
      timeline
    });
  } catch (error) {
    console.error('Error tracking order:', error);
    res.status(500).json({ message: 'Error tracking order' });
  }
});

module.exports = router;
