import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  Package,
  DollarSign,
  Tag,
  Image as ImageIcon,
  Save,
  X,
  Upload,
  FileSpreadsheet,
  ImagePlus
} from 'lucide-react';
import api from '../../utils/adminApi';
import AnimatedButton from '../../components/AnimatedButton';
import { showPlaceholderOnError } from '../../utils/images';
import VariantsEditor from '../../components/admin/VariantsEditor';
import { variantsToForm, variantsFromForm } from '../../components/admin/variantRows';
import ProductImport from '../../components/admin/ProductImport';
import ProductPhotosImport from '../../components/admin/ProductPhotosImport';

const PAGE_SIZE = 24;

const STOCK_TABS = [
  { value: 'all', label: 'All' },
  { value: 'low', label: 'Low stock' },
  { value: 'out', label: 'Out of stock' }
];

const SORTS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'name', label: 'Name A-Z' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'stock', label: 'Stock: lowest first' }
];

const UPLOADABLE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const Products = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [appliedSearch, setAppliedSearch] = useState(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [stockFilter, setStockFilter] = useState(searchParams.get('stock') || 'all');
  const [sort, setSort] = useState(searchParams.get('sort') || 'newest');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalPages: 1, totalProducts: 0 });
  const [stockCounts, setStockCounts] = useState({ all: 0, low: 0, out: 0 });
  const [lowStockThreshold, setLowStockThreshold] = useState(5);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showPhotos, setShowPhotos] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    brand: '',
    image: '',
    stock: '',
    featured: false,
    variants: [],
    priceOnRequest: false,
    backorder: false
  });

  // Categories come from Admin → Categories; products store their slug
  const [categoryList, setCategoryList] = useState([]);
  // Brands come from Admin → Brands; products store the brand's name
  const [brandList, setBrandList] = useState([]);
  const categories = [
    { value: '', label: 'All Categories' },
    ...categoryList.map(category => ({
      value: category.slug,
      label: category.isActive ? category.name : `${category.name} (hidden in shop)`
    }))
  ];

  // Links from the admin top bar (search results, notifications) set
  // ?search=, ?stock= or ?sort=
  const [linkedFilters, setLinkedFilters] = useState(searchParams.toString());
  if (linkedFilters !== searchParams.toString()) {
    setLinkedFilters(searchParams.toString());
    setSearchTerm(searchParams.get('search') || '');
    setAppliedSearch(searchParams.get('search') || '');
    setStockFilter(searchParams.get('stock') || 'all');
    setSort(searchParams.get('sort') || 'newest');
    setSelectedCategory('');
    setPage(1);
  }

  // Search on the server once typing pauses
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm.trim() !== appliedSearch) {
        setAppliedSearch(searchTerm.trim());
        setPage(1);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, appliedSearch]);

  useEffect(() => {
    fetchCategories();
    fetchBrands();
  }, []);

  const fetchBrands = async () => {
    try {
      const response = await api.get('/admin/brands', { params: { limit: 100, sortBy: 'name' } });
      setBrandList(response.data.brands);
    } catch (error) {
      console.error('Error fetching brands:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get('/admin/categories', { params: { limit: 100 } });
      setCategoryList(response.data.categories);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  // Every product, including out-of-stock ones (the shop's list hides them)
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/products', {
        params: {
          page,
          limit: PAGE_SIZE,
          search: appliedSearch || undefined,
          category: selectedCategory || undefined,
          stock: stockFilter,
          sort
        }
      });
      setProducts(response.data.products);
      setPagination(response.data.pagination);
      setStockCounts(response.data.stockCounts);
      setLowStockThreshold(response.data.lowStockThreshold);
      setLoadError('');
    } catch (error) {
      console.error('Error fetching products:', error);
      setLoadError(error.response?.status === 403
        ? 'You do not have permission to manage products.'
        : 'Products could not be loaded. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [page, appliedSearch, selectedCategory, stockFilter, sort]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const stockBadge = (product) => {
    const stock = product.stockQuantity ?? 0;
    if (stock <= 0) return { label: 'Out of stock', className: 'bg-red-600 text-white' };
    if (stock <= lowStockThreshold) return { label: `Low stock: ${stock}`, className: 'bg-orange-500 text-white' };
    return { label: `Stock: ${stock}`, className: 'bg-white/90 text-gray-900' };
  };

  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState('');

  // Uploads the chosen photo right away and puts its URL in the form
  const handleImageFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow picking the same file again
    if (!file) {
      return;
    }

    // Quick checks for a friendly message; the server checks the file itself
    if (!UPLOADABLE_TYPES.includes(file.type)) {
      setImageError('Choose a JPEG, PNG or WebP image.');
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setImageError('The image must be 5 MB or smaller.');
      return;
    }

    setImageError('');
    setUploadingImage(true);
    try {
      const body = new FormData();
      body.append('image', file);
      const response = await api.post('/admin/uploads/product-image', body, { timeout: 60000 });
      setFormData(prev => ({ ...prev, image: response.data.url }));
    } catch (error) {
      setImageError(error.response?.data?.message || 'Upload failed. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const withVersions = formData.variants.length > 0;
      const productData = {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        brand: formData.brand,
        featured: formData.featured,
        backorder: formData.backorder,
        image: formData.image || '/api/placeholder/300/200',
        variants: variantsFromForm(formData.variants),
        ...(!withVersions && {
          priceOnRequest: formData.priceOnRequest,
          price: formData.priceOnRequest ? 0 : parseFloat(formData.price),
          stockQuantity: parseInt(formData.stock),
          inStock: parseInt(formData.stock) > 0
        })
      };

      if (editingProduct) {
        await api.put(`/products/${editingProduct._id}`, productData);
      } else {
        await api.post('/products', productData);
      }
      // Reload: the product may now belong to another filter or page
      fetchProducts();

      resetForm();
      setShowAddModal(false);
      setEditingProduct(null);
    } catch (error) {
      console.error('Error saving product:', error);
      const errorMessage = error.response?.data?.errors
        ? error.response.data.errors.map(err => err.msg).join(', ')
        : error.response?.data?.message || error.message;
      alert('Error saving product: ' + errorMessage);
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      price: product.price.toString(),
      category: product.category,
      brand: product.brand || '',
      image: product.image,
      stock: (product.stockQuantity || product.stock || 0).toString(),
      featured: product.featured || false,
      variants: variantsToForm(product.variants),
      priceOnRequest: Boolean(product.priceOnRequest),
      backorder: Boolean(product.backorder)
    });
    setShowAddModal(true);
  };

  const handleDelete = async (productId) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await api.delete(`/products/${productId}`);
        fetchProducts();
      } catch (error) {
        console.error('Error deleting product:', error);
        alert('Error deleting product: ' + (error.response?.data?.message || error.message));
      }
    }
  };

  const resetForm = () => {
    setImageError('');
    setFormData({
      name: '',
      description: '',
      price: '',
      category: '',
      brand: '',
      image: '',
      stock: '',
      featured: false,
      variants: [],
      priceOnRequest: false,
      backorder: false
    });
  };

  const getCategoryLabel = (product) => {
    const cat = categories.find(c => c.value === product.category);
    return cat ? cat.label : (product.categoryName || product.category);
  };

  const filtersApplied = appliedSearch || selectedCategory || stockFilter !== 'all';

  if (loading && products.length === 0 && !loadError) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="h-8 bg-gray-300 rounded w-48 animate-pulse"></div>
          <div className="h-10 bg-gray-300 rounded w-32 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-surface rounded-2xl p-6 shadow-lg animate-pulse">
              <div className="h-48 bg-gray-300 rounded-lg mb-4"></div>
              <div className="h-4 bg-gray-300 rounded mb-2"></div>
              <div className="h-4 bg-gray-300 rounded w-2/3 mb-4"></div>
              <div className="h-6 bg-gray-300 rounded w-1/3"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Package className="w-8 h-8 mr-3 text-blue-600" />
            Products Management
          </h1>
          <p className="text-gray-600 mt-1">
            Manage your product catalog
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setShowImport(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-surface px-4 py-3 font-medium text-gray-700 hover:bg-gray-50"
          >
            <FileSpreadsheet className="w-5 h-5 text-green-600" />
            Import from Excel
          </button>
          <button
            type="button"
            onClick={() => setShowPhotos(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-surface px-4 py-3 font-medium text-gray-700 hover:bg-gray-50"
          >
            <ImagePlus className="w-5 h-5 text-blue-600" />
            Import photos
          </button>
          <AnimatedButton
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>Add Product</span>
          </AnimatedButton>
        </div>
      </motion.div>

      {showImport && <ProductImport onClose={() => setShowImport(false)} onImported={fetchProducts} />}
      {showPhotos && <ProductPhotosImport onClose={() => setShowPhotos(false)} onImported={fetchProducts} />}

      {/* Filters */}
      <motion.div
        className="bg-surface rounded-2xl p-6 shadow-lg border border-gray-100"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="sm:w-48">
            <select
              aria-label="Category"
              value={selectedCategory}
              onChange={(e) => { setSelectedCategory(e.target.value); setPage(1); }}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {categories.map(category => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:w-52">
            <select
              aria-label="Sort"
              value={sort}
              onChange={(e) => { setSort(e.target.value); setPage(1); }}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {SORTS.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Stock */}
        <div className="flex flex-wrap gap-2 mt-4" role="tablist" aria-label="Stock">
          {STOCK_TABS.map(tab => (
            <button
              key={tab.value}
              role="tab"
              aria-selected={stockFilter === tab.value}
              onClick={() => { setStockFilter(tab.value); setPage(1); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                stockFilter === tab.value
                  ? tab.value === 'out' ? 'bg-red-600 text-white' : tab.value === 'low' ? 'bg-orange-500 text-white' : 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {tab.label} ({stockCounts[tab.value]})
            </button>
          ))}
          <span className="self-center text-sm text-gray-500 ml-2">
            Low stock means {lowStockThreshold} units or fewer
          </span>
        </div>
      </motion.div>

      {loadError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center justify-between">
          <span>{loadError}</span>
          <button onClick={fetchProducts} className="font-medium underline">Try again</button>
        </div>
      )}

      {/* Products Grid */}
      <motion.div
        className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 transition-opacity ${loading ? 'opacity-60' : ''}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
        <AnimatePresence>
          {products.map((product, index) => (
            <motion.div
              key={product._id}
              className="bg-surface rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden group"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, delay: Math.min(index, 8) * 0.05 }}
              whileHover={{ y: -5 }}
            >
              <div className="relative">
                <img
                  src={product.image}
                  onError={showPlaceholderOnError}
                  alt={product.name}
                  className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                />
                {product.featured && (
                  <div className="absolute top-3 left-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                    Featured
                  </div>
                )}
                <div className={`absolute top-3 right-3 backdrop-blur-sm rounded-full px-2 py-1 text-xs font-medium ${stockBadge(product).className}`}>
                  {stockBadge(product).label}
                </div>
              </div>
              
              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors duration-300">
                      {product.name}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                      {product.description}
                    </p>
                    <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                      {getCategoryLabel(product)}
                    </span>
                    {product.brand && (
                      <span className="inline-block ml-2 bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full">
                        {product.brand}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-blue-600">
                      {product.priceOnRequest ? 'On request' : `${product.variants?.length > 1 ? 'from ' : ''}${product.price} TND`}
                    </div>
                    {(product.variants?.length > 0 || product.backorder) && (
                      <p className="text-xs text-gray-500">
                        {[product.variants?.length > 0 && `${product.variants.length} version${product.variants.length > 1 ? 's' : ''}`, product.backorder && 'sold on order'].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <motion.button
                      onClick={() => handleEdit(product)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-300"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <Edit className="w-4 h-4" />
                    </motion.button>
                    <motion.button
                      onClick={() => handleDelete(product._id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-300"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => setPage(page - 1)}
            disabled={page <= 1 || loading}
            className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {page} of {pagination.totalPages} · {pagination.totalProducts} products
          </span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={page >= pagination.totalPages || loading}
            className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {products.length === 0 && !loading && !loadError && (
        <motion.div
          className="text-center py-12"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No products found</h3>
          {filtersApplied ? (
            <p className="text-gray-600 mb-6">Try adjusting your search or filters</p>
          ) : (
            <>
              <p className="text-gray-600 mb-6">Your catalog is empty</p>
              <AnimatedButton onClick={() => setShowAddModal(true)}>
                Add Your First Product
              </AnimatedButton>
            </>
          )}
        </motion.div>
      )}

      {/* Add/Edit Product Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-surface rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {editingProduct ? 'Edit Product' : 'Add New Product'}
                  </h2>
                  <button
                    onClick={() => {
                      setShowAddModal(false);
                      setEditingProduct(null);
                      resetForm();
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Product Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter product name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category
                    </label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select category</option>
                      {categories.slice(1).map(category => (
                        <option key={category.value} value={category.value}>
                          {category.label}
                        </option>
                      ))}
                    </select>
                    {categoryList.length === 0 && (
                      <p className="mt-2 text-sm text-gray-500">
                        No categories yet. Create one in <Link to="/admin/categories" className="text-blue-600 underline">Categories</Link> first.
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Brand
                    </label>
                    <select
                      name="brand"
                      value={formData.brand}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">No brand</option>
                      {brandList.map(brand => (
                        <option key={brand._id} value={brand.name}>
                          {brand.isActive ? brand.name : `${brand.name} (hidden in shop)`}
                        </option>
                      ))}
                    </select>
                    <p className="mt-2 text-sm text-gray-500">
                      Manage brands in <Link to="/admin/brands" className="text-blue-600 underline">Brands</Link>.
                    </p>
                  </div>

                  {formData.variants.length === 0 && (
                    <>
                      <div>
                        <label htmlFor="product-price" className="block text-sm font-medium text-gray-700 mb-2">
                          Price (TND)
                        </label>
                        <input
                          id="product-price"
                          type="number"
                          name="price"
                          value={formData.priceOnRequest ? '' : formData.price}
                          onChange={handleInputChange}
                          required={!formData.priceOnRequest}
                          disabled={formData.priceOnRequest}
                          step="0.01"
                          min="0"
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                          placeholder={formData.priceOnRequest ? 'On request' : '0.00'}
                        />
                        <label className="mt-2 flex items-center gap-2 text-sm text-gray-700">
                          <input type="checkbox" name="priceOnRequest" checked={formData.priceOnRequest} onChange={handleInputChange} className="w-4 h-4 rounded" />
                          Price on request (customers ask for a quote)
                        </label>
                      </div>

                      <div>
                        <label htmlFor="product-stock" className="block text-sm font-medium text-gray-700 mb-2">
                          Stock Quantity
                        </label>
                        <input
                          id="product-stock"
                          type="number"
                          name="stock"
                          value={formData.stock}
                          onChange={handleInputChange}
                          required
                          min="0"
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="0"
                        />
                      </div>
                    </>
                  )}
                </div>

                <div>
                  <p className="block text-sm font-medium text-gray-700 mb-2">Versions</p>
                  <VariantsEditor value={formData.variants} onChange={(variants) => setFormData(prev => ({ ...prev, variants }))} />
                </div>

                <label className="flex items-start gap-2 text-sm text-gray-700">
                  <input type="checkbox" name="backorder" checked={formData.backorder} onChange={handleInputChange} className="mt-0.5 w-4 h-4 rounded" />
                  <span><span className="font-medium">Sold on order</span> (“Sur commande”): customers can order it when it is out of stock, and you order it from the supplier.</span>
                </label>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    required
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter product description"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Photo
                  </label>
                  <div className="flex items-start gap-4">
                    <div className="w-28 h-28 flex-shrink-0 rounded-xl border border-gray-200 bg-gray-50 overflow-hidden">
                      <img
                        src={formData.image || '/api/placeholder/300/300'}
                        onError={showPlaceholderOnError}
                        alt="Product photo preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 space-y-2">
                      <label
                        className={`inline-flex items-center px-4 py-2 rounded-xl border border-gray-300 text-sm font-medium ${
                          uploadingImage ? 'bg-gray-100 text-gray-400 cursor-wait' : 'bg-surface text-gray-700 hover:bg-gray-50 cursor-pointer'
                        }`}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {uploadingImage ? 'Uploading…' : 'Upload photo'}
                        <input
                          type="file"
                          name="imageFile"
                          accept={UPLOADABLE_TYPES.join(',')}
                          onChange={handleImageFile}
                          disabled={uploadingImage}
                          className="sr-only"
                        />
                      </label>
                      <p className="text-xs text-gray-500">JPEG, PNG or WebP, up to 5 MB. Or paste a link:</p>
                      <input
                        type="text"
                        name="image"
                        value={formData.image}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="https://example.com/image.jpg"
                      />
                      {imageError && <p className="text-sm text-red-600">{imageError}</p>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="featured"
                    id="featured"
                    checked={formData.featured}
                    onChange={handleInputChange}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="featured" className="ml-2 text-sm font-medium text-gray-700">
                    Featured Product
                  </label>
                </div>

                <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      setEditingProduct(null);
                      resetForm();
                    }}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <AnimatedButton type="submit" disabled={uploadingImage}>
                    <Save className="w-4 h-4 mr-2" />
                    {editingProduct ? 'Update Product' : 'Add Product'}
                  </AnimatedButton>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Products;
