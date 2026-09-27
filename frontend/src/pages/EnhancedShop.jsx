import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { LayoutGrid, List, SlidersHorizontal, ArrowUpDown, PackageSearch, X, ChevronLeft, ChevronRight } from 'lucide-react';
import axios from 'axios';
import ProductCard from '../components/product/ProductCard';
import ProductFilters, { CategoryRail } from '../components/shop/ProductFilters';
import ProductSearch from '../components/shop/ProductSearch';
import { SplitWords } from '../components/fx/Motion';
import { EASE } from '../utils/motion';

const EMPTY_FILTERS = {
  category: '',
  subcategory: '',
  minPrice: '',
  maxPrice: '',
  search: '',
  brand: '',
  minRating: '',
  sortBy: 'createdAt',
  sortOrder: 'desc',
  page: 1
};

const SORTS = [
  ['createdAt_desc', 'Plus récents'],
  ['price_asc', 'Prix croissant'],
  ['price_desc', 'Prix décroissant'],
  ['rating_desc', 'Mieux notés'],
  ['popularity_desc', 'Plus populaires'],
  ['name_asc', 'Nom A-Z'],
  ['name_desc', 'Nom Z-A']
];

const plural = (n, word) => `${n} ${word}${n !== 1 ? 's' : ''}`;

// Pages to show: the first, the last and two around the current one
const pageList = (current, total) => {
  const pages = [];
  for (let page = 1; page <= total; page++) {
    if (page === 1 || page === total || Math.abs(page - current) <= 2) pages.push(page);
    else if (pages[pages.length - 1] !== '…') pages.push('…');
  }
  return pages;
};

const EnhancedShop = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const [totalProducts, setTotalProducts] = useState(0);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, hasNext: false, hasPrev: false });
  const [categories, setCategories] = useState({});
  const [searchFilters, setSearchFilters] = useState({});
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const [filters, setFilters] = useState(() => ({
    ...EMPTY_FILTERS,
    ...Object.fromEntries(Object.keys(EMPTY_FILTERS).filter(k => k !== 'page').map(k => [k, searchParams.get(k) || EMPTY_FILTERS[k]])),
    page: parseInt(searchParams.get('page')) || 1
  }));

  useEffect(() => {
    axios.get('/api/products/categories')
      .then(response => {
        setCategories(response.data.categories || {});
        setSearchFilters(response.data.filters || {});
      })
      .catch(() => {
        // Without the API, show no categories rather than made-up ones
        setCategories({});
        setSearchFilters({});
      });
  }, []);

  useEffect(() => {
    let cancelled = false;
    const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== '' && value != null));
    setLoading(true);
    axios.get('/api/products', { params: { ...params, limit: 12 } })
      .then(response => {
        if (cancelled) return;
        const list = response.data.products || response.data;
        setProducts(list);
        setTotalProducts(response.data.pagination?.totalProducts || response.data.total || list.length);
        setPagination(response.data.pagination || { currentPage: 1, totalPages: 1, hasNext: false, hasPrev: false });
      })
      .catch(error => {
        if (cancelled) return;
        console.error('Error fetching products:', error);
        setProducts([]);
        setTotalProducts(0);
        setPagination({ currentPage: 1, totalPages: 1, hasNext: false, hasPrev: false });
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [filters]);

  // The address keeps the filters, so a filtered shop can be shared
  useEffect(() => {
    const next = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => { if (value) next.set(key, value); });
    setSearchParams(next, { replace: true });
  }, [filters, setSearchParams]);

  const handleFiltersChange = (changes) => setFilters(prev => ({ ...prev, ...changes, page: 1 }));
  const handleClearFilters = () => setFilters(EMPTY_FILTERS);
  const handlePageChange = (page) => {
    setFilters(prev => ({ ...prev, page }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const pickSuggestion = (suggestion) => handleFiltersChange(
    suggestion.type === 'category' ? { category: suggestion.value, subcategory: '', search: '' } : { brand: suggestion.value, search: '' }
  );

  // Removable chips for what is filtering the list
  const activeChips = [
    filters.search && { key: 'search', label: `« ${filters.search} »`, clear: { search: '' } },
    filters.category && { key: 'category', label: categories[filters.category]?.name || filters.category, clear: { category: '', subcategory: '' } },
    filters.subcategory && { key: 'subcategory', label: categories[filters.category]?.subcategories?.[filters.subcategory] || filters.subcategory, clear: { subcategory: '' } },
    (filters.minPrice || filters.maxPrice) && {
      key: 'price',
      label: `${filters.minPrice || 0} – ${filters.maxPrice || '∞'} TND`,
      clear: { minPrice: '', maxPrice: '' }
    },
    filters.minRating && { key: 'rating', label: `${filters.minRating}★ et plus`, clear: { minRating: '' } },
    filters.brand && { key: 'brand', label: filters.brand, clear: { brand: '' } }
  ].filter(Boolean);

  const panel = (
    <ProductFilters
      filters={filters}
      categories={categories}
      searchFilters={searchFilters}
      onFiltersChange={handleFiltersChange}
      onClearFilters={handleClearFilters}
      activeCount={activeChips.length}
    />
  );

  const viewButton = (mode, Icon, label) => (
    <button
      type="button"
      onClick={() => setViewMode(mode)}
      aria-label={label}
      aria-pressed={viewMode === mode}
      className={`relative grid h-9 w-9 place-items-center rounded-full transition-colors ${viewMode === mode ? 'text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
    >
      {viewMode === mode && <motion.span layoutId="view-mode" className="absolute inset-0 rounded-full bg-surface shadow-soft" />}
      <Icon className="relative h-4 w-4" aria-hidden="true" />
    </button>
  );

  const gridClass = viewMode === 'grid' ? 'grid gap-6 sm:grid-cols-2 xl:grid-cols-3' : 'grid gap-4';

  return (
    <div className="pb-8">
      {/* Title and search */}
      <header className="relative mx-auto max-w-7xl px-4 pb-8 pt-10 sm:px-6 sm:pt-16 lg:px-8">
        <div className="pointer-events-none absolute inset-0 -z-10 grid-lines opacity-70" aria-hidden="true" />
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="eyebrow">
          Catalogue · {plural(totalProducts, 'produit')}
        </motion.p>
        <h1 className="mt-3 font-display text-5xl font-bold leading-none tracking-[-0.03em] text-gray-900 sm:text-7xl">
          <SplitWords text="Boutique Piscine" highlightLast={1} />
        </h1>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.7, ease: EASE }}
          className="mt-4 max-w-xl text-lg text-gray-600"
        >
          Découvrez notre gamme complète d&apos;équipements pour piscines
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.7, ease: EASE }}
          className="mt-8 max-w-3xl"
        >
          <ProductSearch
            searchQuery={filters.search}
            onSubmit={(search) => handleFiltersChange({ search })}
            onPick={pickSuggestion}
            placeholder="Rechercher des produits, marques, catégories..."
          />
        </motion.div>
      </header>

      {/* Categories, staying under the navigation while scrolling */}
      <div className="sticky top-[4.25rem] z-30 border-y border-gray-200 bg-page/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <CategoryRail
            categories={categories}
            selected={filters.category}
            onSelect={(category) => handleFiltersChange({ category, subcategory: '' })}
          />
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-8 px-4 pt-8 sm:px-6 lg:grid-cols-[16.5rem_1fr] lg:px-8">
        <aside className="hidden lg:block">
          <div className="panel sticky top-40 p-5">{panel}</div>
        </aside>

        <section aria-labelledby="results-title" className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 id="results-title" className="font-display text-2xl font-semibold text-gray-900">
                {filters.search ? `Résultats pour « ${filters.search} »` : (categories[filters.category]?.name || 'Tous les produits')}
              </h2>
              <p className="mt-0.5 text-sm text-gray-500" aria-live="polite">
                {loading ? 'Recherche…' : `${plural(totalProducts, 'produit')} trouvé${totalProducts !== 1 ? 's' : ''}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowMobileFilters(true)}
                className="btn-ghost !px-4 !py-2 text-sm lg:hidden"
              >
                <SlidersHorizontal className="h-4 w-4" aria-hidden="true" /> Filtres
                {activeChips.length > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-gray-900 px-1 text-[11px] text-white">{activeChips.length}</span>}
              </button>
              <label className="relative">
                <span className="sr-only">Trier par</span>
                <select
                  value={`${filters.sortBy}_${filters.sortOrder}`}
                  onChange={(e) => {
                    const [sortBy, sortOrder] = e.target.value.split('_');
                    handleFiltersChange({ sortBy, sortOrder });
                  }}
                  className="appearance-none rounded-full border-gray-200 bg-none py-2 pe-9 ps-4 text-sm font-medium focus:border-blue-500 focus:ring-blue-500"
                >
                  {SORTS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <ArrowUpDown className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
              </label>
              <LayoutGroup id="view">
                <div className="hidden items-center rounded-full bg-gray-100 p-1 sm:flex">
                  {viewButton('grid', LayoutGrid, 'Affichage en grille')}
                  {viewButton('list', List, 'Affichage en liste')}
                </div>
              </LayoutGroup>
            </div>
          </div>

          <AnimatePresence initial={false}>
            {activeChips.length > 0 && (
              <motion.ul
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 flex flex-wrap gap-2"
                aria-label="Filtres actifs"
              >
                <AnimatePresence initial={false}>
                  {activeChips.map(chip => (
                    <motion.li key={chip.key} layout initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
                      <button
                        type="button"
                        onClick={() => handleFiltersChange(chip.clear)}
                        className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 py-1.5 pe-2 ps-3 text-sm font-medium text-blue-800 transition-colors hover:bg-blue-100"
                        aria-label={`Retirer le filtre ${chip.label}`}
                      >
                        {chip.label} <X className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </motion.li>
                  ))}
                </AnimatePresence>
                <li>
                  <button type="button" onClick={handleClearFilters} className="rounded-full px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900">
                    Effacer les filtres
                  </button>
                </li>
              </motion.ul>
            )}
          </AnimatePresence>

          <div className="mt-6">
            {loading && products.length === 0 ? (
              <div className={gridClass}>
                {Array.from({ length: 6 }, (_, i) => <div key={i} className={`skeleton ${viewMode === 'grid' ? 'h-[26rem]' : 'h-40'} rounded-[var(--radius)]`} />)}
              </div>
            ) : products.length > 0 ? (
              <motion.div
                key={`${viewMode}-${filters.page}`}
                className={`${gridClass} transition-opacity duration-300 ${loading ? 'opacity-50' : ''}`}
                aria-busy={loading}
              >
                {products.map((product, index) => (
                  <ProductCard key={product._id} product={product} index={index} viewMode={viewMode} />
                ))}
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="panel grid place-items-center px-6 py-20 text-center">
                <span className="grid h-16 w-16 place-items-center rounded-2xl bg-blue-50 text-blue-600">
                  <PackageSearch className="h-8 w-8" aria-hidden="true" />
                </span>
                <h3 className="mt-5 font-display text-xl font-semibold text-gray-900">Aucun produit trouvé</h3>
                <p className="mt-2 text-gray-600">Essayez d&apos;ajuster vos filtres ou votre recherche</p>
                <button type="button" onClick={handleClearFilters} className="btn-brand mt-6">Effacer les filtres</button>
              </motion.div>
            )}
          </div>

          {pagination.totalPages > 1 && (
            <nav aria-label="Pages" className="mt-12 flex items-center justify-center gap-1">
              <button
                type="button"
                onClick={() => handlePageChange(filters.page - 1)}
                disabled={!pagination.hasPrev}
                aria-label="Précédent"
                className="grid h-10 w-10 place-items-center rounded-full text-gray-700 hover:bg-gray-100 disabled:opacity-30"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              {pageList(filters.page, pagination.totalPages).map((page, i) => (page === '…'
                ? <span key={`gap-${i}`} className="px-2 text-gray-400">…</span>
                : (
                  <button
                    key={page}
                    type="button"
                    onClick={() => handlePageChange(page)}
                    aria-current={page === filters.page ? 'page' : undefined}
                    className={`relative h-10 min-w-10 rounded-full px-3 font-mono text-sm ${page === filters.page ? 'text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                  >
                    {page === filters.page && <motion.span layoutId="page" className="absolute inset-0 rounded-full bg-gray-900" />}
                    <span className="relative">{page}</span>
                  </button>
                )))}
              <button
                type="button"
                onClick={() => handlePageChange(filters.page + 1)}
                disabled={!pagination.hasNext}
                aria-label="Suivant"
                className="grid h-10 w-10 place-items-center rounded-full text-gray-700 hover:bg-gray-100 disabled:opacity-30"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </nav>
          )}
        </section>
      </div>

      {/* Phones and tablets: filters in a sheet rising from the bottom */}
      <AnimatePresence>
        {showMobileFilters && (
          <motion.div className="fixed inset-0 z-[55] lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-gray-950/50 backdrop-blur-sm" onClick={() => setShowMobileFilters(false)} />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Filtres"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 34 }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.6 }}
              onDragEnd={(_, info) => { if (info.offset.y > 120) setShowMobileFilters(false); }}
              className="absolute inset-x-0 bottom-0 max-h-[88dvh] overflow-y-auto rounded-t-[2rem] bg-surface px-5 pb-6 pt-3 shadow-large"
            >
              <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-gray-300" aria-hidden="true" />
              <button
                type="button"
                onClick={() => setShowMobileFilters(false)}
                aria-label="Fermer les filtres"
                className="absolute end-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-gray-100 text-gray-700"
              >
                <X className="h-4 w-4" />
              </button>
              {panel}
              <button type="button" onClick={() => setShowMobileFilters(false)} className="btn-brand mt-4 w-full">
                Voir {plural(totalProducts, 'produit')}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EnhancedShop;
