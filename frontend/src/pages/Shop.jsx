import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useCart } from '../context/CartContext';
import { Filter, Grid, List, Search, SlidersHorizontal, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import AnimatedProductCard from '../components/AnimatedProductCard';
import { SkeletonCard } from '../components/LoadingSpinner';
import AnimatedButton from '../components/AnimatedButton';

const Shop = () => {
  const { t } = useLanguage();
  const { addToCart } = useCart();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const [filters, setFilters] = useState({
    category: searchParams.get('category') || '',
    minPrice: '',
    maxPrice: '',
    search: ''
  });

  // Sample products data (will be replaced with API call)
  const sampleProducts = [
    {
      _id: '1',
      name: 'Moteur de Piscine 1.5HP',
      price: 850,
      image: '/api/placeholder/300/200',
      category: 'motors',
      description: 'Moteur haute performance pour piscines résidentielles'
    },
    {
      _id: '2',
      name: 'Filtre à Sable Premium',
      price: 450,
      image: '/api/placeholder/300/200',
      category: 'filters',
      description: 'Système de filtration efficace pour eau cristalline'
    },
    {
      _id: '3',
      name: 'Chlore Granulé 5kg',
      price: 65,
      image: '/api/placeholder/300/200',
      category: 'chemicals',
      description: 'Désinfectant pour maintenir la qualité de l\'eau'
    },
    {
      _id: '4',
      name: 'Moteur de Piscine 2HP',
      price: 1200,
      image: '/api/placeholder/300/200',
      category: 'motors',
      description: 'Moteur puissant pour grandes piscines'
    },
    {
      _id: '5',
      name: 'Filtre Cartouche',
      price: 180,
      image: '/api/placeholder/300/200',
      category: 'filters',
      description: 'Filtre cartouche facile à nettoyer'
    },
    {
      _id: '6',
      name: 'pH Minus 1kg',
      price: 25,
      image: '/api/placeholder/300/200',
      category: 'chemicals',
      description: 'Régulateur de pH pour équilibrer l\'eau'
    },
    {
      _id: '7',
      name: 'Pompe à Chaleur 12kW',
      price: 2500,
      image: '/api/placeholder/300/200',
      category: 'motors',
      description: 'Chauffage efficace pour votre piscine'
    },
    {
      _id: '8',
      name: 'Filtre DE (Terre de Diatomée)',
      price: 680,
      image: '/api/placeholder/300/200',
      category: 'filters',
      description: 'Filtration ultra-fine avec terre de diatomée'
    }
  ];

  const categories = [
    { value: '', label: 'Toutes les catégories' },
    { value: 'motors', label: t('motors') },
    { value: 'filters', label: t('filters') },
    { value: 'chemicals', label: t('chemicals') }
  ];

  useEffect(() => {
    fetchProducts();
  }, [filters]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      // TODO: Replace with actual API call
      // const response = await axios.get('/api/products', { params: filters });
      // setProducts(response.data);
      
      // For now, use sample data with filtering
      let filteredProducts = sampleProducts;
      
      if (filters.category) {
        filteredProducts = filteredProducts.filter(p => p.category === filters.category);
      }
      
      if (filters.search) {
        filteredProducts = filteredProducts.filter(p => 
          p.name.toLowerCase().includes(filters.search.toLowerCase())
        );
      }
      
      if (filters.minPrice) {
        filteredProducts = filteredProducts.filter(p => p.price >= parseFloat(filters.minPrice));
      }
      
      if (filters.maxPrice) {
        filteredProducts = filteredProducts.filter(p => p.price <= parseFloat(filters.maxPrice));
      }
      
      setProducts(filteredProducts);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    
    // Update URL params
    const newSearchParams = new URLSearchParams();
    Object.entries(newFilters).forEach(([k, v]) => {
      if (v) newSearchParams.set(k, v);
    });
    setSearchParams(newSearchParams);
  };

  const handleAddToCart = (product) => {
    addToCart(product);
    // You could add a toast notification here
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          className="mb-12 text-center"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <motion.h1
            className="text-4xl md:text-5xl font-bold text-gray-900 mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
              {t('shop')}
            </span>
          </motion.h1>
          <motion.p
            className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            Découvrez notre gamme complète d'équipements de piscine de haute qualité
          </motion.p>

          {/* Decorative Elements */}
          <motion.div
            className="absolute top-20 left-10 text-blue-300 opacity-20"
            animate={{
              y: [-10, 10, -10],
              rotate: [0, 180, 360],
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <Sparkles className="w-8 h-8" />
          </motion.div>
        </motion.div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <motion.div
            className="lg:w-64 space-y-6"
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            <motion.div
              className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 border border-blue-100"
              whileHover={{ y: -2 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <motion.h3
                className="text-lg font-semibold text-gray-900 mb-6 flex items-center"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
              >
                <motion.div
                  className="mr-3 p-2 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-lg"
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.6 }}
                >
                  <SlidersHorizontal className="w-5 h-5 text-blue-600" />
                </motion.div>
                <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                  Filtres
                </span>
              </motion.h3>
              
              {/* Search */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rechercher
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Rechercher un produit..."
                  />
                </div>
              </div>

              {/* Category Filter */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Catégorie
                </label>
                <select
                  value={filters.category}
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  {categories.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Price Range */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prix ({t('currency')})
                </label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    value={filters.minPrice}
                    onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                    placeholder="Min"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <input
                    type="number"
                    value={filters.maxPrice}
                    onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                    placeholder="Max"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Products Grid */}
          <div className="flex-1">
            {/* View Controls */}
            <div className="flex justify-between items-center mb-6">
              <p className="text-gray-600">
                {products.length} produit(s) trouvé(s)
              </p>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-primary-100 text-primary-600' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  <Grid className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-primary-100 text-primary-600' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  <List className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Products */}
            <AnimatePresence mode="wait">
              {loading ? (
                <motion.div
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {[...Array(6)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: i * 0.1 }}
                    >
                      <SkeletonCard />
                    </motion.div>
                  ))}
                </motion.div>
              ) : products.length === 0 ? (
                <motion.div
                  className="text-center py-20"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.5 }}
                >
                  <motion.div
                    className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-full flex items-center justify-center"
                    animate={{
                      scale: [1, 1.1, 1],
                      rotate: [0, 180, 360],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  >
                    <Search className="w-12 h-12 text-blue-600" />
                  </motion.div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Aucun produit trouvé</h3>
                  <p className="text-gray-600 mb-6">Essayez de modifier vos filtres de recherche</p>
                  <AnimatedButton
                    variant="outline"
                    onClick={() => {
                      setFilters({
                        category: '',
                        minPrice: '',
                        maxPrice: '',
                        search: ''
                      });
                    }}
                  >
                    Réinitialiser les filtres
                  </AnimatedButton>
                </motion.div>
              ) : (
                <motion.div
                  className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  {products.map((product, index) => (
                    viewMode === 'grid' ? (
                      <AnimatedProductCard
                        key={product._id}
                        product={product}
                        index={index}
                      />
                    ) : (
                      <motion.div
                        key={product._id}
                        className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 flex group"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                        whileHover={{ y: -2 }}
                      >
                        <div className="w-48 h-32 overflow-hidden">
                          <motion.img
                            src={product.image}
                            alt={product.name}
                            className="w-full h-full object-cover"
                            whileHover={{ scale: 1.1 }}
                            transition={{ duration: 0.4 }}
                          />
                        </div>
                        <div className="p-6 flex-1 flex justify-between items-center">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors duration-300">
                              {product.name}
                            </h3>
                            <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                              {product.description}
                            </p>
                            <span className="text-2xl font-bold text-blue-600">
                              {product.price} {t('currency')}
                            </span>
                          </div>
                          <div className="flex flex-col space-y-2">
                            <Link to={`/product/${product._id}`}>
                              <AnimatedButton variant="outline" size="small">
                                Détails
                              </AnimatedButton>
                            </Link>
                            <AnimatedButton
                              size="small"
                              onClick={() => handleAddToCart(product)}
                            >
                              {t('addToCart')}
                            </AnimatedButton>
                          </div>
                        </div>
                      </motion.div>
                    )
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Shop;
