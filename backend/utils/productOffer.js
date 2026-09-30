// For the product cards of the home page, the pool builder and the care
// calendar: whether the product can be added to the cart, and whether it
// must be chosen on its page first (versions, or a price on request).
const OFFER_FIELDS = 'variants.sku priceOnRequest backorder';

const offerOf = (product) => ({
  inStock: (product.inStock !== false && (product.stockQuantity ?? 0) > 0) || Boolean(product.backorder),
  choose: Boolean(product.variants?.length) || Boolean(product.priceOnRequest),
  priceOnRequest: Boolean(product.priceOnRequest)
});

// What the shop shows: products in stock, and those that can still be
// ordered (sur commande) or asked about (prix sur demande) without stock
const SHOP_AVAILABLE = { $or: [{ inStock: true }, { backorder: true }, { priceOnRequest: true }, { variants: { $elemMatch: { price: null } } }] };

module.exports = { OFFER_FIELDS, offerOf, SHOP_AVAILABLE };
