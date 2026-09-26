import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ShoppingCart, Package, User } from 'lucide-react';
import { adminGet, formatTND } from './topBarApi';

const MIN_LENGTH = 2;
const DELAY_MS = 250;

// Results open the matching list page, filtered to that item
const toResults = (data) => [
  ...(data.orders || []).map(order => ({
    key: `order-${order.id}`,
    group: 'Orders',
    icon: ShoppingCart,
    title: order.orderNumber,
    detail: `${order.customerName} · ${formatTND(order.totalAmount)}`,
    link: `/admin/orders?search=${encodeURIComponent(order.orderNumber)}`
  })),
  ...(data.products || []).map(product => ({
    key: `product-${product.id}`,
    group: 'Products',
    icon: Package,
    title: product.name,
    detail: [product.brand, formatTND(product.price), `${product.stockQuantity} in stock`].filter(Boolean).join(' · '),
    link: `/admin/products?search=${encodeURIComponent(product.name)}`
  })),
  ...(data.customers || []).map(customer => ({
    key: `customer-${customer.id}`,
    group: 'Customers',
    icon: User,
    title: customer.name,
    detail: customer.email,
    link: `/admin/customers?search=${encodeURIComponent(customer.email)}`
  }))
];

// The search box in the admin top bar: orders, products and customers
const AdminSearch = () => {
  const [text, setText] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef(null);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  const query = text.trim();

  useEffect(() => {
    if (query.length < MIN_LENGTH) {
      setResults(null);
      setLoading(false);
      return undefined;
    }

    // Wait for a pause in typing; drop answers to searches since replaced
    const controller = new AbortController();
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const response = await adminGet('/api/admin/search', { q: query }, { signal: controller.signal });
        setResults(toResults(response.data));
        setFailed(false);
        setActive(0);
      } catch (error) {
        if (error.name === 'CanceledError') return;
        console.error('Error searching:', error);
        setResults(null);
        setFailed(true);
      }
      setLoading(false);
    }, DELAY_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  useEffect(() => {
    if (!open) return undefined;
    const onClick = (event) => {
      if (!boxRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const choose = (result) => {
    navigate(result.link);
    setText('');
    setOpen(false);
    inputRef.current?.blur();
  };

  const onKeyDown = (event) => {
    if (event.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
    } else if (results?.length && event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((active + 1) % results.length);
    } else if (results?.length && event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((active - 1 + results.length) % results.length);
    } else if (event.key === 'Enter' && results?.[active]) {
      event.preventDefault();
      choose(results[active]);
    }
  };

  const showPanel = open && query.length >= MIN_LENGTH;

  return (
    <div className="relative" ref={boxRef}>
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
      <input
        ref={inputRef}
        type="search"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Search orders, products…"
        aria-label="Search orders, products and customers"
        role="combobox"
        aria-expanded={showPanel}
        aria-controls="admin-search-results"
        className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-72"
      />

      {showPanel && (
        <div
          id="admin-search-results"
          role="listbox"
          className="absolute left-0 top-full mt-2 w-96 max-h-[28rem] overflow-y-auto bg-white rounded-xl shadow-lg border border-gray-200 z-50 p-2"
        >
          {loading && !results && <p className="p-2 text-sm text-gray-500">Searching…</p>}
          {failed && !loading && <p className="p-2 text-sm text-red-600">Search failed. Please try again.</p>}
          {results && results.length === 0 && !loading && (
            <p className="p-2 text-sm text-gray-500">No results for “{query}”.</p>
          )}
          {results?.map((result, index) => {
            const Icon = result.icon;
            const firstOfGroup = index === 0 || results[index - 1].group !== result.group;
            return (
              <React.Fragment key={result.key}>
                {firstOfGroup && (
                  <p className="px-2 pt-2 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">{result.group}</p>
                )}
                <button
                  type="button"
                  role="option"
                  aria-selected={index === active}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => choose(result)}
                  className={`w-full flex items-start gap-3 p-2 rounded-lg text-left ${index === active ? 'bg-blue-50' : ''}`}
                >
                  <Icon className="w-4 h-4 mt-0.5 text-gray-500 shrink-0" />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-gray-900 truncate">{result.title}</span>
                    <span className="block text-xs text-gray-600 truncate">{result.detail}</span>
                  </span>
                </button>
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminSearch;
