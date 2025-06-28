import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Clock, TrendingUp, Tag, Package } from 'lucide-react';
import axios from 'axios';

const ProductSearch = ({ 
  searchQuery, 
  onSearchChange, 
  onSearchSubmit,
  placeholder = "Rechercher des produits..." 
}) => {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const searchRef = useRef(null);
  const suggestionsRef = useRef(null);

  useEffect(() => {
    // Load recent searches from localStorage
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (searchQuery && searchQuery.length >= 2) {
        fetchSuggestions(searchQuery);
      } else {
        setSuggestions([]);
      }
    }, 300);

    return () => clearTimeout(delayedSearch);
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        searchRef.current && 
        !searchRef.current.contains(event.target) &&
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchSuggestions = async (query) => {
    try {
      setLoading(true);
      const response = await axios.get('/api/products/search/suggestions', {
        params: { q: query }
      });
      setSuggestions(response.data.suggestions);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      // Fallback to static suggestions
      const staticSuggestions = [
        { label: 'Moteur de Piscine', value: 'moteur', type: 'product', icon: '⚙️' },
        { label: 'Filtre à Sable', value: 'filtre', type: 'product', icon: '🔄' },
        { label: 'Chlore', value: 'chlore', type: 'product', icon: '🧪' },
        { label: 'Kit de Nettoyage', value: 'nettoyage', type: 'product', icon: '🧽' },
        { label: 'Pompes et Moteurs', value: 'pumps-motors', type: 'category', icon: '⚙️' },
        { label: 'Produits Chimiques', value: 'chemicals', type: 'category', icon: '🧪' },
        { label: 'Filtration', value: 'filters', type: 'category', icon: '🔄' },
        { label: 'Nettoyage', value: 'cleaning', type: 'category', icon: '🧽' },
        { label: 'AquaPro', value: 'AquaPro', type: 'brand' },
        { label: 'FilterMax', value: 'FilterMax', type: 'brand' },
        { label: 'ChemPool', value: 'ChemPool', type: 'brand' },
        { label: 'ProPool', value: 'ProPool', type: 'brand' }
      ];

      const filteredSuggestions = staticSuggestions.filter(s =>
        s.label.toLowerCase().includes(query.toLowerCase()) ||
        s.value.toLowerCase().includes(query.toLowerCase())
      );

      setSuggestions(filteredSuggestions);
      setShowSuggestions(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (query) => {
    if (query.trim()) {
      // Add to recent searches
      const newRecentSearches = [
        query,
        ...recentSearches.filter(s => s !== query)
      ].slice(0, 5);
      
      setRecentSearches(newRecentSearches);
      localStorage.setItem('recentSearches', JSON.stringify(newRecentSearches));
      
      onSearchSubmit(query);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    onSearchChange(suggestion.value);
    handleSearchSubmit(suggestion.value);
  };

  const handleRecentSearchClick = (search) => {
    onSearchChange(search);
    handleSearchSubmit(search);
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('recentSearches');
  };

  const getSuggestionIcon = (type) => {
    switch (type) {
      case 'product': return <Package className="w-4 h-4" />;
      case 'category': return <Tag className="w-4 h-4" />;
      case 'brand': return <TrendingUp className="w-4 h-4" />;
      default: return <Search className="w-4 h-4" />;
    }
  };

  const getSuggestionTypeLabel = (type) => {
    switch (type) {
      case 'product': return 'Produit';
      case 'category': return 'Catégorie';
      case 'brand': return 'Marque';
      default: return '';
    }
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      {/* Search Input */}
      <div ref={searchRef} className="relative">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSearchSubmit(searchQuery);
              }
            }}
            onFocus={() => {
              if (searchQuery.length >= 2 || recentSearches.length > 0) {
                setShowSuggestions(true);
              }
            }}
            placeholder={placeholder}
            className="w-full pl-12 pr-12 py-4 text-lg border border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all duration-200"
          />
          {searchQuery && (
            <button
              onClick={() => {
                onSearchChange('');
                setSuggestions([]);
                setShowSuggestions(false);
              }}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Loading indicator */}
        {loading && (
          <div className="absolute right-12 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          </div>
        )}
      </div>

      {/* Suggestions Dropdown */}
      <AnimatePresence>
        {showSuggestions && (
          <motion.div
            ref={suggestionsRef}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 max-h-96 overflow-y-auto"
          >
            {/* Recent Searches */}
            {!searchQuery && recentSearches.length > 0 && (
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-gray-700 flex items-center">
                    <Clock className="w-4 h-4 mr-2" />
                    Recherches récentes
                  </h4>
                  <button
                    onClick={clearRecentSearches}
                    className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    Effacer
                  </button>
                </div>
                <div className="space-y-1">
                  {recentSearches.map((search, index) => (
                    <button
                      key={index}
                      onClick={() => handleRecentSearchClick(search)}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      {search}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Search Suggestions */}
            {suggestions.length > 0 && (
              <div className="p-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Suggestions</h4>
                <div className="space-y-1">
                  {suggestions.map((suggestion, index) => (
                    <motion.button
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="w-full flex items-center space-x-3 px-3 py-3 text-left hover:bg-gray-50 rounded-lg transition-colors group"
                    >
                      <div className="flex-shrink-0 text-gray-400 group-hover:text-blue-600 transition-colors">
                        {suggestion.icon ? (
                          <span className="text-lg">{suggestion.icon}</span>
                        ) : (
                          getSuggestionIcon(suggestion.type)
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-900 truncate">
                            {suggestion.label}
                          </span>
                          {suggestion.type && (
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                              {getSuggestionTypeLabel(suggestion.type)}
                            </span>
                          )}
                        </div>
                        {suggestion.category && (
                          <div className="text-xs text-gray-500 mt-1">
                            dans {suggestion.category}
                          </div>
                        )}
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            {/* No suggestions */}
            {searchQuery && suggestions.length === 0 && !loading && (
              <div className="p-4 text-center text-gray-500">
                <Search className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">Aucune suggestion trouvée</p>
                <p className="text-xs text-gray-400 mt-1">
                  Essayez des termes différents
                </p>
              </div>
            )}

            {/* Quick Actions */}
            {searchQuery && (
              <div className="border-t border-gray-100 p-3">
                <button
                  onClick={() => handleSearchSubmit(searchQuery)}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Search className="w-4 h-4" />
                  <span>Rechercher "{searchQuery}"</span>
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProductSearch;
