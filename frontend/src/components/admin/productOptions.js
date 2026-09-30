// The choices of the admin product pickers: every product and, for one with
// versions, each version ("<product id>:<version code>", as the server
// saves it). Searched by name, version and code.

const money = (value) => `${Number(value).toLocaleString('fr-FR', { maximumFractionDigits: 3 })} TND`;

export const normalize = (text) => String(text ?? '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase();

const detailOf = ({ code, price, stock, onRequest }) => [
  code,
  onRequest ? 'price on request' : money(price),
  stock === 0 ? 'out of stock' : null
].filter(Boolean).join(' · ');

export const productOptions = (products) => {
  const list = [];
  for (const product of products) {
    const versions = product.variants || [];
    if (versions.length) {
      list.push({
        value: product._id,
        label: product.name,
        detail: `${versions.length} versions · the customer chooses`,
        search: normalize(`${product.name} ${versions.map(v => v.sku).join(' ')}`)
      });
      for (const version of versions) {
        list.push({
          value: `${product._id}:${version.sku}`,
          label: `${product.name} – ${version.label}`,
          detail: detailOf({ code: version.sku, price: version.price, stock: version.stockQuantity || 0, onRequest: version.price === null || version.price === undefined }),
          search: normalize(`${product.name} ${version.label} ${version.sku}`),
          version: true
        });
      }
    } else {
      list.push({
        value: product._id,
        label: product.name,
        detail: detailOf({ code: product.sku, price: product.price, stock: product.stockQuantity, onRequest: product.priceOnRequest }),
        search: normalize(`${product.name} ${product.sku || ''}`)
      });
    }
  }
  return { list, byValue: new Map(list.map(option => [option.value, option])) };
};

// The options matching what was typed: every word must appear
export const matchOptions = (options, query, { exclude = [], limit = 60 } = {}) => {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  const skip = new Set(exclude);
  const found = [];
  for (const option of options.list) {
    if (skip.has(option.value)) continue;
    if (words.every(word => option.search.includes(word))) found.push(option);
    if (found.length >= limit) break;
  }
  return found;
};
