import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Star, Search, LayoutGrid } from 'lucide-react';
import { categoryLook } from '../../utils/categoryIcons';

// The shop's filters. Sections are defined once, outside any render, so an
// input keeps its focus while typing.

const Section = ({ title, children }) => (
  <fieldset className="border-t border-gray-200 py-5 first:border-t-0 first:pt-0">
    <legend className="float-left mb-3 w-full font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-gray-500">{title}</legend>
    <div className="clear-left">{children}</div>
  </fieldset>
);

const chipClass = (active) => `rounded-full border px-3 py-1.5 text-sm transition-colors duration-200 ${
  active
    ? 'border-transparent bg-gray-900 text-white'
    : 'border-gray-200 text-gray-700 hover:border-gray-400'
}`;

const same = (a, b) => String(a ?? '') === String(b ?? '');

// Categories as a row of chips; the chosen one gets a sliding highlight
export const CategoryRail = ({ categories, selected, onSelect, layoutId = 'category-rail' }) => {
  const entries = [['', { name: 'Tout' }], ...Object.entries(categories)];
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="group" aria-label="Catégories">
      {entries.map(([slug, category]) => {
        const active = selected === slug;
        const Icon = slug ? categoryLook(slug).icon : LayoutGrid;
        return (
          <button
            key={slug || 'all'}
            type="button"
            onClick={() => onSelect(slug)}
            aria-pressed={active}
            className={`relative inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors duration-200 ${
              active ? 'text-white' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 rounded-full bg-gray-900 shadow-medium"
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              />
            )}
            <Icon className="relative h-4 w-4" aria-hidden="true" />
            <span className="relative whitespace-nowrap">{category.name}</span>
          </button>
        );
      })}
    </div>
  );
};

// Min/max typed freely, applied on Enter, on leaving the field, or with OK
const PriceInputs = ({ minPrice, maxPrice, onApply }) => {
  const [min, setMin] = useState(minPrice || '');
  const [max, setMax] = useState(maxPrice || '');
  useEffect(() => { setMin(minPrice || ''); setMax(maxPrice || ''); }, [minPrice, maxPrice]);
  const apply = () => {
    if (!same(min, minPrice) || !same(max, maxPrice)) onApply({ minPrice: min, maxPrice: max });
  };
  const field = 'w-full rounded-xl border-gray-200 py-2 ps-3 pe-9 text-sm tabular [appearance:textfield] focus:border-blue-500 focus:ring-blue-500 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none';
  return (
    <form className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2" onSubmit={(event) => { event.preventDefault(); apply(); }}>
      <label className="relative">
        <span className="sr-only">Prix minimum</span>
        <input type="number" min="0" inputMode="numeric" placeholder="Min" value={min} onChange={e => setMin(e.target.value)} onBlur={apply} className={field} />
        <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 font-mono text-[10px] text-gray-400">TND</span>
      </label>
      <span className="text-gray-400" aria-hidden="true">–</span>
      <label className="relative">
        <span className="sr-only">Prix maximum</span>
        <input type="number" min="0" inputMode="numeric" placeholder="Max" value={max} onChange={e => setMax(e.target.value)} onBlur={apply} className={field} />
        <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 font-mono text-[10px] text-gray-400">TND</span>
      </label>
      <button type="submit" className="col-span-3 rounded-xl bg-gray-100 py-2 text-sm font-medium text-gray-800 hover:bg-gray-200">Appliquer le prix</button>
    </form>
  );
};

const BrandList = ({ brands = [], selected, onSelect }) => {
  const [query, setQuery] = useState('');
  if (!brands.length) return <p className="text-sm text-gray-500">Aucune marque</p>;
  const shown = brands.filter(brand => brand.toLowerCase().includes(query.trim().toLowerCase()));
  return (
    <div className="space-y-2">
      {brands.length > 6 && (
        <label className="relative block">
          <span className="sr-only">Rechercher une marque</span>
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
          <input
            type="text"
            placeholder="Rechercher une marque..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-xl border-gray-200 py-2 ps-9 text-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </label>
      )}
      <div className="flex max-h-56 flex-wrap gap-2 overflow-y-auto">
        <button type="button" onClick={() => onSelect('')} aria-pressed={!selected} className={chipClass(!selected)}>Toutes les marques</button>
        {shown.map(brand => (
          <button key={brand} type="button" onClick={() => onSelect(brand)} aria-pressed={selected === brand} className={chipClass(selected === brand)}>
            {brand}
          </button>
        ))}
      </div>
    </div>
  );
};

// The category's sub-categories, with how many products each has; a long
// list shows its first ones (and the one chosen) until "Voir plus"
const SHORT_LIST = 10;
const SubcategoryFilter = ({ subcategories, counts, selected, onSelect }) => {
  const [expanded, setExpanded] = useState(false);
  const entries = Object.entries(subcategories);
  const shown = expanded || entries.length <= SHORT_LIST + 2
    ? entries
    : entries.filter(([key], index) => index < SHORT_LIST || key === selected);
  return (
    <Section title="Sous-catégorie">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => onSelect('')} aria-pressed={!selected} className={chipClass(!selected)}>Toutes</button>
        {shown.map(([key, name]) => (
          <button key={key} type="button" onClick={() => onSelect(key)} aria-pressed={selected === key} className={`${chipClass(selected === key)} text-start`}>
            {name}
            {counts[key] > 0 && <span className="ms-1.5 text-xs opacity-60 tabular">{counts[key]}</span>}
          </button>
        ))}
      </div>
      {shown.length < entries.length && (
        <button type="button" onClick={() => setExpanded(true)} className="mt-3 text-sm font-medium text-blue-600 hover:text-blue-700">
          Voir les {entries.length} sous-catégories
        </button>
      )}
    </Section>
  );
};

const ProductFilters = ({ filters, categories = {}, searchFilters = {}, onFiltersChange, onClearFilters, activeCount = 0 }) => {
  const subcategories = categories[filters.category]?.subcategories;
  const set = (changes) => onFiltersChange(changes);

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-gray-900">Filtres</h2>
        {activeCount > 0 && (
          <button type="button" onClick={onClearFilters} className="text-sm font-medium text-blue-600 hover:text-blue-700">
            Effacer tout ({activeCount})
          </button>
        )}
      </div>

      {subcategories && Object.keys(subcategories).length > 0 && (
        <SubcategoryFilter
          key={filters.category}
          subcategories={subcategories}
          counts={categories[filters.category]?.subcategoryCounts || {}}
          selected={filters.subcategory}
          onSelect={(subcategory) => set({ subcategory })}
        />
      )}

      <Section title="Prix">
        <div className="flex flex-wrap gap-2">
          {searchFilters.priceRanges?.map(range => {
            const active = same(filters.minPrice, range.min || '') && same(filters.maxPrice, range.max || '');
            return (
              <button
                key={range.label}
                type="button"
                aria-pressed={active}
                onClick={() => set(active ? { minPrice: '', maxPrice: '' } : { minPrice: range.min || '', maxPrice: range.max || '' })}
                className={chipClass(active)}
              >
                {range.label}
              </button>
            );
          })}
        </div>
        <PriceInputs minPrice={filters.minPrice} maxPrice={filters.maxPrice} onApply={set} />
      </Section>

      <Section title="Note client">
        <div className="space-y-1">
          {searchFilters.ratings?.map(rating => {
            const active = same(filters.minRating, rating.min);
            return (
              <button
                key={rating.min}
                type="button"
                aria-pressed={active}
                onClick={() => set({ minRating: active ? '' : String(rating.min) })}
                className={`flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-sm transition-colors ${active ? 'bg-amber-50 text-gray-900 ring-1 ring-amber-300' : 'text-gray-700 hover:bg-gray-100'}`}
              >
                <span className="flex" aria-hidden="true">
                  {[0, 1, 2, 3, 4].map(i => (
                    <Star key={i} className={`h-3.5 w-3.5 ${i < rating.min ? 'fill-current text-amber-400' : 'text-gray-300'}`} />
                  ))}
                </span>
                {rating.label}
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Marque">
        <BrandList brands={searchFilters.brands} selected={filters.brand} onSelect={(brand) => set({ brand })} />
      </Section>
    </div>
  );
};

export default ProductFilters;
