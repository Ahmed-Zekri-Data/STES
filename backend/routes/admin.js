const express = require('express');
const router = express.Router();
const { query, validationResult } = require('express-validator');
const { auth, checkPermission, requireSuperAdmin } = require('../middleware/auth');
const Product = require('../models/Product');
const Order = require('../models/Order');
const FormSubmission = require('../models/FormSubmission');
const Admin = require('../models/Admin');
const Customer = require('../models/Customer');
const { containing } = require('../utils/text');

// Products at or below this many units are flagged in the notifications
const LOW_STOCK_THRESHOLD = 5;

const can = (admin, permission) =>
  admin.role === 'super_admin' || admin.permissions.includes(permission);

// GET /api/admin/dashboard - Get dashboard statistics
router.get('/dashboard', auth, async (req, res) => {
  try {
    // Get basic counts
    const [
      totalProducts,
      totalOrders,
      totalSubmissions,
      pendingOrders,
      unreadSubmissions,
      recentOrders,
      recentSubmissions
    ] = await Promise.all([
      Product.countDocuments(),
      Order.countDocuments(),
      FormSubmission.countDocuments(),
      Order.countDocuments({ status: 'pending' }),
      FormSubmission.countDocuments({ status: 'new' }),
      Order.find().sort({ createdAt: -1 }).limit(5).populate('items.product', 'name'),
      FormSubmission.find().sort({ createdAt: -1 }).limit(5)
    ]);

    // Get revenue statistics
    const revenueStats = await Order.aggregate([
      {
        $match: {
          status: { $in: ['delivered', 'shipped'] },
          createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          orderCount: { $sum: 1 }
        }
      }
    ]);

    // Get order status breakdown
    const orderStatusStats = await Order.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get popular products
    const popularProducts = await Order.aggregate([
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          totalSold: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
        }
      },
      { $sort: { totalSold: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' }
    ]);

    res.json({
      overview: {
        totalProducts,
        totalOrders,
        totalSubmissions,
        pendingOrders,
        unreadSubmissions,
        monthlyRevenue: revenueStats[0]?.totalRevenue || 0,
        monthlyOrders: revenueStats[0]?.orderCount || 0
      },
      orderStatusStats,
      popularProducts,
      recentOrders,
      recentSubmissions
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ message: 'Error fetching dashboard data' });
  }
});

// GET /api/admin/notifications - What needs attention: orders waiting to be
// handled and products running out. Each part is only sent to admins with
// the matching permission.
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
      const filter = { stockQuantity: { $lte: LOW_STOCK_THRESHOLD } };
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
        threshold: LOW_STOCK_THRESHOLD,
        items: items.map(product => ({
          id: product._id,
          name: product.name,
          stockQuantity: product.stockQuantity
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

// GET /api/admin/users - Get all admin users (Super Admin only)
router.get('/users', auth, requireSuperAdmin, async (req, res) => {
  try {
    const admins = await Admin.find()
      .select('-password')
      .sort({ createdAt: -1 });

    res.json(admins);
  } catch (error) {
    console.error('Error fetching admin users:', error);
    res.status(500).json({ message: 'Error fetching admin users' });
  }
});

// PUT /api/admin/users/:id/status - Update admin user status (Super Admin only)
router.put('/users/:id/status', auth, requireSuperAdmin, async (req, res) => {
  try {
    const { isActive } = req.body;
    
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ message: 'isActive must be a boolean' });
    }

    // Prevent deactivating self
    if (req.params.id === req.admin.adminId.toString()) {
      return res.status(400).json({ message: 'Cannot deactivate your own account' });
    }

    const admin = await Admin.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { new: true, runValidators: true }
    ).select('-password');

    if (!admin) {
      return res.status(404).json({ message: 'Admin user not found' });
    }

    res.json({
      message: `Admin account ${isActive ? 'activated' : 'deactivated'} successfully`,
      admin
    });
  } catch (error) {
    console.error('Error updating admin status:', error);
    res.status(500).json({ message: 'Error updating admin status' });
  }
});

// DELETE /api/admin/users/:id - Delete admin user (Super Admin only)
router.delete('/users/:id', auth, requireSuperAdmin, async (req, res) => {
  try {
    // Prevent deleting self
    if (req.params.id === req.admin.adminId.toString()) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    const admin = await Admin.findByIdAndDelete(req.params.id);

    if (!admin) {
      return res.status(404).json({ message: 'Admin user not found' });
    }

    res.json({ message: 'Admin account deleted successfully' });
  } catch (error) {
    console.error('Error deleting admin user:', error);
    res.status(500).json({ message: 'Error deleting admin user' });
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
