import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, ShoppingCart, PackageX, RefreshCw } from 'lucide-react';
import { adminGet, formatTND, timeAgo } from './topBarApi';

const REFRESH_MS = 60000;

// The bell in the admin top bar: orders waiting to be handled and products
// running out, refreshed every minute and on every page change.
const NotificationsMenu = () => {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);
  const menuRef = useRef(null);
  const { pathname } = useLocation();

  const load = useCallback(async () => {
    try {
      const response = await adminGet('/api/admin/notifications');
      setData(response.data);
      setFailed(false);
    } catch (error) {
      console.error('Error loading notifications:', error);
      setFailed(true);
    }
  }, []);

  // Also after each navigation, so an order handled on its page drops out
  useEffect(() => {
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => clearInterval(timer);
  }, [load, pathname]);

  // Close on a click outside or Escape
  useEffect(() => {
    if (!open) return undefined;
    const onClick = (event) => {
      if (!menuRef.current?.contains(event.target)) setOpen(false);
    };
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const pendingOrders = data?.pendingOrders;
  const lowStock = data?.lowStock;
  const total = (pendingOrders?.count || 0) + (lowStock?.count || 0);
  const close = () => setOpen(false);

  return (
    <div className="relative" ref={menuRef}>
      <motion.button
        onClick={() => {
          setOpen(!open);
          if (!open) load();
        }}
        aria-label={total ? `Notifications (${total})` : 'Notifications'}
        aria-expanded={open}
        className="p-2 text-gray-500 hover:text-gray-700 transition-colors relative"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <Bell className="w-5 h-5" />
        {total > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[1.25rem] h-5 px-1 bg-red-500 text-white text-xs font-semibold rounded-full flex items-center justify-center">
            {total > 99 ? '99+' : total}
          </span>
        )}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 z-50"
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {failed && !data && (
                <div className="p-4 text-sm text-gray-600">
                  <p>Notifications could not be loaded.</p>
                  <button onClick={load} className="mt-2 inline-flex items-center text-blue-600 hover:text-blue-700 font-medium">
                    <RefreshCw className="w-4 h-4 mr-1" /> Try again
                  </button>
                </div>
              )}

              {!failed && !data && <p className="p-4 text-sm text-gray-500">Loading…</p>}

              {data && total === 0 && (
                <p className="p-4 text-sm text-gray-500">Nothing needs your attention.</p>
              )}

              {pendingOrders?.count > 0 && (
                <section className="p-2">
                  <h4 className="px-2 pt-2 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Orders waiting ({pendingOrders.count})
                  </h4>
                  {pendingOrders.latest.map(order => (
                    <Link
                      key={order.id}
                      to={`/admin/orders?search=${encodeURIComponent(order.orderNumber)}`}
                      onClick={close}
                      className="flex items-start gap-3 p-2 rounded-lg hover:bg-blue-50"
                    >
                      <ShoppingCart className="w-4 h-4 mt-0.5 text-blue-600 shrink-0" />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-gray-900 truncate">{order.orderNumber}</span>
                        <span className="block text-xs text-gray-600 truncate">
                          {order.customerName} · {formatTND(order.totalAmount)} · {timeAgo(order.createdAt)}
                        </span>
                      </span>
                    </Link>
                  ))}
                  {pendingOrders.count > pendingOrders.latest.length && (
                    <Link
                      to="/admin/orders?status=pending"
                      onClick={close}
                      className="block px-2 py-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      See all {pendingOrders.count} waiting orders
                    </Link>
                  )}
                </section>
              )}

              {lowStock?.count > 0 && (
                <section className="p-2 border-t border-gray-100">
                  <h4 className="px-2 pt-2 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Low stock ({lowStock.count})
                  </h4>
                  {lowStock.items.map(product => (
                    <Link
                      key={product.id}
                      to={`/admin/products?search=${encodeURIComponent(product.name)}`}
                      onClick={close}
                      className="flex items-start gap-3 p-2 rounded-lg hover:bg-orange-50"
                    >
                      <PackageX className="w-4 h-4 mt-0.5 text-orange-600 shrink-0" />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-gray-900 truncate">{product.name}</span>
                        <span className={`block text-xs ${product.stockQuantity === 0 ? 'text-red-600' : 'text-gray-600'}`}>
                          {product.stockQuantity === 0 ? 'Out of stock' : `${product.stockQuantity} left`}
                        </span>
                      </span>
                    </Link>
                  ))}
                  {lowStock.count > lowStock.items.length && (
                    <p className="px-2 py-1 text-xs text-gray-500">
                      and {lowStock.count - lowStock.items.length} more at {lowStock.threshold} units or fewer
                    </p>
                  )}
                </section>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationsMenu;
