import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Package,
  ShoppingCart,
  Users,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  CheckCircle,
  Truck,
  XCircle,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import adminApi, { errorMessage } from '../../utils/adminApi';
import { useAdmin } from '../../context/AdminContext';
import AnimatedCounter from '../../components/AnimatedCounter';

const PERIODS = [
  { days: 7, label: 'Last 7 days' },
  { days: 30, label: 'Last 30 days' },
  { days: 90, label: 'Last 90 days' },
  { days: 365, label: 'Last 12 months' }
];

const STATUS = {
  pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-800', icon: Clock },
  confirmed: { label: 'Confirmed', className: 'bg-blue-100 text-blue-800', icon: CheckCircle },
  processing: { label: 'Processing', className: 'bg-blue-100 text-blue-800', icon: AlertCircle },
  shipped: { label: 'Shipped', className: 'bg-indigo-100 text-indigo-800', icon: Truck },
  delivered: { label: 'Delivered', className: 'bg-green-100 text-green-800', icon: CheckCircle },
  cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-800', icon: XCircle }
};

const formatTND = (amount) => `${Number(amount || 0).toLocaleString('fr-FR', { maximumFractionDigits: 3 })} TND`;
const formatDate = (date) => new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

// Change against the previous period, e.g. +12%. Nothing when there is
// nothing to compare with.
const Change = ({ current, previous, days }) => {
  if (!previous) return null;
  const percent = Math.round(((current - previous) / previous) * 100);
  const up = percent >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span
      className={`inline-flex items-center text-sm ${up ? 'text-green-600' : 'text-red-600'}`}
      title={`Compared with the ${days} days before`}
    >
      <Icon className="w-4 h-4 mr-1" />
      {up ? '+' : ''}{percent}%
    </span>
  );
};

const StatCard = ({ title, value, suffix, icon: Icon, color, change, detail, to, index }) => {
  const body = (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
        <div className="flex flex-wrap items-center gap-x-2">
          <AnimatedCounter end={value} duration={1.5} suffix={suffix || ''} className="text-2xl font-bold text-gray-900 whitespace-nowrap" />
          {change}
        </div>
        {detail && <p className="text-xs text-gray-500 mt-1">{detail}</p>}
      </div>
      <div className={`w-12 h-12 shrink-0 bg-gradient-to-r ${color} rounded-xl flex items-center justify-center shadow-lg`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
    </div>
  );
  return (
    <motion.div
      className="bg-surface rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.08 }}
    >
      {to ? <Link to={to} className="block">{body}</Link> : body}
    </motion.div>
  );
};

const Dashboard = () => {
  const { admin } = useAdmin();
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async (period = days) => {
    try {
      setLoading(true);
      setError('');
      const response = await adminApi.get('/admin/dashboard', { params: { days: period } });
      setData(response.data);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(days);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  const periodLabel = PERIODS.find(p => p.days === days)?.label.toLowerCase();

  const header = (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome back{admin?.firstName ? `, ${admin.firstName}` : ''}! 👋
        </h1>
        <p className="text-gray-600">Here's how the shop is doing.</p>
      </div>
      <div>
        <label htmlFor="dashboard-period" className="sr-only">Period</label>
        <select
          id="dashboard-period"
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="px-3 py-2 border border-gray-300 rounded-lg bg-surface text-sm"
        >
          {PERIODS.map(p => <option key={p.days} value={p.days}>{p.label}</option>)}
        </select>
      </div>
    </div>
  );

  if (error) {
    return (
      <div className="space-y-8">
        {header}
        <div role="alert" className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          The dashboard could not be loaded: {error}
          <button type="button" onClick={() => load()} className="inline-flex items-center gap-1 ml-3 underline">
            <RefreshCw className="w-4 h-4" /> Try again
          </button>
        </div>
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div className="space-y-8">
        {header}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-surface rounded-2xl p-6 shadow-lg animate-pulse">
              <div className="h-4 bg-gray-300 rounded mb-4"></div>
              <div className="h-8 bg-gray-300 rounded mb-2"></div>
              <div className="h-3 bg-gray-300 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const { sales, orderStatus, recentOrders, topProducts, products, customers } = data;

  const statCards = [
    sales && {
      title: `Sales, ${periodLabel}`,
      value: Math.round(sales.revenue),
      suffix: ' TND',
      icon: DollarSign,
      color: 'from-purple-500 to-purple-600',
      change: <Change current={sales.revenue} previous={sales.previous.revenue} days={days} />,
      detail: sales.orders ? `Average order ${formatTND(sales.averageOrder)}` : 'No sales in this period',
      to: '/admin/orders'
    },
    sales && {
      title: `Orders, ${periodLabel}`,
      value: sales.orders,
      icon: ShoppingCart,
      color: 'from-green-500 to-green-600',
      change: <Change current={sales.orders} previous={sales.previous.orders} days={days} />,
      detail: 'Not counting cancelled or refunded orders',
      to: '/admin/orders'
    },
    products && {
      title: 'Products',
      value: products.total,
      icon: Package,
      color: 'from-blue-500 to-blue-600',
      detail: `${products.outOfStock} out of stock · ${products.lowStock} running low`,
      to: products.outOfStock ? '/admin/products?stock=out' : '/admin/products'
    },
    customers && {
      title: 'Customer accounts',
      value: customers.total,
      icon: Users,
      color: 'from-orange-500 to-orange-600',
      change: <Change current={customers.new} previous={customers.previousNew} days={days} />,
      detail: `${customers.new} new, ${periodLabel}`,
      to: '/admin/customers'
    }
  ].filter(Boolean);

  const statusCards = orderStatus ? [
    { title: 'Waiting to be handled', value: orderStatus.pending, icon: Clock, color: 'from-yellow-500 to-yellow-600', to: '/admin/orders?status=pending' },
    { title: 'In progress', value: orderStatus.inProgress, icon: Truck, color: 'from-blue-500 to-blue-600', detail: 'Confirmed, processing or shipped', to: '/admin/orders' },
    { title: 'Delivered', value: orderStatus.delivered, icon: CheckCircle, color: 'from-green-500 to-green-600', to: '/admin/orders?status=delivered' },
    { title: 'Cancelled', value: orderStatus.cancelled, icon: XCircle, color: 'from-red-500 to-red-600', to: '/admin/orders?status=cancelled' }
  ] : [];

  const bestSeller = topProducts?.[0]?.quantity || 1;

  return (
    <div className={`space-y-8 ${loading ? 'opacity-60 transition-opacity' : ''}`}>
      {header}

      {!statCards.length && !statusCards.length && (
        <p className="text-gray-600">Your account has no access to orders, products or customers, so there are no figures to show.</p>
      )}

      {statCards.length > 0 && (
        <div key={days} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {statCards.map((card, index) => <StatCard key={card.title} index={index} {...card} />)}
        </div>
      )}

      {statusCards.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-3">All orders by status</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {statusCards.map((card, index) => <StatCard key={card.title} index={index + 4} {...card} />)}
          </div>
        </section>
      )}

      {sales && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Orders */}
          <section className="bg-surface rounded-2xl shadow-lg border border-gray-100">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <ShoppingCart className="w-5 h-5 mr-2 text-blue-600" />
                Recent orders
              </h3>
              <Link to="/admin/orders" className="text-sm text-blue-600 hover:text-blue-700">See all</Link>
            </div>
            <div className="p-6 space-y-3">
              {!recentOrders.length && <p className="text-gray-500 text-sm">No orders yet.</p>}
              {recentOrders.map(order => {
                const status = STATUS[order.status] || STATUS.pending;
                const StatusIcon = status.icon;
                return (
                  <Link
                    key={order.id}
                    to={`/admin/orders?search=${encodeURIComponent(order.orderNumber)}`}
                    className="flex items-center justify-between gap-3 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">{order.customerName || 'Customer'}</p>
                      <p className="text-sm text-gray-500 truncate">{order.orderNumber} · {formatDate(order.createdAt)}</p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1 sm:gap-3 shrink-0">
                      <span className="font-semibold text-gray-900 whitespace-nowrap">{formatTND(order.totalAmount)}</span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.className}`}>
                        <StatusIcon className="w-3.5 h-3.5 mr-1" />
                        {status.label}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>

          {/* Top Products */}
          <section className="bg-surface rounded-2xl shadow-lg border border-gray-100">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Package className="w-5 h-5 mr-2 text-green-600" />
                Best sellers, {periodLabel}
              </h3>
              <p className="text-xs text-gray-500 mt-1">By units sold, not counting cancelled or refunded orders</p>
            </div>
            <div className="p-6 space-y-3">
              {!topProducts.length && <p className="text-gray-500 text-sm">No products sold in this period.</p>}
              {topProducts.map((product, index) => {
                const content = (
                  <>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">{index + 1}. {product.name}</p>
                      <p className="text-sm text-gray-500">
                        {product.quantity} sold{!product.stillInCatalog && ' · no longer in the catalog'}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-semibold text-gray-900 whitespace-nowrap">{formatTND(product.revenue)}</p>
                      <div className="w-24 bg-gray-200 rounded-full h-2 mt-1 ml-auto">
                        <motion.div
                          className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${(product.quantity / bestSeller) * 100}%` }}
                          transition={{ duration: 0.8, delay: 0.2 + index * 0.1 }}
                        />
                      </div>
                    </div>
                  </>
                );
                const className = 'flex items-center justify-between gap-3 p-4 bg-gray-50 rounded-xl';
                return product.stillInCatalog ? (
                  <Link key={product.id} to={`/admin/products?search=${encodeURIComponent(product.name)}`} className={`${className} hover:bg-gray-100 transition-colors`}>
                    {content}
                  </Link>
                ) : (
                  <div key={product.id} className={className}>{content}</div>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
