const express = require('express');
const router = express.Router();
const { query, validationResult } = require('express-validator');
const Order = require('../models/Order');
const { auth, checkPermission } = require('../middleware/auth');
const { categoryNames } = require('../services/categoryService');

// Reports are about orders: admins who manage orders can see them
router.use(auth, checkPermission('orders'));

// Tunisia is UTC+1 all year (no daylight saving): days start at 00:00 there
const TIMEZONE = 'Africa/Tunis';
const UTC_OFFSET = '+01:00';
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_DAYS = 731;
const MAX_EXPORT_ROWS = 10000;

// Orders that count as sales, as on the dashboard: not cancelled, not refunded
const SOLD = { status: { $ne: 'cancelled' }, paymentStatus: { $nin: ['refunded'] } };

const roundMillimes = (amount) => Math.round((amount || 0) * 1000) / 1000;
const isoDay = (date) => new Date(date.getTime() + DAY_MS / 24).toISOString().slice(0, 10);

// ?from=2026-09-01&to=2026-09-30 → [from 00:00, the day after `to` 00:00), Tunis time
const rangeRules = [
  query('from').isISO8601({ strict: true }).withMessage('from must be a date (YYYY-MM-DD)'),
  query('to').isISO8601({ strict: true }).withMessage('to must be a date (YYYY-MM-DD)')
];

const readRange = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ message: errors.array()[0].msg });
    return null;
  }
  const from = new Date(`${req.query.from.slice(0, 10)}T00:00:00${UTC_OFFSET}`);
  const to = new Date(new Date(`${req.query.to.slice(0, 10)}T00:00:00${UTC_OFFSET}`).getTime() + DAY_MS);
  const days = Math.round((to - from) / DAY_MS);
  if (days < 1) {
    res.status(400).json({ message: 'to must be on or after from' });
    return null;
  }
  if (days > MAX_DAYS) {
    res.status(400).json({ message: 'The period cannot be longer than two years' });
    return null;
  }
  return { from, to, days };
};

// Day buckets up to two months, weeks up to about six months, then months
const autoGroup = (days) => (days <= 62 ? 'day' : days <= 190 ? 'week' : 'month');

const totalsBetween = async (from, to) => {
  const [totals] = await Order.aggregate([
    { $match: { ...SOLD, createdAt: { $gte: from, $lt: to } } },
    {
      $group: {
        _id: null,
        revenue: { $sum: '$totalAmount' },
        orders: { $sum: 1 },
        delivery: { $sum: { $ifNull: ['$pricing.shippingCost', 0] } },
        itemsSold: { $sum: { $sum: '$items.quantity' } }
      }
    }
  ]);
  const cancelled = await Order.countDocuments({ status: 'cancelled', createdAt: { $gte: from, $lt: to } });
  const orders = totals?.orders || 0;
  return {
    revenue: roundMillimes(totals?.revenue),
    orders,
    averageOrder: orders ? roundMillimes(totals.revenue / orders) : 0,
    itemsSold: totals?.itemsSold || 0,
    delivery: roundMillimes(totals?.delivery),
    cancelled
  };
};

// Revenue and orders per day, week (from Monday) or month, with empty
// periods included so the chart has no gaps
const salesSeries = async (from, to, group) => {
  const rows = await Order.aggregate([
    { $match: { ...SOLD, createdAt: { $gte: from, $lt: to } } },
    {
      $group: {
        _id: {
          $dateToString: {
            format: '%Y-%m-%d',
            timezone: TIMEZONE,
            date: { $dateTrunc: { date: '$createdAt', unit: group, timezone: TIMEZONE, startOfWeek: 'monday' } }
          }
        },
        revenue: { $sum: '$totalAmount' },
        orders: { $sum: 1 }
      }
    }
  ]);
  const found = new Map(rows.map(row => [row._id, row]));

  const series = [];
  const cursor = new Date(`${isoDay(from)}T00:00:00Z`);
  if (group === 'week') cursor.setUTCDate(cursor.getUTCDate() - ((cursor.getUTCDay() + 6) % 7));
  if (group === 'month') cursor.setUTCDate(1);
  const end = new Date(`${isoDay(new Date(to.getTime() - 1))}T00:00:00Z`);
  while (cursor <= end) {
    const key = cursor.toISOString().slice(0, 10);
    series.push({ period: key, revenue: roundMillimes(found.get(key)?.revenue), orders: found.get(key)?.orders || 0 });
    if (group === 'day') cursor.setUTCDate(cursor.getUTCDate() + 1);
    else if (group === 'week') cursor.setUTCDate(cursor.getUTCDate() + 7);
    else cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return series;
};

// Order lines grouped by product (current name and category when the
// product still exists)
const productLines = (from, to) => Order.aggregate([
  { $match: { ...SOLD, createdAt: { $gte: from, $lt: to } } },
  { $unwind: '$items' },
  {
    $group: {
      _id: '$items.product',
      name: { $last: '$items.name' },
      quantity: { $sum: '$items.quantity' },
      revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
      orders: { $sum: 1 }
    }
  },
  { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'product' } },
  {
    $project: {
      name: { $ifNull: [{ $arrayElemAt: ['$product.name', 0] }, '$name'] },
      category: { $arrayElemAt: ['$product.category', 0] },
      quantity: 1,
      revenue: 1,
      orders: 1
    }
  }
]);

const groupedBy = (field, from, to) => Order.aggregate([
  { $match: { ...SOLD, createdAt: { $gte: from, $lt: to } } },
  { $group: { _id: field, orders: { $sum: 1 }, revenue: { $sum: '$totalAmount' } } },
  { $sort: { revenue: -1 } }
]);

const byRevenue = (a, b) => b.revenue - a.revenue;

// GET /api/admin/reports/sales?from=YYYY-MM-DD&to=YYYY-MM-DD[&group=day|week|month]
router.get('/sales', [
  ...rangeRules,
  query('group').optional().isIn(['day', 'week', 'month'])
], async (req, res) => {
  try {
    const range = readRange(req, res);
    if (!range) return;
    const { from, to, days } = range;
    const group = req.query.group || autoGroup(days);
    const previousFrom = new Date(from.getTime() - days * DAY_MS);

    const [totals, previous, series, products, governorates, payments, names] = await Promise.all([
      totalsBetween(from, to),
      totalsBetween(previousFrom, from),
      salesSeries(from, to, group),
      productLines(from, to),
      groupedBy({
        $cond: [
          { $gt: [{ $strLenCP: { $ifNull: ['$customer.address.governorate', ''] } }, 0] },
          '$customer.address.governorate',
          { $ifNull: ['$customer.address.city', ''] }
        ]
      }, from, to),
      groupedBy('$paymentMethod', from, to),
      categoryNames()
    ]);

    const categories = new Map();
    for (const line of products) {
      const slug = line.category || null;
      const entry = categories.get(slug) || { category: slug, name: slug ? names.get(slug) || slug : 'Deleted products', quantity: 0, revenue: 0 };
      entry.quantity += line.quantity;
      entry.revenue += line.revenue;
      categories.set(slug, entry);
    }

    res.json({
      period: { from: isoDay(from), to: isoDay(new Date(to.getTime() - 1)), days, group },
      totals,
      previous: {
        from: isoDay(previousFrom),
        to: isoDay(new Date(from.getTime() - 1)),
        ...previous
      },
      series,
      categories: [...categories.values()]
        .map(entry => ({ ...entry, revenue: roundMillimes(entry.revenue) }))
        .sort(byRevenue),
      products: products
        .map(line => ({ id: line._id, name: line.name, quantity: line.quantity, orders: line.orders, revenue: roundMillimes(line.revenue) }))
        .sort((a, b) => byRevenue(a, b) || b.quantity - a.quantity)
        .slice(0, 10),
      governorates: governorates.map(row => ({ name: row._id || 'Unknown', orders: row.orders, revenue: roundMillimes(row.revenue) })),
      paymentMethods: payments.map(row => ({ method: row._id, orders: row.orders, revenue: roundMillimes(row.revenue) }))
    });
  } catch (error) {
    console.error('Error building sales report:', error);
    res.status(500).json({ message: 'Error building the sales report' });
  }
});

// GET /api/admin/reports/orders?from=YYYY-MM-DD&to=YYYY-MM-DD - Every order
// of the period (cancelled ones too), one row each, for the CSV export
router.get('/orders', rangeRules, async (req, res) => {
  try {
    const range = readRange(req, res);
    if (!range) return;

    const orders = await Order.find({ createdAt: { $gte: range.from, $lt: range.to } })
      .sort({ createdAt: 1 })
      .limit(MAX_EXPORT_ROWS + 1)
      .select('orderNumber createdAt status paymentMethod paymentStatus customer items pricing totalAmount')
      .lean();

    res.json({
      truncated: orders.length > MAX_EXPORT_ROWS,
      orders: orders.slice(0, MAX_EXPORT_ROWS).map(order => ({
        orderNumber: order.orderNumber,
        createdAt: order.createdAt,
        status: order.status,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        customerName: order.customer?.name,
        email: order.customer?.email,
        phone: order.customer?.phone,
        city: order.customer?.address?.city,
        governorate: order.customer?.address?.governorate,
        items: order.items.map(item => `${item.name} x${item.quantity}`).join('; '),
        itemsCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
        subtotal: order.pricing?.subtotal,
        delivery: order.pricing?.shippingCost,
        total: order.totalAmount
      }))
    });
  } catch (error) {
    console.error('Error exporting orders:', error);
    res.status(500).json({ message: 'Error exporting orders' });
  }
});

module.exports = router;
