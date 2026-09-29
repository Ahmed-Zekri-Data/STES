// For the product cards of the home page, the pool builder and the care
// calendar: whether the product can be added to the cart, and whether it
// must be chosen on its page first (versions, or a price on request).
const OFFER_FIELDS = 'variants.sku priceOnRequest backorder';

const offerOf = (product) => ({
  inStock: (product.inStock !== false && (product.stockQuantity ?? 0) > 0) || Boolean(product.backorder),
  choose: Boolean(product.variants?.length) || Boolean(product.priceOnRequest),
  priceOnRequest: Boolean(product.priceOnRequest)
});

module.exports = { OFFER_FIELDS, offerOf };
