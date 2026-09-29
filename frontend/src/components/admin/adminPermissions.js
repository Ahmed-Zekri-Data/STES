// The permission each admin page needs (see backend middleware/auth.js).
// Pages not listed are open to every admin; super admins can open all.
export const PAGE_PERMISSIONS = {
  '/admin/products': 'products',
  '/admin/categories': 'products',
  '/admin/brands': 'products',
  '/admin/reviews': 'products',
  '/admin/orders': 'orders',
  '/admin/tracking': 'orders',
  '/admin/reports': 'orders',
  '/admin/promo-codes': 'orders',
  '/admin/customers': 'users',
  '/admin/forms': 'forms',
  '/admin/reminders': 'forms',
  '/admin/pages': 'settings'
};

// Whether the admin may open the page at this path
export const canOpen = (hasPermission, path) => {
  const permission = PAGE_PERMISSIONS[path.replace(/\/+$/, '')];
  return !permission || hasPermission(permission);
};
