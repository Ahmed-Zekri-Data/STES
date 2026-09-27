import axios from 'axios';

// In-stock products to show outside the shop (home page, cart suggestions):
// first from the given categories, then the products marked "featured" in
// Admin → Products, then the newest. Products in `exclude` (for example
// the ones already in the cart) are skipped.
export const pickProducts = async ({ categories = [], exclude = [], limit = 4 } = {}) => {
  const skip = new Set(exclude.map(String));
  const picked = [];
  const add = (products) => {
    for (const product of products) {
      if (picked.length >= limit) return;
      if (!skip.has(String(product._id)) && !picked.some(p => p._id === product._id)) picked.push(product);
    }
  };
  const load = (params) => axios
    .get('/api/products', { params: { inStock: true, limit: Math.min(100, limit + skip.size), ...params } })
    .then(response => response.data.products || []);

  for (const category of [...new Set(categories.filter(Boolean))]) {
    if (picked.length >= limit) break;
    add(await load({ category }));
  }
  if (picked.length < limit) add(await load({ featured: true }));
  if (picked.length < limit) add(await load({ sortBy: 'createdAt', sortOrder: 'desc' }));
  return picked;
};
