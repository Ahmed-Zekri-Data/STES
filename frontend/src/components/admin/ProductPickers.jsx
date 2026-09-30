import React, { useMemo, useState } from 'react';
import { X, Search } from 'lucide-react';
import { productOptions, matchOptions } from './productOptions';

// Pickers for admin settings that point at products (home page, pool
// builder, reminders): a product, or one of its versions

export const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-xl bg-surface focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15';

export const Section = ({ title, description, children }) => (
  <section className="bg-surface rounded-xl shadow-sm border border-gray-200 p-6">
    <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
    {description && <p className="text-sm text-gray-600 mt-1">{description}</p>}
    <div className="mt-5 space-y-4">{children}</div>
  </section>
);

// A search box listing the products and versions that match what is typed
// (name, version or code). Arrows to move, Enter to choose, Escape to close.
const ProductCombobox = ({ id, options, text, placeholder, exclude, onPick }) => {
  const [query, setQuery] = useState(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const matches = useMemo(() => (open ? matchOptions(options, query || '', { exclude }) : []), [open, options, query, exclude]);
  const listId = `${id}-options`;

  const pick = (option) => {
    onPick(option.value);
    setQuery(null);
    setOpen(false);
  };
  const onKeyDown = (event) => {
    if (event.key === 'ArrowDown') { event.preventDefault(); setOpen(true); setActive(a => Math.min(a + 1, matches.length - 1)); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
    else if (event.key === 'Enter' && open && matches[active]) { event.preventDefault(); pick(matches[active]); }
    else if (event.key === 'Escape') { setOpen(false); setQuery(null); }
  };

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
      <input
        id={id}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && matches[active] ? `${listId}-${active}` : undefined}
        autoComplete="off"
        className={`${inputClass} pl-9`}
        placeholder={placeholder}
        value={query ?? text}
        onFocus={() => { setOpen(true); setActive(0); }}
        onChange={(event) => { setQuery(event.target.value); setOpen(true); setActive(0); }}
        onBlur={() => { setOpen(false); setQuery(null); }}
        onKeyDown={onKeyDown}
      />
      {open && (
        <ul id={listId} role="listbox" className="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-gray-200 bg-surface py-1 shadow-lg">
          {matches.length === 0 && <li className="px-3 py-2 text-sm text-gray-500">No product matches “{query}”</li>}
          {matches.map((option, index) => (
            <li
              key={option.value}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === active}
              onMouseDown={(event) => { event.preventDefault(); pick(option); }}
              onMouseEnter={() => setActive(index)}
              className={`cursor-pointer px-3 py-2 text-sm ${index === active ? 'bg-blue-50' : ''} ${option.version ? 'pl-7' : ''}`}
            >
              <span className="block text-gray-900">{option.label}</span>
              <span className="block text-xs text-gray-500">{option.detail}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const labelOf = (options, value) => {
  const option = options.byValue.get(String(value));
  return option ? option.label : 'A deleted product';
};

// One product (or version), or none
export const ProductSelect = ({ id, value, onChange, products, placeholder = 'None: type to search a product or a code' }) => {
  const options = useMemo(() => productOptions(products), [products]);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1">
        <ProductCombobox id={id} options={options} text={value ? labelOf(options, value) : ''} placeholder={placeholder} exclude={[]} onPick={onChange} />
      </div>
      {value && (
        <button type="button" onClick={() => onChange(null)} className="p-2 text-gray-500 hover:text-red-600" aria-label={`Remove ${labelOf(options, value)}`}>
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

// A short list of products (or versions): the chosen ones with a remove
// button, and a search box to add another
export const ProductList = ({ id, value, onChange, products, max }) => {
  const options = useMemo(() => productOptions(products), [products]);
  const chosen = value.map(String);
  return (
    <div>
      {chosen.length > 0 && (
        <ul className="mb-2 space-y-1.5">
          {chosen.map(ref => (
            <li key={ref} className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-gray-50 text-sm">
              <span>{labelOf(options, ref)}<span className="ms-2 text-xs text-gray-500">{options.byValue.get(ref)?.detail}</span></span>
              <button type="button" onClick={() => onChange(chosen.filter(v => v !== ref))} className="text-gray-500 hover:text-red-600" aria-label={`Remove ${labelOf(options, ref)}`}>
                <X className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {chosen.length < max && (
        <ProductCombobox id={id} options={options} text="" placeholder="Add a product: type a name or a code…" exclude={chosen} onPick={(ref) => onChange([...chosen, ref])} />
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
