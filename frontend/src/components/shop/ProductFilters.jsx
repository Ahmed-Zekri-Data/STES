import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Filter, 
  X, 
  ChevronDown, 
  ChevronUp, 
  Star, 
  DollarSign,
  Tag,
  Grid,
  List,
  SlidersHorizontal
} from 'lucide-react';
import axios from 'axios';

const ProductFilters = ({ 
  filters, 
  onFiltersChange, 
  onClearFilters,
  viewMode,
  onViewModeChange,
  totalProducts = 0
}) => {
  const [categories, setCategories] = useState({});
  const [searchFilters, setSearchFilters] = useState({});
  const [expandedSections, setExpandedSections] = useState({
    categories: true,
    price: true,
    rating: true,
    brand: false
  });
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await axios.get('/api/products/categories');
      setCategories(response.data.categories);
      setSearchFilters(response.data.filters);
    } catch (error) {
      console.error('Error fetching categories:', error);
      // Fallback data for development
      setCategories({
        'pumps-motors': {
          name: 'Pompes et Moteurs',
          icon: '⚙️',
          subcategories: {
            'circulation-pumps': 'Pompes de circulation',
            'filtration-pumps': 'Pompes de filtration',
            'heat-pumps': 'Pompes à chaleur'
          }
        },
        'filters': {
          name: 'Filtration',
          icon: '🔄',
          subcategories: {
            'sand-filters': 'Filtres à sable',
            'cartridge-filters': 'Filtres à cartouche',
            'de-filters': 'Filtres à diatomée'
          }
        },
        'chemicals': {
          name: 'Produits Chimiques',
          icon: '🧪',
          subcategories: {
            'chlorine': 'Chlore',
            'ph-adjusters': 'Régulateurs de pH',
            'algaecides': 'Anti-algues'
          }
        },
        'cleaning': {
          name: 'Nettoyage',
          icon: '🧽',
          subcategories: {
            'robotic-cleaners': 'Robots nettoyeurs',
            'manual-tools': 'Outils manuels',
            'brushes': 'Brosses'
          }
        },
        'heating': {
          name: 'Chauffage',
          icon: '🔥',
          subcategories: {
            'heat-pumps': 'Pompes à chaleur',
            'electric-heaters': 'Chauffages électriques',
            'solar-heaters': 'Chauffages solaires'
          }
        },
        'lighting': {
          name: 'Éclairage',
          icon: '💡',
          subcategories: {
            'led-lights': 'Éclairage LED',
            'underwater-lights': 'Éclairage sous-marin',
            'color-changing': 'Éclairage multicolore'
          }
        }
      });

    setSearchFilters({
      priceRanges: [
        { label: 'Moins de 50 TND', min: 0, max: 50 },
        { label: '50 - 100 TND', min: 50, max: 100 },
        { label: '100 - 500 TND', min: 100, max: 500 },
        { label: '500 - 1000 TND', min: 500, max: 1000 },
        { label: 'Plus de 1000 TND', min: 1000 }
      ],
      ratings: [
        { label: '4 étoiles et plus', min: 4 },
        { label: '3 étoiles et plus', min: 3 },
        { label: '2 étoiles et plus', min: 2 },
        { label: '1 étoile et plus', min: 1 }
      ],
      brands: ['AquaPro', 'FilterMax', 'ChemPool', 'ProPool', 'CleanPool', 'PoolTech', 'AquaMax', 'BlueWave']
    });
    }
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleFilterChange = (key, value) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const handlePriceRangeChange = (range) => {
    onFiltersChange({
      ...filters,
      minPrice: range.min || '',
      maxPrice: range.max || ''
    });
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.category) count++;
    if (filters.subcategory) count++;
    if (filters.minPrice || filters.maxPrice) count++;
    if (filters.minRating) count++;
    if (filters.brand) count++;
    if (filters.search) count++;
    return count;
  };

  const FilterSection = ({ title, isExpanded, onToggle, children }) => (
    <div className="border-b border-gray-200 pb-4 mb-4">
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full text-left font-medium text-gray-900 hover:text-blue-600 transition-colors"
      >
        <span>{title}</span>
        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-3 space-y-2"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  const CategoryFilter = () => (
    <FilterSection
      title="Catégories"
      isExpanded={expandedSections.categories}
      onToggle={() => toggleSection('categories')}
    >
      <div className="space-y-2">
        {Object.entries(categories).map(([key, category]) => (
          <div key={key}>
            <label className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors">
              <input
                type="radio"
                name="category"
                value={key}
                checked={filters.category === key}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className="text-blue-600 focus:ring-blue-500"
              />
              <span className="text-2xl">{category.icon}</span>
              <span className="text-sm text-gray-700">{category.name}</span>
            </label>
            
            {/* Subcategories */}
            {filters.category === key && category.subcategories && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="ml-6 mt-2 space-y-1"
              >
                {Object.entries(category.subcategories).map(([subKey, subName]) => (
                  <label key={subKey} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded transition-colors">
                    <input
                      type="radio"
                      name="subcategory"
                      value={subKey}
                      checked={filters.subcategory === subKey}
                      onChange={(e) => handleFilterChange('subcategory', e.target.value)}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-xs text-gray-600">{subName}</span>
                  </label>
                ))}
              </motion.div>
            )}
          </div>
        ))}
      </div>
    </FilterSection>
  );

  const PriceFilter = () => (
    <FilterSection
      title="Prix"
      isExpanded={expandedSections.price}
      onToggle={() => toggleSection('price')}
    >
      <div className="space-y-3">
        {/* Price Range Buttons */}
        {searchFilters.priceRanges?.map((range, index) => (
          <button
            key={index}
            onClick={() => handlePriceRangeChange(range)}
            className={`w-full text-left p-2 rounded-lg text-sm transition-colors ${
              (filters.minPrice == range.min && filters.maxPrice == range.max) ||
              (filters.minPrice == range.min && !range.max && !filters.maxPrice)
                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                : 'hover:bg-gray-50 text-gray-700'
            }`}
          >
            {range.label}
          </button>
        ))}
        
        {/* Custom Price Range */}
        <div className="flex space-x-2">
          <input
            type="number"
            placeholder="Min"
            value={filters.minPrice}
            onChange={(e) => handleFilterChange('minPrice', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <input
            type="number"
            placeholder="Max"
            value={filters.maxPrice}
            onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>
    </FilterSection>
  );

  const RatingFilter = () => (
    <FilterSection
      title="Note client"
      isExpanded={expandedSections.rating}
      onToggle={() => toggleSection('rating')}
    >
      <div className="space-y-2">
        {searchFilters.ratings?.map((rating, index) => (
          <label key={index} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors">
            <input
              type="radio"
              name="rating"
              value={rating.min}
              checked={filters.minRating == rating.min}
              onChange={(e) => handleFilterChange('minRating', e.target.value)}
              className="text-blue-600 focus:ring-blue-500"
            />
            <div className="flex items-center space-x-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-4 h-4 ${
                    i < rating.min ? 'text-yellow-400 fill-current' : 'text-gray-300'
                  }`}
                />
              ))}
              <span className="text-sm text-gray-600 ml-1">{rating.label}</span>
            </div>
          </label>
        ))}
      </div>
    </FilterSection>
  );

  const BrandFilter = () => (
    <FilterSection
      title="Marque"
      isExpanded={expandedSections.brand}
      onToggle={() => toggleSection('brand')}
    >
      <div className="space-y-2">
        <input
          type="text"
          placeholder="Rechercher une marque..."
          value={filters.brand || ''}
          onChange={(e) => handleFilterChange('brand', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {searchFilters.brands?.slice(0, 8).map((brand, index) => (
          <label key={index} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors">
            <input
              type="radio"
              name="brand"
              value={brand}
              checked={filters.brand === brand}
              onChange={(e) => handleFilterChange('brand', e.target.value)}
              className="text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">{brand}</span>
          </label>
        ))}
      </div>
    </FilterSection>
  );

  return (
    <>
      {/* Mobile Filter Toggle */}
      <div className="lg:hidden flex items-center justify-between mb-4">
        <button
          onClick={() => setShowMobileFilters(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>Filtres</span>
          {getActiveFiltersCount() > 0 && (
            <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
              {getActiveFiltersCount()}
            </span>
          )}
        </button>

        {/* View Mode Toggle */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onViewModeChange('grid')}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Grid className="w-4 h-4" />
          </button>
          <button
            onClick={() => onViewModeChange('list')}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Desktop Filters */}
      <div className="hidden lg:block">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Filter className="w-5 h-5 mr-2" />
              Filtres
            </h3>
            {getActiveFiltersCount() > 0 && (
              <button
                onClick={onClearFilters}
                className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
              >
                Effacer tout ({getActiveFiltersCount()})
              </button>
            )}
          </div>

          <CategoryFilter />
          <PriceFilter />
          <RatingFilter />
          <BrandFilter />
        </div>
      </div>

      {/* Mobile Filters Modal */}
      <AnimatePresence>
        {showMobileFilters && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 lg:hidden"
            onClick={() => setShowMobileFilters(false)}
          >
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="bg-white h-full w-80 max-w-[90vw] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Filtres</h3>
                  <button
                    onClick={() => setShowMobileFilters(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <CategoryFilter />
                <PriceFilter />
                <RatingFilter />
                <BrandFilter />

                <div className="flex space-x-3 mt-6">
                  <button
                    onClick={onClearFilters}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Effacer
                  </button>
                  <button
                    onClick={() => setShowMobileFilters(false)}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Appliquer
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ProductFilters;
