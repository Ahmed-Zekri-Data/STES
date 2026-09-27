const PromoCode = require('../models/PromoCode');
const Order = require('../models/Order');
const { CheckoutError, roundMillimes } = require('../utils/checkout');

const normalizeCode = (code) => String(code || '').trim().toUpperCase();

// The code, if it can be used now on a products total of `subtotal`.
// Otherwise throws a CheckoutError whose message is shown to the customer.
const findUsablePromo = async (code, subtotal, now = new Date()) => {
  const promo = await PromoCode.findOne({ code: normalizeCode(code) });
  if (!promo || !promo.isActive) {
    throw new CheckoutError(400, "Ce code promo n'existe pas ou n'est plus valable.");
  }
  if (promo.startsAt && promo.startsAt > now) {
    throw new CheckoutError(400, "Ce code promo n'est pas encore valable.");
  }
  if (promo.expiresAt && promo.expiresAt <= now) {
    throw new CheckoutError(400, 'Ce code promo a expiré.');
  }
  if (promo.usageLimit != null && promo.usedCount >= promo.usageLimit) {
    throw new CheckoutError(400, "Ce code promo a atteint sa limite d'utilisation.");
  }
  if (subtotal < promo.minOrder) {
    throw new CheckoutError(400, `Ce code promo s'applique à partir de ${promo.minOrder} TND d'achats.`);
  }
  return promo;
};

// Amount taken off the products: a percentage (capped by maxDiscount when
// set) or a fixed amount, never more than the products themselves
const discountFor = (promo, subtotal) => {
  let amount = promo.type === 'percent' ? (subtotal * promo.value) / 100 : promo.value;
  if (promo.type === 'percent' && promo.maxDiscount != null) {
    amount = Math.min(amount, promo.maxDiscount);
  }
  return roundMillimes(Math.min(amount, subtotal));
};

// Takes one use for a new order. The limit is checked in the same update,
// so two orders cannot both take the last use.
const claimPromoUse = async (code) => {
  const result = await PromoCode.updateOne(
    { code, isActive: true, $or: [{ usageLimit: null }, { $expr: { $lt: ['$usedCount', '$usageLimit'] } }] },
    { $inc: { usedCount: 1 } }
  );
  if (result.modifiedCount !== 1) {
    throw new CheckoutError(409, "Ce code promo a atteint sa limite d'utilisation.");
  }
};

const unclaimPromoUse = (code) => PromoCode.updateOne({ code, usedCount: { $gt: 0 } }, { $inc: { usedCount: -1 } });

// Order-level wrappers, like the stock ones: the order's promoClaimed flag is
// flipped atomically first, so racing requests (two cancellations) cannot
// give a use back twice.
const releaseOrderPromo = async (order) => {
  const code = order.pricing?.discountCode;
  if (!code) return;
  const result = await Order.updateOne({ _id: order._id, promoClaimed: true }, { $set: { promoClaimed: false } });
  if (result.modifiedCount === 1) await unclaimPromoUse(code);
};

// A cancelled order made active again takes its use back, even over the
// limit: the admin decided to honour it
const reclaimOrderPromo = async (order) => {
  const code = order.pricing?.discountCode;
  if (!code) return;
  const result = await Order.updateOne({ _id: order._id, promoClaimed: { $ne: true } }, { $set: { promoClaimed: true } });
  if (result.modifiedCount === 1) await PromoCode.updateOne({ code }, { $inc: { usedCount: 1 } });
};

module.exports = {
  normalizeCode,
  findUsablePromo,
  discountFor,
  claimPromoUse,
  unclaimPromoUse,
  releaseOrderPromo,
  reclaimOrderPromo
};
