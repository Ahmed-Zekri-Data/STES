import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Award,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Search,
  Star,
  Globe,
  MapPin
} from 'lucide-react';
import AnimatedButton from '../../components/AnimatedButton';
import LoadingSpinner from '../../components/LoadingSpinner';

const Brands = () => {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBrand, setEditingBrand] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    logo: '',
    website: '',
    country: '',
    isActive: true,
    isFeatured: false,
    sortOrder: 0,
    contactInfo: {
      email: '',
      phone: '',
      address: ''
    }
  });

  const statusOptions = [
    { value: '', label: 'All Brands' },
    { value: 'true', label: 'Active' },
    { value: 'false', label: 'Inactive' }
  ];

  useEffect(() => {
    fetchBrands();
  }, []);

  const fetchBrands = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/admin/brands');
      setBrands(response.data.brands || response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching brands:', error);
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const brandData = {
        ...formData,
        sortOrder: parseInt(formData.sortOrder)
      };

      if (editingBrand) {
        // Update existing brand
        const response = await axios.put(`/api/admin/brands/${editingBrand._id}`, brandData);
        setBrands(prev => prev.map(brand =>
          brand._id === editingBrand._id ? response.data : brand
        ));
      } else {
        // Add new brand
        const response = await axios.post('/api/admin/brands', brandData);
        setBrands(prev => [response.data, ...prev]);
      }

      resetForm();
      setShowAddModal(false);
      setEditingBrand(null);
    } catch (error) {
      console.error('Error saving brand:', error);
      alert('Error saving brand: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleEdit = (brand) => {
    setEditingBrand(brand);
    setFormData({
      name: brand.name,
      description: brand.description,
      logo: brand.logo || '',
      website: brand.website || '',
      country: brand.country || '',
      isActive: brand.isActive,
      isFeatured: brand.isFeatured,
      sortOrder: brand.sortOrder,
      contactInfo: brand.contactInfo || {
        email: '',
        phone: '',
        address: ''
      }
    });
    setShowAddModal(true);
  };

  const handleDelete = async (brandId) => {
    if (window.confirm('Are you sure you want to delete this brand?')) {
      setBrands(prev => prev.filter(brand => brand._id !== brandId));
    }
  };

  const handleToggleStatus = async (brandId) => {
    setBrands(prev => prev.map(brand => 
      brand._id === brandId 
        ? { ...brand, isActive: !brand.isActive }
        : brand
    ));
  };

  const handleToggleFeatured = async (brandId) => {
    setBrands(prev => prev.map(brand => 
      brand._id === brandId 
        ? { ...brand, isFeatured: !brand.isFeatured }
        : brand
    ));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      logo: '',
      website: '',
      country: '',
      isActive: true,
      isFeatured: false,
      sortOrder: 0,
      contactInfo: {
        email: '',
        phone: '',
        address: ''
      }
    });
  };

  const filteredBrands = brands.filter(brand => {
    const matchesSearch = brand.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         brand.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         brand.country.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === '' || brand.isActive.toString() === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
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
            <Award className="w-8 h-8 mr-3 text-blue-600" />
            Brands Management
          </h1>
          <p className="text-gray-600 mt-1">
            Manage product brands and manufacturers
          </p>
        </div>
        <AnimatedButton
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>Add Brand</span>
        </AnimatedButton>
      </motion.div>

      {/* Filters */}
      <motion.div
        className="bg-white rounded-lg shadow p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search brands..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="sm:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </motion.div>

      {/* Brands Table */}
      <motion.div
        className="bg-white rounded-lg shadow overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Brand
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Country
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Products
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Featured
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredBrands.map((brand, index) => (
                <motion.tr
                  key={brand._id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="hover:bg-gray-50"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-12 w-20">
                        {brand.logo ? (
                          <img
                            className="h-12 w-20 object-contain rounded"
                            src={brand.logo}
                            alt={brand.name}
                          />
                        ) : (
                          <div className="h-12 w-20 bg-gray-200 rounded flex items-center justify-center">
                            <Award className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {brand.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {brand.description}
                        </div>
                        {brand.website && (
                          <a
                            href={brand.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:text-blue-800 flex items-center mt-1"
                          >
                            <Globe className="w-3 h-3 mr-1" />
                            Website
                          </a>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-900">
                      <MapPin className="w-4 h-4 mr-1 text-gray-400" />
                      {brand.country}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {brand.productCount} products
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleToggleStatus(brand._id)}
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        brand.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {brand.isActive ? (
                        <>
                          <Eye className="w-3 h-3 mr-1" />
                          Active
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3 h-3 mr-1" />
                          Inactive
                        </>
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleToggleFeatured(brand._id)}
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        brand.isFeatured
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      <Star className={`w-3 h-3 mr-1 ${brand.isFeatured ? 'fill-current' : ''}`} />
                      {brand.isFeatured ? 'Featured' : 'Regular'}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => handleEdit(brand)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(brand._id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div
            className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {editingBrand ? 'Edit Brand' : 'Add New Brand'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Brand Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Country
                  </label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Logo URL
                  </label>
                  <input
                    type="url"
                    value={formData.logo}
                    onChange={(e) => setFormData({ ...formData, logo: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Website
                  </label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Contact Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.contactInfo.email}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        contactInfo: { ...formData.contactInfo, email: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.contactInfo.phone}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        contactInfo: { ...formData.contactInfo, phone: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="mt-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address
                  </label>
                  <textarea
                    value={formData.contactInfo.address}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      contactInfo: { ...formData.contactInfo, address: e.target.value }
                    })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sort Order
                  </label>
                  <input
                    type="number"
                    value={formData.sortOrder}
                    onChange={(e) => setFormData({ ...formData, sortOrder: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="flex items-center space-x-4 pt-6">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                      Active
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isFeatured"
                      checked={formData.isFeatured}
                      onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="isFeatured" className="ml-2 block text-sm text-gray-900">
                      Featured
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingBrand(null);
                    resetForm();
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <AnimatedButton type="submit">
                  {editingBrand ? 'Update' : 'Create'}
                </AnimatedButton>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Brands;
