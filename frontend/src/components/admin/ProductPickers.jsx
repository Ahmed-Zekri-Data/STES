import React, { useMemo } from 'react';
import { X } from 'lucide-react';

// Pickers for admin settings that point at products (home page, pool builder)

export const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-xl bg-surface focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15';

export const Section = ({ title, description, children }) => (
  <section className="bg-surface rounded-xl shadow-sm border border-gray-200 p-6">
    <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
    {description && <p className="text-sm text-gray-600 mt-1">{description}</p>}
    <div className="mt-5 space-y-4">{children}</div>
  </section>
);

const label = (product) => `${product.name} · ${product.price} TND${product.stockQuantity === 0 ? ' (out of stock)' : ''}`;

export const ProductSelect = ({ id, value, onChange, products, placeholder = 'None' }) => (
  <select id={id} className={inputClass} value={value || ''} onChange={(event) => onChange(event.target.value || null)}>
    <option value="">{placeholder}</option>
    {products.map(product => <option key={product._id} value={product._id}>{label(product)}</option>)}
    {value && !products.some(p => p._id === value) && <option value={value}>A deleted product</option>}
  </select>
);

// A short list of products: the chosen ones with a remove button, and a
// menu to add another
export const ProductList = ({ id, value, onChange, products, max }) => {
  const byId = useMemo(() => new Map(products.map(p => [p._id, p])), [products]);
  return (
    <div>
      {value.length > 0 && (
        <ul className="mb-2 space-y-1.5">
          {value.map(productId => (
            <li key={productId} className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-gray-50 text-sm">
              <span>{byId.get(productId) ? label(byId.get(productId)) : 'A deleted product'}</span>
              <button type="button" onClick={() => onChange(value.filter(v => v !== productId))} className="text-gray-500 hover:text-red-600" aria-label={`Remove ${byId.get(productId)?.name || 'this product'}`}>
                <X className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {value.length < max && (
        <select id={id} className={inputClass} value="" onChange={(event) => event.target.value && onChange([...value, event.target.value])}>
          <option value="">Add a product…</option>
          {products.filter(p => !value.includes(p._id)).map(product => <option key={product._id} value={product._id}>{label(product)}</option>)}
        </select>
      )}
    </div>
  );
};

export const Labelled = ({ htmlFor, title, hint, children }) => (
  <div>
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 mb-1">{title}</label>
    {children}
    {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
  </div>
);
