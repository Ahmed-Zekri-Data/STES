import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Plus,
  Edit,
  Eye,
  EyeOff,
  Search,
  Mail,
  Phone,
  MapPin,
  Calendar,
  ShoppingBag,
  Star,
  CheckCircle,
  XCircle
} from 'lucide-react';
import AnimatedButton from '../../components/AnimatedButton';
import LoadingSpinner from '../../components/LoadingSpinner';

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [verificationFilter, setVerificationFilter] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const statusOptions = [
    { value: '', label: 'All Customers' },
    { value: 'true', label: 'Active' },
    { value: 'false', label: 'Inactive' }
  ];

  const verificationOptions = [
    { value: '', label: 'All Verification Status' },
    { value: 'true', label: 'Verified' },
    { value: 'false', label: 'Unverified' }
  ];

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/admin/customers');
      setCustomers(response.data.customers || response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching customers:', error);
      setLoading(false);
    }
  };

  const handleToggleStatus = async (customerId) => {
    try {
      await axios.put(`/api/admin/customers/${customerId}/toggle-status`);
      setCustomers(prev => prev.map(customer =>
        customer._id === customerId
          ? { ...customer, isActive: !customer.isActive }
          : customer
      ));
    } catch (error) {
      console.error('Error toggling customer status:', error);
      alert('Error updating customer status: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleVerifyEmail = async (customerId) => {
    try {
      await axios.put(`/api/admin/customers/${customerId}/verify-email`);
      setCustomers(prev => prev.map(customer =>
        customer._id === customerId
          ? { ...customer, isEmailVerified: true }
          : customer
      ));
    } catch (error) {
      console.error('Error verifying customer email:', error);
      alert('Error verifying email: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleViewDetails = (customer) => {
    setSelectedCustomer(customer);
    setShowDetailsModal(true);
  };

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = customer.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customer.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customer.phone.includes(searchTerm);
    const matchesStatus = statusFilter === '' || customer.isActive.toString() === statusFilter;
    const matchesVerification = verificationFilter === '' || customer.isEmailVerified.toString() === verificationFilter;
    return matchesSearch && matchesStatus && matchesVerification;
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
            <Users className="w-8 h-8 mr-3 text-blue-600" />
            Customers Management
          </h1>
          <p className="text-gray-600 mt-1">
            Manage customer accounts and information
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-600">
            Total: {customers.length} customers
          </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-4 gap-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Customers</p>
              <p className="text-2xl font-bold text-gray-900">{customers.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active</p>
              <p className="text-2xl font-bold text-gray-900">
                {customers.filter(c => c.isActive).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Mail className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Verified</p>
              <p className="text-2xl font-bold text-gray-900">
                {customers.filter(c => c.isEmailVerified).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <ShoppingBag className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900">
                {customers.reduce((sum, c) => sum + c.orderCount, 0)}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        className="bg-white rounded-lg shadow p-6"
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
                placeholder="Search customers..."
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
          <div className="sm:w-48">
            <select
              value={verificationFilter}
              onChange={(e) => setVerificationFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {verificationOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </motion.div>

      {/* Customers Table */}
      <motion.div
        className="bg-white rounded-lg shadow overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
      >
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Orders & Spending
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Joined
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCustomers.map((customer, index) => (
                <motion.tr
                  key={customer._id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="hover:bg-gray-50"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                          <span className="text-white font-medium">
                            {customer.firstName.charAt(0)}{customer.lastName.charAt(0)}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {customer.firstName} {customer.lastName}
                        </div>
                        <div className="text-sm text-gray-500 flex items-center">
                          <Star className="w-3 h-3 mr-1 text-yellow-400" />
                          {customer.loyaltyPoints} points
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      <div className="flex items-center mb-1">
                        <Mail className="w-4 h-4 mr-2 text-gray-400" />
                        {customer.email}
                        {customer.isEmailVerified && (
                          <CheckCircle className="w-4 h-4 ml-1 text-green-500" />
                        )}
                      </div>
                      <div className="flex items-center">
                        <Phone className="w-4 h-4 mr-2 text-gray-400" />
                        {customer.phone}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      <div className="flex items-center mb-1">
                        <ShoppingBag className="w-4 h-4 mr-2 text-gray-400" />
                        {customer.orderCount} orders
                      </div>
                      <div className="text-sm font-medium text-green-600">
                        {customer.totalSpent.toFixed(2)} TND
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      <button
                        onClick={() => handleToggleStatus(customer._id)}
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          customer.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {customer.isActive ? (
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
                      {!customer.isEmailVerified && (
                        <button
                          onClick={() => handleVerifyEmail(customer._id)}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                        >
                          <Mail className="w-3 h-3 mr-1" />
                          Verify Email
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      {new Date(customer.createdAt).toLocaleDateString('fr-FR')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleViewDetails(customer)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Customer Details Modal */}
      {showDetailsModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div
            className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-medium text-gray-900">
                Customer Details
              </h3>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-6">
              {/* Basic Info */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Basic Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-500">Name</label>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedCustomer.firstName} {selectedCustomer.lastName}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-500">Email</label>
                    <p className="text-sm font-medium text-gray-900 flex items-center">
                      {selectedCustomer.email}
                      {selectedCustomer.isEmailVerified && (
                        <CheckCircle className="w-4 h-4 ml-1 text-green-500" />
                      )}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-500">Phone</label>
                    <p className="text-sm font-medium text-gray-900">{selectedCustomer.phone}</p>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-500">Language</label>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedCustomer.preferences.language.toUpperCase()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Address */}
              {selectedCustomer.addresses && selectedCustomer.addresses.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Address</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-start">
                      <MapPin className="w-5 h-5 text-gray-400 mt-0.5 mr-2" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {selectedCustomer.addresses[0].street}
                        </p>
                        <p className="text-sm text-gray-600">
                          {selectedCustomer.addresses[0].city} {selectedCustomer.addresses[0].postalCode}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Stats */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Statistics</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-blue-600">{selectedCustomer.orderCount}</p>
                    <p className="text-sm text-blue-600">Orders</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-green-600">
                      {selectedCustomer.totalSpent.toFixed(0)}
                    </p>
                    <p className="text-sm text-green-600">TND Spent</p>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-yellow-600">{selectedCustomer.loyaltyPoints}</p>
                    <p className="text-sm text-yellow-600">Points</p>
                  </div>
                </div>
              </div>

              {/* Account Info */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Account Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-500">Member Since</label>
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(selectedCustomer.createdAt).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-500">Last Login</label>
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(selectedCustomer.lastLogin).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-500">Newsletter</label>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedCustomer.preferences.newsletter ? 'Subscribed' : 'Not subscribed'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-500">Status</label>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      selectedCustomer.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {selectedCustomer.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Customers;
