import adminApi from './adminApi';

// Every product, 100 at a time (the admin list when allowed, else the shop's)
export const loadAllProducts = async (canManageProducts) => {
  const all = [];
  for (let page = 1; page <= 20; page++) {
    const response = canManageProducts
      ? await adminApi.get('/admin/products', { params: { page, limit: 100, sort: 'name' } })
      : await adminApi.get('/products', { params: { page, limit: 100, sortBy: 'name', sortOrder: 'asc' } });
    const list = response.data.products || [];
    all.push(...list);
    const pages = response.data.pagination?.totalPages || response.data.pagination?.pages || 1;
    if (page >= pages || !list.length) break;
  }
  return all.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
};
