import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  Grid, 
  List, 
  SlidersHorizontal, 
  ArrowUpDown,
  Package,
  Sparkles,
  TrendingUp
} from 'lucide-react';
import EnhancedProductCard from '../components/shop/EnhancedProductCard';
import ProductFilters from '../components/shop/ProductFilters';
import ProductSearch from '../components/shop/ProductSearch';
import { useLanguage } from '../context/LanguageContext';
import { useCart } from '../context/CartContext';
import LoadingSpinner, { SkeletonCard } from '../components/LoadingSpinner';
import axios from 'axios';

const EnhancedShop = () => {
  const { t } = useLanguage();
  const { addToCart } = useCart();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const [totalProducts, setTotalProducts] = useState(0);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    hasNext: false,
    hasPrev: false
  });

  const [filters, setFilters] = useState({
    category: searchParams.get('category') || '',
    subcategory: searchParams.get('subcategory') || '',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    search: searchParams.get('search') || '',
    brand: searchParams.get('brand') || '',
    minRating: searchParams.get('minRating') || '',
    sortBy: searchParams.get('sortBy') || 'createdAt',
    sortOrder: searchParams.get('sortOrder') || 'desc',
    page: parseInt(searchParams.get('page')) || 1
  });

  useEffect(() => {
    fetchProducts();
  }, [filters]);

  useEffect(() => {
    // Update URL params when filters change
    const newSearchParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== '') {
        newSearchParams.set(key, value);
      }
    });
    setSearchParams(newSearchParams);
  }, [filters, setSearchParams]);

  const fetchProducts = async () => {
    try {
      setLoading(true);

      // Filter out empty parameters
      const cleanParams = Object.entries(filters).reduce((acc, [key, value]) => {
        if (value !== '' && value !== null && value !== undefined) {
          acc[key] = value;
        }
        return acc;
      }, {});

      const response = await axios.get('/api/products', {
        params: {
          ...cleanParams,
          limit: 12
        }
      });

      const productsData = response.data.products || response.data;
      setProducts(productsData);
      setTotalProducts(response.data.pagination?.totalProducts || response.data.total || productsData.length);
      setPagination(response.data.pagination || {
        currentPage: 1,
        totalPages: 1,
        hasNext: false,
        hasPrev: false
      });
    } catch (error) {
      console.error('Error fetching products:', error);
      console.error('Error response:', error.response?.data);
      // Fallback to empty array if API fails
      setProducts([]);
      setTotalProducts(0);
      setPagination({
        currentPage: 1,
        totalPages: 1,
        hasNext: false,
        hasPrev: false
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFiltersChange = (newFilters) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters,
      page: 1 // Reset to first page when filters change
    }));
  };

  const handleSearchChange = (searchQuery) => {
    setFilters(prev => ({
      ...prev,
      search: searchQuery
    }));
  };

  const handleSearchSubmit = (searchQuery) => {
    setFilters(prev => ({
      ...prev,
      search: searchQuery,
      page: 1
    }));
  };

  const handleClearFilters = () => {
    setFilters({
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
    });
  };

  const handlePageChange = (newPage) => {
    setFilters(prev => ({
      ...prev,
      page: newPage
    }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getSortLabel = () => {
    const sortKey = `${filters.sortBy}_${filters.sortOrder}`;
    const sortLabels = {
      'createdAt_desc': 'Plus récents',
      'createdAt_asc': 'Plus anciens',
      'price_asc': 'Prix croissant',
      'price_desc': 'Prix décroissant',
      'rating_desc': 'Mieux notés',
      'name_asc': 'Nom A-Z',
      'name_desc': 'Nom Z-A',
      'popularity_desc': 'Plus populaires'
    };
    return sortLabels[sortKey] || 'Trier par';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-gray-900 mb-4 flex items-center justify-center">
                <Package className="w-10 h-10 mr-3 text-blue-600" />
                Boutique Piscine
              </h1>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Découvrez notre gamme complète d'équipements pour piscines
              </p>
            </div>

            {/* Search Bar */}
            <div className="mb-6">
              <ProductSearch
                searchQuery={filters.search}
                onSearchChange={handleSearchChange}
                onSearchSubmit={handleSearchSubmit}
                placeholder="Rechercher des produits, marques, catégories..."
              />
            </div>
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <div className="lg:w-80 flex-shrink-0">
            <ProductFilters
              filters={filters}
              onFiltersChange={handleFiltersChange}
              onClearFilters={handleClearFilters}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              totalProducts={totalProducts}
            />
          </div>

          {/* Products Area */}
          <div className="flex-1">
            {/* Results Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">
                  {filters.search ? `Résultats pour "${filters.search}"` : 'Tous les produits'}
                </h2>
                <p className="text-gray-600 mt-1">
                  {totalProducts} produit{totalProducts !== 1 ? 's' : ''} trouvé{totalProducts !== 1 ? 's' : ''}
                </p>
              </div>

              {/* Desktop Sort and View Controls */}
              <div className="hidden lg:flex items-center space-x-4">
                {/* Sort Dropdown */}
                <div className="relative">
                  <select
                    value={`${filters.sortBy}_${filters.sortOrder}`}
                    onChange={(e) => {
                      const [sortBy, sortOrder] = e.target.value.split('_');
                      handleFiltersChange({ sortBy, sortOrder });
                    }}
                    className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="createdAt_desc">Plus récents</option>
                    <option value="price_asc">Prix croissant</option>
                    <option value="price_desc">Prix décroissant</option>
                    <option value="rating_desc">Mieux notés</option>
                    <option value="popularity_desc">Plus populaires</option>
                    <option value="name_asc">Nom A-Z</option>
                    <option value="name_desc">Nom Z-A</option>
                  </select>
                  <ArrowUpDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>

                {/* View Mode Toggle */}
                <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded transition-colors ${
                      viewMode === 'grid' 
                        ? 'bg-white text-blue-600 shadow-sm' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Grid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded transition-colors ${
                      viewMode === 'list' 
                        ? 'bg-white text-blue-600 shadow-sm' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Products Grid/List */}
            <AnimatePresence mode="wait">
              {loading ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className={viewMode === 'grid' 
                    ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' 
                    : 'space-y-4'
                  }
                >
                  {[...Array(12)].map((_, i) => (
                    <SkeletonCard key={i} />
                  ))}
                </motion.div>
              ) : products.length > 0 ? (
                <motion.div
                  key="products"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className={viewMode === 'grid' 
                    ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' 
                    : 'space-y-4'
                  }
                >
                  {products.map((product, index) => (
                    <EnhancedProductCard
                      key={product._id}
                      product={product}
                      index={index}
                      viewMode={viewMode}
                    />
                  ))}
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="text-center py-16"
                >
                  <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Aucun produit trouvé
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Essayez d'ajuster vos filtres ou votre recherche
                  </p>
                  <button
                    onClick={handleClearFilters}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Effacer les filtres
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-center items-center space-x-2 mt-12"
              >
                <button
                  onClick={() => handlePageChange(filters.page - 1)}
                  disabled={!pagination.hasPrev}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                >
                  Précédent
                </button>
                
                <div className="flex space-x-1">
                  {[...Array(pagination.totalPages)].map((_, i) => {
                    const page = i + 1;
                    const isCurrentPage = page === filters.page;
                    
                    // Show only a few pages around current page
                    if (
                      page === 1 || 
                      page === pagination.totalPages || 
                      (page >= filters.page - 2 && page <= filters.page + 2)
                    ) {
                      return (
                        <button
                          key={page}
                          onClick={() => handlePageChange(page)}
                          className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                            isCurrentPage
                              ? 'bg-blue-600 text-white'
                              : 'border border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    } else if (
                      page === filters.page - 3 || 
                      page === filters.page + 3
                    ) {
                      return <span key={page} className="px-2 text-gray-400">...</span>;
                    }
                    return null;
                  })}
                </div>
                
                <button
                  onClick={() => handlePageChange(filters.page + 1)}
                  disabled={!pagination.hasNext}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                >
                  Suivant
                </button>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedShop;
