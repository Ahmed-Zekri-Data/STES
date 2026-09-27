import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, TrendingUp, TrendingDown, ShoppingCart, Wallet, Package, Receipt } from 'lucide-react';
import adminApi, { errorMessage } from '../../utils/adminApi';
import { downloadCsv } from '../../utils/csv';
import { PRESETS, presetRange } from '../../utils/reportPeriods';

const formatTND = (amount) => `${Number(amount || 0).toLocaleString('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} TND`;

const PAYMENT_LABELS = {
  cash_on_delivery: 'Cash on delivery',
  bank_transfer: 'Bank transfer',
  card: 'Card',
  paymee: 'Paymee',
  flouci: 'Flouci',
  d17: 'D17',
  konnect: 'Konnect'
};

const periodLabel = (period, group) => {
  const date = new Date(`${period}T12:00:00`);
  if (group === 'month') return date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
  if (group === 'week') return `Week of ${date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;
  return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
};

// Change against the previous period, or nothing when there was nothing before
const Change = ({ current, previous }) => {
  if (!previous) return <span className="text-xs text-gray-500">No sales in the previous period</span>;
  const change = Math.round(((current - previous) / previous) * 100);
  const up = change >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-1 text-xs ${up ? 'text-green-700' : 'text-red-700'}`}>
      <Icon className="w-3.5 h-3.5" aria-hidden="true" /> {up ? '+' : ''}{change}% vs previous period
    </span>
  );
};

const Card = ({ icon: Icon, label, value, children }) => (
  <div className="bg-white rounded-xl shadow-sm p-5">
    <div className="flex items-center gap-2 text-sm text-gray-600">
      <Icon className="w-4 h-4" aria-hidden="true" /> {label}
    </div>
    <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
    <div className="mt-1">{children}</div>
  </div>
);

const RevenueChart = ({ series, group }) => {
  const max = Math.max(...series.map(point => point.revenue), 0);
  if (!max) {
    return <p className="text-gray-500 text-sm py-10 text-center">No sales in this period.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <div className="flex items-end gap-1 h-48 min-w-full" style={{ minWidth: `${series.length * 10}px` }} role="img" aria-label="Revenue per period">
        {series.map(point => (
          <div key={point.period} className="flex-1 h-full flex items-end group relative">
            <div
              className="w-full bg-blue-500 group-hover:bg-blue-600 rounded-t"
              style={{ height: `${Math.max((point.revenue / max) * 100, point.revenue ? 1 : 0)}%` }}
              title={`${periodLabel(point.period, group)}: ${formatTND(point.revenue)} (${point.orders} order${point.orders === 1 ? '' : 's'})`}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between text-xs text-gray-500 mt-2">
        <span>{periodLabel(series[0].period, group)}</span>
        <span>{periodLabel(series[series.length - 1].period, group)}</span>
      </div>
    </div>
  );
};

const Table = ({ title, columns, rows, empty = 'No sales in this period.' }) => (
  <div className="bg-white rounded-xl shadow-sm p-5 overflow-x-auto">
    <h3 className="font-semibold text-gray-900 mb-3">{title}</h3>
    {rows.length === 0 ? <p className="text-sm text-gray-500">{empty}</p> : (
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500 border-b">
            {columns.map((column, c) => <th key={column.label} className={`py-2 font-medium ${c ? 'pl-3' : ''} ${column.right ? 'text-right' : ''}`}>{column.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-gray-100 last:border-0">
              {columns.map((column, c) => (
                <td key={column.label} className={`py-2 ${c ? 'pl-3' : ''} ${column.right ? 'text-right whitespace-nowrap' : ''}`}>{column.value(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </div>
);

const share = (part, total) => (total ? `${Math.round((part / total) * 100)}%` : '—');

// Admin → Reports: sales over a period, compared with the period before,
// broken down by product, category, governorate and payment method, with an
// export of the period's orders.
const Reports = () => {
  const [preset, setPreset] = useState('last30');
  const [[from, to], setRange] = useState(() => presetRange('last30'));
  const [group, setGroup] = useState('');
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [notice, setNotice] = useState('');

  const choosePreset = (value) => {
    setPreset(value);
    if (value !== 'custom') setRange(presetRange(value));
  };

  const load = useCallback(async () => {
    if (!from || !to) return;
    setLoading(true);
    setError('');
    try {
      const response = await adminApi.get('/admin/reports/sales', { params: { from, to, group: group || undefined } });
      setReport(response.data);
    } catch (err) {
      setError(`The report could not be loaded: ${errorMessage(err)}`);
    } finally {
      setLoading(false);
    }
  }, [from, to, group]);

  useEffect(() => {
    load();
  }, [load]);

  const exportOrders = async () => {
    setExporting(true);
    setNotice('');
    try {
      const { data } = await adminApi.get('/admin/reports/orders', { params: { from, to } });
      downloadCsv(`orders-${from}_${to}.csv`, [
        ['Date', 'Order', 'Status', 'Payment', 'Payment status', 'Customer', 'Email', 'Phone', 'City', 'Governorate', 'Items', 'Units', 'Subtotal (TND)', 'Delivery (TND)', 'Total (TND)'],
        ...data.orders.map(order => [
          new Date(order.createdAt).toLocaleString('fr-FR'),
          order.orderNumber,
          order.status,
          PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod,
          order.paymentStatus,
          order.customerName,
          order.email,
          order.phone,
          order.city,
          order.governorate,
          order.items,
          order.itemsCount,
          order.subtotal,
          order.delivery,
          order.total
        ])
      ]);
      setNotice(data.truncated
        ? `Only the first ${data.orders.length} orders were exported: choose a shorter period for the rest.`
        : `${data.orders.length} order${data.orders.length === 1 ? '' : 's'} exported.`);
    } catch (err) {
      setNotice(`The export failed: ${errorMessage(err)}`);
    } finally {
      setExporting(false);
    }
  };

  const totals = report?.totals;
  const previous = report?.previous;
  const categoryTotal = useMemo(() => (report?.categories || []).reduce((sum, c) => sum + c.revenue, 0), [report]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-4 flex flex-col lg:flex-row lg:items-end gap-3">
        <div className="flex flex-col text-sm text-gray-600 gap-1">
          <label htmlFor="report-period">Period</label>
          <select id="report-period" value={preset} onChange={(e) => choosePreset(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-gray-900">
            {Object.entries(PRESETS).map(([value, { label }]) => <option key={value} value={value}>{label}</option>)}
            <option value="custom">Custom dates</option>
          </select>
        </div>
        <div className="flex flex-col text-sm text-gray-600 gap-1">
          <label htmlFor="report-from">From</label>
          <input id="report-from" type="date" value={from} max={to} onChange={(e) => { setPreset('custom'); setRange([e.target.value, to]); }} className="px-3 py-2 border border-gray-300 rounded-lg text-gray-900" />
        </div>
        <div className="flex flex-col text-sm text-gray-600 gap-1">
          <label htmlFor="report-to">To</label>
          <input id="report-to" type="date" value={to} min={from} onChange={(e) => { setPreset('custom'); setRange([from, e.target.value]); }} className="px-3 py-2 border border-gray-300 rounded-lg text-gray-900" />
        </div>
        <div className="flex flex-col text-sm text-gray-600 gap-1">
          <label htmlFor="report-group">Chart by</label>
          <select id="report-group" value={group} onChange={(e) => setGroup(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-gray-900">
            <option value="">Automatic</option>
            <option value="day">Day</option>
            <option value="week">Week</option>
            <option value="month">Month</option>
          </select>
        </div>
        <button
          type="button"
          onClick={exportOrders}
          disabled={exporting || !from || !to}
          className="lg:ml-auto inline-flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          <Download className="w-4 h-4" aria-hidden="true" /> {exporting ? 'Exporting…' : 'Export orders (CSV)'}
        </button>
      </div>

      {notice && <p role="status" className="text-sm text-blue-700">{notice}</p>}
      {error && (
        <p role="alert" className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error} <button type="button" onClick={load} className="underline ml-2">Retry</button>
        </p>
      )}
      {!report && !error && <p className="text-gray-500">Loading…</p>}

      {report && (
        <div className={`space-y-6 transition-opacity ${loading ? 'opacity-60' : ''}`} aria-busy={loading}>
          <p className="text-sm text-gray-600">
            Sales from {new Date(`${report.period.from}T12:00:00`).toLocaleDateString('en-GB', { dateStyle: 'long' })} to {new Date(`${report.period.to}T12:00:00`).toLocaleDateString('en-GB', { dateStyle: 'long' })},
            compared with {report.previous.from} – {report.previous.to}. Cancelled and refunded orders are not counted.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <Card icon={Wallet} label="Revenue" value={formatTND(totals.revenue)}>
              <Change current={totals.revenue} previous={previous.revenue} />
            </Card>
            <Card icon={ShoppingCart} label="Orders" value={totals.orders}>
              <Change current={totals.orders} previous={previous.orders} />
            </Card>
            <Card icon={Receipt} label="Average order" value={formatTND(totals.averageOrder)}>
              <Change current={totals.averageOrder} previous={previous.averageOrder} />
            </Card>
            <Card icon={Package} label="Units sold" value={totals.itemsSold}>
              <span className="text-xs text-gray-500">
                {formatTND(totals.delivery)} delivery charged · {totals.cancelled} cancelled
              </span>
            </Card>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Revenue by {report.period.group}</h3>
            <RevenueChart series={report.series} group={report.period.group} />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Table
              title="Best-selling products"
              rows={report.products}
              columns={[
                { label: 'Product', value: (p) => p.name },
                { label: 'Units', value: (p) => p.quantity, right: true },
                { label: 'Revenue', value: (p) => formatTND(p.revenue), right: true }
              ]}
            />
            <Table
              title="Categories"
              rows={report.categories}
              columns={[
                { label: 'Category', value: (c) => c.name },
                { label: 'Units', value: (c) => c.quantity, right: true },
                { label: 'Revenue', value: (c) => formatTND(c.revenue), right: true },
                { label: 'Share', value: (c) => share(c.revenue, categoryTotal), right: true }
              ]}
            />
            <Table
              title="Governorates"
              rows={report.governorates}
              columns={[
                { label: 'Governorate', value: (g) => g.name },
                { label: 'Orders', value: (g) => g.orders, right: true },
                { label: 'Revenue', value: (g) => formatTND(g.revenue), right: true }
              ]}
            />
            <Table
              title="Payment methods"
              rows={report.paymentMethods}
              columns={[
                { label: 'Method', value: (p) => PAYMENT_LABELS[p.method] || p.method },
                { label: 'Orders', value: (p) => p.orders, right: true },
                { label: 'Revenue', value: (p) => formatTND(p.revenue), right: true },
                { label: 'Share', value: (p) => share(p.revenue, totals.revenue), right: true }
              ]}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
