import React, { useState, useEffect, useRef, useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Clock, Package, Tag, ArrowRight, Loader2 } from 'lucide-react';
import axios from 'axios';
import { categoryLook } from '../../utils/categoryIcons';

const TYPE_LABELS = { product: 'Produit', category: 'Catégorie', brand: 'Marque' };

const loadRecent = () => {
  try {
    const saved = JSON.parse(localStorage.getItem('recentSearches'));
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
};

const suggestionIcon = (suggestion) => {
  if (suggestion.type === 'category') return categoryLook(suggestion.value).icon;
  if (suggestion.type === 'brand') return Tag;
  return Package;
};

// The shop's search box. Typing shows suggestions from the catalog; the
// products only change when a search is submitted (Enter, a suggestion, or
// the button), not on every key. Picking a category or brand filters by it.
const ProductSearch = ({ searchQuery = '', onSubmit, onPick, placeholder = 'Rechercher des produits...' }) => {
  const [query, setQuery] = useState(searchQuery);
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const [recent, setRecent] = useState(loadRecent);
  const box = useRef(null);
  const listId = useId();

  useEffect(() => { setQuery(searchQuery); }, [searchQuery]);

  // Suggestions, a moment after typing stops
  useEffect(() => {
    const text = query.trim();
    if (text.length < 2) {
      setSuggestions([]);
      return undefined;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await axios.get('/api/products/search/suggestions', { params: { q: text } });
        if (!cancelled) setSuggestions(response.data.suggestions || []);
      } catch {
        if (!cancelled) setSuggestions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [query]);

  useEffect(() => {
    const close = (event) => { if (!box.current?.contains(event.target)) setOpen(false); };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, []);

  const remember = (text) => {
    const next = [text, ...recent.filter(s => s !== text)].slice(0, 5);
    setRecent(next);
    try { localStorage.setItem('recentSearches', JSON.stringify(next)); } catch { /* storage blocked */ }
  };

  const submit = (text = query) => {
    const clean = text.trim();
    if (clean) remember(clean);
    setOpen(false);
    setActive(-1);
    onSubmit(clean);
  };

  const pick = (suggestion) => {
    setOpen(false);
    setActive(-1);
    if (suggestion.type === 'category' || suggestion.type === 'brand') {
      setQuery('');
      onPick?.(suggestion);
    } else {
      setQuery(suggestion.value);
      submit(suggestion.value);
    }
  };

  const clearRecent = () => {
    setRecent([]);
    try { localStorage.removeItem('recentSearches'); } catch { /* storage blocked */ }
  };

  const showingRecent = !query.trim() && recent.length > 0;
  const options = showingRecent ? recent.map(value => ({ type: 'recent', value, label: value })) : suggestions;

  const onKeyDown = (event) => {
    if (event.key === 'ArrowDown' && options.length) {
      event.preventDefault();
      setOpen(true);
      setActive(i => (i + 1) % options.length);
    } else if (event.key === 'ArrowUp' && options.length) {
      event.preventDefault();
      setActive(i => (i <= 0 ? options.length - 1 : i - 1));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const chosen = options[active];
      if (open && chosen) {
        if (chosen.type === 'recent') { setQuery(chosen.value); submit(chosen.value); } else pick(chosen);
      } else {
        submit();
      }
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  };

  const expanded = open && (options.length > 0 || (query.trim().length >= 2 && !loading));

  return (
    <div ref={box} className="relative w-full">
      <div className="glass group relative flex items-center rounded-full p-1.5 ps-5 transition-shadow duration-300 focus-within:shadow-glow">
        <Search className="h-5 w-5 shrink-0 text-gray-400 transition-colors group-focus-within:text-blue-600" aria-hidden="true" />
        <input
          type="search"
          role="combobox"
          aria-label="Rechercher dans la boutique"
          aria-expanded={expanded}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); setActive(-1); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className="min-w-0 flex-1 border-0 !bg-transparent px-3 py-2.5 text-base focus:ring-0 sm:text-lg [&::-webkit-search-cancel-button]:hidden"
        />
        {loading && <Loader2 className="me-2 h-4 w-4 animate-spin text-gray-400" aria-hidden="true" />}
        {query && (
          <button
            type="button"
            aria-label="Effacer la recherche"
            onClick={() => { setQuery(''); setSuggestions([]); if (searchQuery) onSubmit(''); }}
            className="me-1 grid h-9 w-9 place-items-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        <button type="button" onClick={() => submit()} className="btn-brand !px-5 !py-2.5 text-sm">
          <span className="hidden sm:inline">Rechercher</span>
          <ArrowRight className="h-4 w-4 sm:hidden" aria-hidden="true" />
          <span className="sr-only sm:hidden">Rechercher</span>
        </button>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, transition: { duration: 0.12 } }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            className="glass absolute inset-x-0 top-full z-40 mt-3 max-h-96 overflow-y-auto rounded-3xl p-2"
          >
            {showingRecent && (
              <div className="flex items-center justify-between px-3 pb-1 pt-2">
                <span className="eyebrow !text-gray-500">Recherches récentes</span>
                <button type="button" onClick={clearRecent} className="text-xs font-medium text-blue-600">Effacer</button>
              </div>
            )}
            <ul id={listId} role="listbox" aria-label="Suggestions">
              {options.map((option, index) => {
                const Icon = option.type === 'recent' ? Clock : suggestionIcon(option);
                return (
                  <li
                    key={`${option.type}-${option.value}`}
                    id={`${listId}-${index}`}
                    role="option"
                    aria-selected={index === active}
                    onPointerDown={(e) => e.preventDefault()}
                    onClick={() => (option.type === 'recent' ? (setQuery(option.value), submit(option.value)) : pick(option))}
                    onPointerEnter={() => setActive(index)}
                    className={`flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2.5 ${index === active ? 'bg-gray-100' : ''}`}
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-900">{option.label}</span>
                    {TYPE_LABELS[option.type] && (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-gray-500">
                        {TYPE_LABELS[option.type]}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
            {!showingRecent && options.length === 0 && (
              <p className="px-3 py-6 text-center text-sm text-gray-500">Aucune suggestion trouvée : essayez des termes différents.</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProductSearch;
