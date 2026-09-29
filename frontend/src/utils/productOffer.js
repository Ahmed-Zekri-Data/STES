// What a product (or one of its versions) costs and whether it can be
// bought: versions each have a price and stock; no price means "prix sur
// demande"; a product "sur commande" can be ordered without stock. The
// server applies the same rules at checkout (backend/services/orderService.js).

export const hasVariants = (product) => (product?.variants?.length || 0) > 0;

export const isOnRequest = (product, variant) => (variant
  ? variant.price === null || variant.price === undefined
  : Boolean(product?.priceOnRequest));

// The price shown: the version's, or the product's
export const priceOf = (product, variant) => (variant ? variant.price : product.price);

// "In stock", "on order" or "out of stock"; "on quote" for a price on request
export const availability = (product, variant) => {
  if (isOnRequest(product, variant)) return { state: 'request', stock: 0, label: 'Sur devis' };
  const stock = variant ? variant.stockQuantity || 0 : (product.inStock === false ? 0 : product.stockQuantity ?? 1);
  if (stock > 0) return { state: 'in', stock, label: 'En stock' };
  if (product.backorder) return { state: 'order', stock: 0, label: 'Sur commande' };
  return { state: 'out', stock: 0, label: 'Rupture de stock' };
};

// Whether it can go straight into the cart. A product with versions needs
// one chosen first.
export const canBuy = (product, variant) => {
  if (hasVariants(product) && !variant) return false;
  return !isOnRequest(product, variant) && availability(product, variant).state !== 'out';
};

// The lowest and highest prices of a product's versions (priced ones only)
export const priceRange = (product) => {
  const prices = (product.variants || []).map(v => v.price).filter(p => p !== null && p !== undefined);
  return prices.length ? { min: Math.min(...prices), max: Math.max(...prices) } : null;
};

// The cart line of a product, or of one of its versions
export const cartKey = (item) => (item.variant ? `${item._id}:${item.variant}` : String(item._id));
