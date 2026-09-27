const express = require('express');
const router = express.Router();
const { query, validationResult } = require('express-validator');
const { auth, checkPermission } = require('../middleware/auth');
const Product = require('../models/Product');
const Order = require('../models/Order');
const FormSubmission = require('../models/FormSubmission');
const Customer = require('../models/Customer');
const { containing } = require('../utils/text');

const { getSettings } = require('../services/settingsService');

const can = (admin, permission) =>
  admin.role === 'super_admin' || admin.permissions.includes(permission);

const DAY_MS = 24 * 60 * 60 * 1000;
const DASHBOARD_PERIODS = [7, 30, 90, 365];
const IN_PROGRESS = ['confirmed', 'processing', 'shipped'];
// Orders that count as sales: not cancelled and not refunded
const SOLD = { status: { $ne: 'cancelled' }, paymentStatus: { $nin: ['refunded'] } };

const roundMillimes = (amount) => Math.round((amount || 0) * 1000) / 1000;

const salesBetween = async (from, to) => {
  const [totals] = await Order.aggregate([
    { $match: { ...SOLD, createdAt: { $gte: from, $lt: to } } },
    { $group: { _id: null, revenue: { $sum: '$totalAmount' }, orders: { $sum: 1 } } }
  ]);
  return { revenue: roundMillimes(totals?.revenue), orders: totals?.orders || 0 };
};

// Best sellers by units sold in the period, with the revenue from their order lines
const topProductsBetween = async (from, to, limit = 5) => {
  const rows = await Order.aggregate([
    { $match: { ...SOLD, createdAt: { $gte: from, $lt: to } } },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.product',
        name: { $last: '$items.name' },
        quantity: { $sum: '$items.quantity' },
        revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
      }
    },
    { $sort: { quantity: -1, revenue: -1 } },
    { $limit: limit },
    { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'product' } }
  ]);
  return rows.map(row => ({
    id: row._id,
    // The current name if the product still exists, else the name when sold
    name: row.product[0]?.name || row.name,
    image: row.product[0]?.image || null,
    stillInCatalog: row.product.length > 0,
    quantity: row.quantity,
    revenue: roundMillimes(row.revenue)
  }));
};

// GET /api/admin/dashboard?days=30 - Figures for the dashboard over the last
// `days` days, compared with the days before. Each part is only sent to
// admins with the matching permission.
router.get('/dashboard', auth, [
  query('days').optional().isIn(DASHBOARD_PERIODS.map(String)).withMessage(`days must be one of ${DASHBOARD_PERIODS.join(', ')}`)
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const days = Number(req.query.days || 30);
    const to = new Date();
    const from = new Date(to.getTime() - days * DAY_MS);
    const previousFrom = new Date(from.getTime() - days * DAY_MS);
    const result = { period: { days, from, to } };

    if (can(req.admin, 'orders')) {
      const [current, previous, statusCounts, recentOrders, topProducts] = await Promise.all([
        salesBetween(from, to),
        salesBetween(previousFrom, from),
        Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
        Order.find().sort({ createdAt: -1 }).limit(5)
          .select('orderNumber customer.name customer.email totalAmount status createdAt').lean(),
        topProductsBetween(from, to)
      ]);
      const count = (statuses) => statusCounts
        .filter(row => statuses.includes(row._id))
        .reduce((sum, row) => sum + row.count, 0);

      result.sales = {
        ...current,
        averageOrder: current.orders ? roundMillimes(current.revenue / current.orders) : 0,
        previous
      };
      result.orderStatus = {
        pending: count(['pending']),
        inProgress: count(IN_PROGRESS),
        delivered: count(['delivered']),
        cancelled: count(['cancelled'])
      };
      result.recentOrders = recentOrders.map(order => ({
        id: order._id,
        orderNumber: order.orderNumber,
        customerName: order.customer?.name || order.customer?.email || '',
        totalAmount: order.totalAmount,
        status: order.status,
        createdAt: order.createdAt
      }));
      result.topProducts = topProducts;
    }

    if (can(req.admin, 'products')) {
      const { lowStockThreshold } = await getSettings();
      const [total, outOfStock, lowStock] = await Promise.all([
        Product.countDocuments(),
        Product.countDocuments({ stockQuantity: { $lte: 0 } }),
        Product.countDocuments({ stockQuantity: { $gt: 0, $lte: lowStockThreshold } })
      ]);
      result.products = { total, outOfStock, lowStock, lowStockThreshold };
    }

    if (can(req.admin, 'users')) {
      const [total, newInPeriod, previousNew] = await Promise.all([
        Customer.countDocuments(),
        Customer.countDocuments({ createdAt: { $gte: from, $lt: to } }),
        Customer.countDocuments({ createdAt: { $gte: previousFrom, $lt: from } })
      ]);
      result.customers = { total, new: newInPeriod, previousNew };
    }

    res.json(result);
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ message: 'Error loading the dashboard' });
  }
});

// GET /api/admin/notifications - What needs attention: orders waiting to be
// handled, products running out and unread contact or quote requests. Each
// part is only sent to admins with the matching permission.
router.get('/notifications', auth, async (req, res) => {
  try {
    const result = {};

    if (can(req.admin, 'orders')) {
      const filter = { status: 'pending' };
      const [count, latest] = await Promise.all([
        Order.countDocuments(filter),
        Order.find(filter)
          .sort({ createdAt: -1 })
          .limit(5)
          .select('orderNumber customer.name totalAmount createdAt')
          .lean()
      ]);
      result.pendingOrders = {
        count,
        latest: latest.map(order => ({
          id: order._id,
          orderNumber: order.orderNumber,
          customerName: order.customer?.name,
          totalAmount: order.totalAmount,
          createdAt: order.createdAt
        }))
      };
    }

    if (can(req.admin, 'products')) {
      const { lowStockThreshold } = await getSettings();
      const filter = { stockQuantity: { $lte: lowStockThreshold } };
      const [count, items] = await Promise.all([
        Product.countDocuments(filter),
        Product.find(filter)
          .sort({ stockQuantity: 1, name: 1 })
          .limit(5)
          .select('name stockQuantity')
          .lean()
      ]);
      result.lowStock = {
        count,
        threshold: lowStockThreshold,
        items: items.map(product => ({
          id: product._id,
          name: product.name,
          stockQuantity: product.stockQuantity
        }))
      };
    }

    if (can(req.admin, 'forms')) {
      // Newsletter sign-ups need no answer, so they are left out
      const filter = { status: 'new', type: { $in: ['contact', 'quote'] } };
      const [count, latest] = await Promise.all([
        FormSubmission.countDocuments(filter),
        FormSubmission.find(filter)
          .sort({ createdAt: -1 })
          .limit(5)
          .select('type name email subject createdAt')
          .lean()
      ]);
      result.newMessages = {
        count,
        latest: latest.map(message => ({
          id: message._id,
          type: message.type,
          name: message.name,
          email: message.email,
          subject: message.subject,
          createdAt: message.createdAt
        }))
      };
    }

    res.json(result);
  } catch (error) {
    console.error('Error fetching admin notifications:', error);
    res.status(500).json({ message: 'Error fetching notifications' });
  }
});

// GET /api/admin/search?q= - Search orders, products and customers at once
// (up to 5 of each). Each part is only searched for admins with the
// matching permission.
router.get('/search', auth, [
  query('q').isString().trim().isLength({ min: 2, max: 100 }).withMessage('Search must be 2 to 100 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const text = containing(req.query.q);
    const searches = {};

    if (can(req.admin, 'orders')) {
      searches.orders = Order.find({
        $or: [
          { orderNumber: text },
          { trackingCode: text },
          { 'customer.name': text },
          { 'customer.email': text },
          { 'customer.phone': text }
        ]
      })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('orderNumber customer.name customer.email status totalAmount createdAt')
        .lean()
        .then(orders => orders.map(order => ({
          id: order._id,
          orderNumber: order.orderNumber,
          customerName: order.customer?.name,
          customerEmail: order.customer?.email,
          status: order.status,
          totalAmount: order.totalAmount,
          createdAt: order.createdAt
        })));
    }

    if (can(req.admin, 'products')) {
      searches.products = Product.find({
        $or: [{ name: text }, { brand: text }, { sku: text }]
      })
        .sort({ name: 1 })
        .limit(5)
        .select('name brand price stockQuantity')
        .lean()
        .then(products => products.map(product => ({
          id: product._id,
          name: product.name,
          brand: product.brand,
          price: product.price,
          stockQuantity: product.stockQuantity
        })));
    }

    if (can(req.admin, 'users')) {
      searches.customers = Customer.find({
        $or: [
          { firstName: text },
          { lastName: text },
          { email: text },
          { phone: text },
          // Full names such as "Ahmed Ben Ali"
          { $expr: { $regexMatch: { input: { $concat: ['$firstName', ' ', '$lastName'] }, regex: text } } }
        ]
      })
        .sort({ lastName: 1, firstName: 1 })
        .limit(5)
        .select('firstName lastName email phone')
        .lean()
        .then(customers => customers.map(customer => ({
          id: customer._id,
          name: `${customer.firstName} ${customer.lastName}`,
          email: customer.email,
          phone: customer.phone
        })));
    }

    const names = Object.keys(searches);
    const found = await Promise.all(Object.values(searches));
    res.json(Object.fromEntries(names.map((name, i) => [name, found[i]])));
  } catch (error) {
    console.error('Error searching admin data:', error);
    res.status(500).json({ message: 'Error searching' });
  }
});

// GET /api/admin/analytics - Get detailed analytics
router.get('/analytics', auth, async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period);
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Daily sales data
    const dailySales = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          status: { $in: ['delivered', 'shipped'] }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          revenue: { $sum: '$totalAmount' },
          orders: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    // Category performance
    const categoryStats = await Order.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      {
        $group: {
          _id: '$product.category',
          revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
          quantity: { $sum: '$items.quantity' }
        }
      }
    ]);

    // Customer locations
    const locationStats = await Order.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: '$customer.address.city',
          orders: { $sum: 1 },
          revenue: { $sum: '$totalAmount' }
        }
      },
      { $sort: { orders: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      dailySales,
      categoryStats,
      locationStats,
      period: days
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ message: 'Error fetching analytics data' });
  }
});

// GET /api/admin/export/orders - Export orders data
router.get('/export/orders', auth, checkPermission('orders'), async (req, res) => {
  try {
    const { startDate, endDate, status } = req.query;
    
    const filter = {};
    if (startDate && endDate) {
      filter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    if (status) filter.status = status;

    const orders = await Order.find(filter)
      .populate('items.product', 'name category')
      .sort({ createdAt: -1 })
      .lean();

    // Transform data for export
    const exportData = orders.map(order => ({
      orderNumber: order.orderNumber,
      customerName: order.customer.name,
      customerEmail: order.customer.email,
      customerPhone: order.customer.phone,
      city: order.customer.address.city,
      totalAmount: order.totalAmount,
      status: order.status,
      paymentMethod: order.paymentMethod,
      createdAt: order.createdAt,
      itemsCount: order.items.length,
      items: order.items.map(item => `${item.name} (x${item.quantity})`).join('; ')
    }));

    res.json(exportData);
  } catch (error) {
    console.error('Error exporting orders:', error);
    res.status(500).json({ message: 'Error exporting orders data' });
  }
});

// GET /api/admin/export/products - Export products data
router.get('/export/products', auth, checkPermission('products'), async (req, res) => {
  try {
    const products = await Product.find()
      .sort({ createdAt: -1 })
      .lean();

    const exportData = products.map(product => ({
      name: product.name,
      category: product.category,
      price: product.price,
      stockQuantity: product.stockQuantity,
      inStock: product.inStock,
      featured: product.featured,
      createdAt: product.createdAt
    }));

    res.json(exportData);
  } catch (error) {
    console.error('Error exporting products:', error);
    res.status(500).json({ message: 'Error exporting products data' });
  }
});

module.exports = router;
