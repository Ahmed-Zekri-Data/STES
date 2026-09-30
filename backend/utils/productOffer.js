// For the product cards of the home page, the pool builder and the care
// calendar: whether the product can be added to the cart, and whether it
// must be chosen on its page first (versions, or a price on request).
const OFFER_FIELDS = 'variants priceOnRequest backorder';

const offerOf = (product) => ({
  inStock: (product.inStock !== false && (product.stockQuantity ?? 0) > 0) || Boolean(product.backorder),
  choose: Boolean(product.variants?.length) || Boolean(product.priceOnRequest),
  priceOnRequest: Boolean(product.priceOnRequest)
});

// What the shop shows: products in stock, and those that can still be
// ordered (sur commande) or asked about (prix sur demande) without stock
const SHOP_AVAILABLE = { $or: [{ inStock: true }, { backorder: true }, { priceOnRequest: true }, { variants: { $elemMatch: { price: null } } }] };

// Products chosen in Admin → Settings (home page, pool builder, reminders)
// are saved as "<product id>" or, for one of its versions,
// "<product id>:<version code>"
const PRODUCT_REF = /^([a-f\d]{24})(?::([^:]{1,40}))?$/i;
const isProductRef = (value) => PRODUCT_REF.test(String(value ?? ''));
const parseProductRef = (value) => {
  const match = String(value ?? '').match(PRODUCT_REF);
  return match ? { id: match[1].toLowerCase(), sku: match[2] || null } : null;
};
const productIdsOf = (refs) => [...new Set(refs.map(parseProductRef).filter(Boolean).map(r => r.id))];

// The card of a product, or of the version chosen: its name, price and
// stock, ready to go in the cart (the version travels as `variant`)
const offerFor = (product, sku) => {
  const version = sku && product.variants?.find(v => v.sku === sku);
  if (!version) return offerOf(product);
  const onRequest = version.price === null || version.price === undefined;
  return {
    variant: version.sku,
    name: `${product.name} – ${version.label}`,
    price: onRequest ? 0 : version.price,
    stockQuantity: version.stockQuantity || 0,
    inStock: (version.stockQuantity || 0) > 0 || Boolean(product.backorder),
    priceOnRequest: onRequest,
    choose: onRequest
  };
};

module.exports = { OFFER_FIELDS, offerOf, offerFor, SHOP_AVAILABLE, isProductRef, parseProductRef, productIdsOf };
