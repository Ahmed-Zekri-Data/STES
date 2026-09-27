const mongoose = require('mongoose');
const Product = require('../models/Product');
const Order = require('../models/Order');
const { DEFAULTS, getSettings } = require('./settingsService');
const { CheckoutError, roundMillimes } = require('../utils/checkout');
const { findUsablePromo, discountFor } = require('./promoService');

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

// Catalog prices include VAT (TTC). The VAT is the part of a price above its
// price before VAT: shown to the customer, never added to the total.
const includedTax = (amount) => roundMillimes(amount * TAX_RATE / (1 + TAX_RATE));

const normalizePlace = (place) => String(place || '')
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .trim()
  .toLowerCase();

// Free over the free-delivery amount; otherwise the base cost times the
// governorate's factor, doubled for urgent delivery. The amounts are set
// in Admin → Settings.
const deliveryCost = (subtotal, place, isUrgent = false, prices = DEFAULTS.delivery) => {
  if (subtotal > prices.freeDeliveryOver) {
    return 0;
  }
  const rate = GOVERNORATE_RATES[normalizePlace(place)] ?? DEFAULT_RATE;
  return Math.round(prices.baseCost * rate * (isUrgent ? 2 : 1));
};

// Prices an order exactly as it will be charged. Used both to create orders
// and to show the customer the total before they confirm.
//
// A promo code comes off the products; delivery (free above the threshold)
// and VAT are worked out on what is left. When quoting, a code that cannot
// be used only returns `promoError` (checkout shows it and prices without
// it); with `strictPromo` (placing the order) it is refused.
const quoteOrder = async ({ items, place, isUrgent = false, paymentMethod = 'cash_on_delivery', promoCode, strictPromo = false }) => {
  const [{ orderItems, subtotal }, { delivery }] = await Promise.all([priceOrderItems(items), getSettings()]);

  let discount = 0;
  let discountCode;
  let promoError;
  if (promoCode) {
    try {
      const promo = await findUsablePromo(promoCode, subtotal);
      discount = discountFor(promo, subtotal);
      discountCode = promo.code;
    } catch (error) {
      if (strictPromo || !(error instanceof CheckoutError)) throw error;
      promoError = error.message;
    }
  }

  const products = subtotal - discount;
  const shippingCost = deliveryCost(products, place, isUrgent, delivery);
  const paymentFee = paymentMethod === 'cash_on_delivery' ? delivery.cashOnDeliveryFee : 0;

  return {
    orderItems,
    promoError,
    pricing: {
      subtotal: roundMillimes(subtotal),
      ...(discountCode && { discountAmount: discount, discountCode }),
      shippingCost,
      taxAmount: includedTax(products),
      taxRate: TAX_RATE,
      taxIncluded: true,
      paymentFee,
      totalAmount: roundMillimes(products + shippingCost + paymentFee)
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
  includedTax,
  TAX_RATE,
  quoteOrder,
  reserveStock,
  releaseStock,
  reserveOrderStock,
  releaseOrderStock
};
