const Product = require('../models/Product');
const Order = require('../models/Order');
const { getSettings } = require('./settingsService');
const { categoryNames } = require('./categoryService');
const { roundMillimes } = require('../utils/checkout');

// The home page's selling parts, built from Admin → Settings → Home page:
// the chosen products with their current price and stock, the packs and what
// they save, the orders by governorate and the best reviews. Products that
// were deleted since they were chosen are left out.

const CARD_FIELDS = 'name price image category inStock stockQuantity ratingStats';

const card = (product, names) => ({
  _id: String(product._id),
  name: product.name,
  price: product.price,
  image: product.image,
  category: product.category,
  categoryName: names.get(product.category) || product.category,
  inStock: product.inStock !== false && (product.stockQuantity ?? 0) > 0,
  stockQuantity: product.stockQuantity,
  ratingStats: product.ratingStats
});

const idsIn = (showcase) => [
  ...Object.values(showcase.hotspots),
  ...Object.values(showcase.problems).flat(),
  ...showcase.sizes.flatMap(size => [size.pump, size.filter]),
  showcase.lights,
  ...showcase.options,
  ...showcase.packs.flatMap(pack => [pack.product, ...(pack.includes || [])])
].filter(Boolean).map(String);

const sum = (cards) => roundMillimes(cards.reduce((total, c) => total + c.price, 0));

// Orders (not cancelled) by the governorate they were delivered to
const ordersByGovernorate = async () => {
  const rows = await Order.aggregate([
    { $match: { status: { $ne: 'cancelled' }, 'customer.address.governorate': { $nin: [null, ''] } } },
    { $group: { _id: { $toLower: { $trim: { input: '$customer.address.governorate' } } }, count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
  return rows.map(row => ({ governorate: row._id, count: row.count }));
};

// Reviews rated 4 or 5 with something to say, newest first
const bestReviews = async (limit = 3) => {
  const rows = await Product.aggregate([
    { $unwind: '$reviews' },
    { $match: { 'reviews.rating': { $gte: 4 }, 'reviews.comment': { $regex: /\S.{15,}/ } } },
    { $sort: { 'reviews.createdAt': -1 } },
    { $limit: limit },
    { $lookup: { from: 'customers', localField: 'reviews.customer', foreignField: '_id', as: 'author' } },
    {
      $project: {
        _id: '$reviews._id',
        rating: '$reviews.rating',
        title: '$reviews.title',
        comment: '$reviews.comment',
        verified: '$reviews.verified',
        productId: '$_id',
        productName: '$name',
        firstName: { $first: '$author.firstName' },
        lastName: { $first: '$author.lastName' }
      }
    }
  ]);
  // "Sami B." rather than the full name
  return rows.map(({ firstName, lastName, productId, ...review }) => ({
    ...review,
    productId: String(productId),
    author: [firstName, lastName ? `${lastName.trim()[0]}.` : ''].filter(Boolean).join(' ') || 'Client STES'
  }));
};

const getShowcase = async () => {
  const { showcase } = await getSettings();
  const [products, names, governorates, reviews] = await Promise.all([
    Product.find({ _id: { $in: idsIn(showcase) } }).select(CARD_FIELDS).lean(),
    categoryNames(),
    showcase.showMap ? ordersByGovernorate() : null,
    bestReviews()
  ]);
  const byId = new Map(products.map(p => [String(p._id), card(p, names)]));
  const one = (id) => (id ? byId.get(String(id)) || null : null);
  const many = (ids = []) => ids.map(one).filter(Boolean);

  const problems = Object.fromEntries(Object.entries(showcase.problems).map(([key, ids]) => {
    const list = many(ids);
    return [key, { products: list, total: sum(list) }];
  }));

  const packs = showcase.packs
    .map(pack => {
      const product = one(pack.product);
      if (!product) return null;
      const includes = many(pack.includes);
      const worth = sum(includes);
      return { product, season: pack.season || '', includes, worth, saving: Math.max(0, roundMillimes(worth - product.price)) };
    })
    .filter(Boolean);

  return {
    hotspots: Object.fromEntries(Object.entries(showcase.hotspots).map(([key, id]) => [key, one(id)])),
    problems,
    configurator: {
      sizes: showcase.sizes
        .map(size => ({ label: size.label, pump: one(size.pump), filter: one(size.filter) }))
        .filter(size => size.pump || size.filter),
      lights: one(showcase.lights),
      options: many(showcase.options)
    },
    packs,
    map: governorates && {
      governorates,
      orders: governorates.reduce((total, row) => total + row.count, 0)
    },
    reviews,
    partnerBadge: showcase.partnerBadge || ''
  };
};

module.exports = { getShowcase };
