const mongoose = require('mongoose');
const Product = require('../models/Product');
const Order = require('../models/Order');

// An error whose message is safe to show the client, with the HTTP status to use.
class CheckoutError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Builds order lines from the catalog. Only product IDs and quantities are
// taken from the request; names, images and prices come from the database.
const priceOrderItems = async (requestedItems) => {
  if (!Array.isArray(requestedItems) || requestedItems.length === 0) {
    throw new CheckoutError(400, 'At least one item is required');
  }

  // Merge repeated lines for the same product so stock is checked on the total.
  const quantities = new Map();
  for (const item of requestedItems) {
    const productId = String(item.product || item.productId || '');
    if (!mongoose.isObjectIdOrHexString(productId)) {
      throw new CheckoutError(400, 'Each item needs a valid product ID');
    }

    const quantity = Number(item.quantity);
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new CheckoutError(400, 'Quantity must be a whole number of at least 1');
    }

    quantities.set(productId, (quantities.get(productId) || 0) + quantity);
  }

  const products = await Product.find({ _id: { $in: [...quantities.keys()] } });

  let subtotal = 0;
  const orderItems = [...quantities].map(([productId, quantity]) => {
    const product = products.find(p => p._id.toString() === productId);
    if (!product) {
      throw new CheckoutError(400, `Product ${productId} not found`);
    }

    if (!product.inStock || product.stockQuantity < quantity) {
      throw new CheckoutError(409, `Insufficient stock for product: ${product.name}`);
    }

    subtotal += product.price * quantity;

    return {
      product: product._id,
      name: product.name,
      price: product.price,
      quantity,
      image: product.image
    };
  });

  return { orderItems, subtotal };
};

const TAX_RATE = 0.19; // 19% VAT in Tunisia
const CASH_ON_DELIVERY_FEE = 5;
const FREE_DELIVERY_OVER = 200; // TND, advertised on the cart page
const BASE_DELIVERY_COST = 7;

// Delivery cost factor per governorate (keys without accents)
const GOVERNORATE_RATES = {
  'tunis': 1, 'ariana': 1, 'ben arous': 1, 'manouba': 1,
  'sousse': 1.1, 'monastir': 1.1, 'nabeul': 1.1,
  'sfax': 1.2, 'bizerte': 1.2, 'mahdia': 1.2,
  'kairouan': 1.3, 'zaghouan': 1.3,
  'gabes': 1.4, 'beja': 1.4, 'siliana': 1.4, 'sidi bouzid': 1.4,
  'gafsa': 1.5, 'medenine': 1.5, 'jendouba': 1.5, 'kef': 1.5,
  'kasserine': 1.6, 'tozeur': 1.6, 'kebili': 1.6,
  'tataouine': 1.7
};
const DEFAULT_RATE = 1.3;

const roundMillimes = (amount) => Math.round(amount * 1000) / 1000;

const normalizePlace = (place) => String(place || '')
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .trim()
  .toLowerCase();

// Free over FREE_DELIVERY_OVER; otherwise the base cost times the
// governorate's factor, doubled for urgent delivery.
const deliveryCost = (subtotal, place, isUrgent = false) => {
  if (subtotal > FREE_DELIVERY_OVER) {
    return 0;
  }
  const rate = GOVERNORATE_RATES[normalizePlace(place)] ?? DEFAULT_RATE;
  return Math.round(BASE_DELIVERY_COST * rate * (isUrgent ? 2 : 1));
};

// Prices an order exactly as it will be charged. Used both to create orders
// and to show the customer the total before they confirm.
const quoteOrder = async ({ items, place, isUrgent = false, paymentMethod = 'cash_on_delivery' }) => {
  const { orderItems, subtotal } = await priceOrderItems(items);
  const shippingCost = deliveryCost(subtotal, place, isUrgent);
  const taxAmount = roundMillimes(subtotal * TAX_RATE);
  const paymentFee = paymentMethod === 'cash_on_delivery' ? CASH_ON_DELIVERY_FEE : 0;

  return {
    orderItems,
    pricing: {
      subtotal: roundMillimes(subtotal),
      shippingCost,
      taxAmount,
      taxRate: TAX_RATE,
      paymentFee,
      totalAmount: roundMillimes(subtotal + shippingCost + taxAmount + paymentFee)
    }
  };
};

const stockedItems = (items) => items.filter(item => item.product);

const productIds = (items) => items.map(item => item.product._id || item.product);

// Returns reserved quantities to stock.
const releaseStock = async (items) => {
  const lines = stockedItems(items);
  for (const item of lines) {
    await Product.updateOne(
      { _id: item.product._id || item.product },
      { $inc: { stockQuantity: item.quantity } }
    );
  }

  await Product.updateMany(
    { _id: { $in: productIds(lines) }, stockQuantity: { $gt: 0 } },
    { $set: { inStock: true } }
  );
};

// Takes the items out of stock. Each decrement only succeeds while enough stock
// remains, so concurrent checkouts cannot oversell; on failure, everything
// reserved so far is put back.
const reserveStock = async (items) => {
  const lines = stockedItems(items);
  const reserved = [];

  try {
    for (const item of lines) {
      const result = await Product.updateOne(
        {
          _id: item.product._id || item.product,
          inStock: true,
          stockQuantity: { $gte: item.quantity }
        },
        { $inc: { stockQuantity: -item.quantity } }
      );

      if (result.modifiedCount !== 1) {
        throw new CheckoutError(409, `Insufficient stock for product: ${item.name}`);
      }
      reserved.push(item);
    }

    await Product.updateMany(
      { _id: { $in: productIds(lines) }, stockQuantity: { $lte: 0 } },
      { $set: { inStock: false } }
    );
  } catch (error) {
    await releaseStock(reserved);
    throw error;
  }
};

// Order-level wrappers. The stockReserved flag is flipped atomically first, so
// a request that races another (e.g. two cancellations) cannot move stock twice.
const releaseOrderStock = async (order) => {
  const result = await Order.updateOne(
    { _id: order._id, stockReserved: true },
    { $set: { stockReserved: false } }
  );

  if (result.modifiedCount === 1) {
    await releaseStock(order.items);
  }
};

const reserveOrderStock = async (order) => {
  const result = await Order.updateOne(
    { _id: order._id, stockReserved: { $ne: true } },
    { $set: { stockReserved: true } }
  );

  if (result.modifiedCount !== 1) {
    return;
  }

  try {
    await reserveStock(order.items);
  } catch (error) {
    await Order.updateOne({ _id: order._id }, { $set: { stockReserved: false } });
    throw error;
  }
};

module.exports = {
  CheckoutError,
  priceOrderItems,
  deliveryCost,
  quoteOrder,
  reserveStock,
  releaseStock,
  reserveOrderStock,
  releaseOrderStock
};
