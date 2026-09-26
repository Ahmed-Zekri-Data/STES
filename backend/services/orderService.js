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
  reserveStock,
  releaseStock,
  reserveOrderStock,
  releaseOrderStock
};
