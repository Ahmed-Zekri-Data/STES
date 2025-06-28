import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Package, 
  Clock, 
  Truck, 
  CheckCircle, 
  XCircle, 
  Eye,
  Edit,
  Search,
  Filter,
  Calendar,
  Mail,
  Phone,
  MapPin,
  Plus,
  Save,
  X
} from 'lucide-react';
import api from '../../utils/axios';
import LoadingSpinner from '../LoadingSpinner';

const OrderManagement = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    search: '',
    page: 1
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalOrders: 0
  });

  useEffect(() => {
    fetchOrders();
  }, [filters.status, filters.page]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await api.get('/orders', {
        params: {
          page: filters.page,
          limit: 20,
          status: filters.status || undefined,
          search: filters.search || undefined
        }
      });

      setOrders(response.data.orders);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'confirmed': return <CheckCircle className="w-4 h-4" />;
      case 'processing': return <Package className="w-4 h-4" />;
      case 'shipped': return <Truck className="w-4 h-4" />;
      case 'delivered': return <CheckCircle className="w-4 h-4" />;
      case 'cancelled': return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'confirmed': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'processing': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'shipped': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'delivered': return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      pending: 'En attente',
      confirmed: 'Confirmée',
      processing: 'En préparation',
      shipped: 'Expédiée',
      delivered: 'Livrée',
      cancelled: 'Annulée'
    };
    return labels[status] || status;
  };

  const handleStatusUpdate = async (orderId, newStatus, trackingNumber = '', note = '', location = '') => {
    try {
      const response = await api.put(`/orders/${orderId}/status`, {
        status: newStatus,
        trackingNumber,
        note,
        location,
        sendNotification: true
      });

      // Update the order in the list
      setOrders(orders.map(order => 
        order._id === orderId ? response.data.order : order
      ));

      setShowStatusModal(false);
      setSelectedOrder(null);
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = !filters.search || 
      order.orderNumber.toLowerCase().includes(filters.search.toLowerCase()) ||
      order.customer.name.toLowerCase().includes(filters.search.toLowerCase()) ||
      order.customer.email.toLowerCase().includes(filters.search.toLowerCase());
    
    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des commandes</h1>
          <div className="mt-1 text-sm text-gray-600">
            {pagination.totalOrders} commande{pagination.totalOrders !== 1 ? 's' : ''}
          </div>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nouvelle commande
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Rechercher par numéro, client..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
            >
              <option value="">Tous les statuts</option>
              <option value="pending">En attente</option>
              <option value="confirmed">Confirmée</option>
              <option value="processing">En préparation</option>
              <option value="shipped">Expédiée</option>
              <option value="delivered">Livrée</option>
              <option value="cancelled">Annulée</option>
            </select>
          </div>

          {/* Quick Actions */}
          <div className="flex space-x-2">
            <button
              onClick={fetchOrders}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Actualiser
            </button>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Commande
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOrders.map((order, index) => (
                <motion.tr
                  key={order._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="hover:bg-gray-50"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {order.orderNumber}
                      </div>
                      <div className="text-sm text-gray-500">
                        {order.trackingCode}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {order.customer.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {order.customer.email}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(order.createdAt).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}>
                      {getStatusIcon(order.status)}
                      <span className="ml-1">{getStatusLabel(order.status)}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {order.totalAmount} TND
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedOrder(order);
                        setShowStatusModal(true);
                      }}
                      className="text-green-600 hover:text-green-900"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center space-x-2">
          <button
            onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
            disabled={pagination.currentPage === 1}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Précédent
          </button>
          
          <span className="px-3 py-2 text-sm text-gray-700">
            Page {pagination.currentPage} sur {pagination.totalPages}
          </span>
          
          <button
            onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
            disabled={pagination.currentPage === pagination.totalPages}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Suivant
          </button>
        </div>
      )}

      {/* Order Details Modal */}
      <AnimatePresence>
        {selectedOrder && !showStatusModal && (
          <OrderDetailsModal 
            order={selectedOrder} 
            onClose={() => setSelectedOrder(null)}
            onEditStatus={() => setShowStatusModal(true)}
          />
        )}
      </AnimatePresence>

      {/* Status Update Modal */}
      <AnimatePresence>
        {showStatusModal && selectedOrder && (
          <StatusUpdateModal
            order={selectedOrder}
            onClose={() => {
              setShowStatusModal(false);
              setSelectedOrder(null);
            }}
            onUpdate={handleStatusUpdate}
          />
        )}
      </AnimatePresence>

      {/* Create Order Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateOrderModal
            onClose={() => setShowCreateModal(false)}
            onOrderCreated={(newOrder) => {
              setOrders(prev => [newOrder, ...prev]);
              setShowCreateModal(false);
              fetchOrders(); // Refresh the list
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// Order Details Modal Component
const OrderDetailsModal = ({ order, onClose, onEditStatus }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Détails de la commande {order.orderNumber}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Order Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Order Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-4">Informations de commande</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Numéro:</span>
                  <span className="font-medium">{order.orderNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Code de suivi:</span>
                  <span className="font-medium">{order.trackingCode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Date:</span>
                  <span className="font-medium">{new Date(order.createdAt).toLocaleDateString('fr-FR')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Statut:</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                    {getStatusIcon(order.status)}
                    <span className="ml-1">{getStatusLabel(order.status)}</span>
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total:</span>
                  <span className="font-bold text-lg">{order.totalAmount} TND</span>
                </div>
              </div>
            </div>

            {/* Customer Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-4">Informations client</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <span className="font-medium">{order.customer.name}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="text-sm">{order.customer.email}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span className="text-sm">{order.customer.phone}</span>
                </div>
                <div className="flex items-start space-x-2">
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div className="text-sm">
                    <div>{order.customer.address.street}</div>
                    <div>{order.customer.address.city}, {order.customer.address.country}</div>
                    {order.customer.address.postalCode && (
                      <div>{order.customer.address.postalCode}</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4">Articles commandés</h3>
            <div className="space-y-3">
              {order.items.map((item, index) => (
                <div key={index} className="flex items-center space-x-4 p-3 border border-gray-200 rounded-lg">
                  {item.image && (
                    <img 
                      src={item.image} 
                      alt={item.name}
                      className="w-16 h-16 rounded object-cover"
                    />
                  )}
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{item.name}</h4>
                    <p className="text-sm text-gray-600">Quantité: {item.quantity}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{item.price} TND</p>
                    <p className="text-sm text-gray-600">Total: {(item.price * item.quantity).toFixed(2)} TND</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-3">
            <button
              onClick={onEditStatus}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Modifier le statut
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// Status Update Modal Component
const StatusUpdateModal = ({ order, onClose, onUpdate }) => {
  const [newStatus, setNewStatus] = useState(order.status);
  const [trackingNumber, setTrackingNumber] = useState(order.trackingNumber || '');
  const [note, setNote] = useState('');
  const [location, setLocation] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onUpdate(order._id, newStatus, trackingNumber, note, location);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-lg shadow-xl max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit} className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              Modifier le statut
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nouveau statut
              </label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="pending">En attente</option>
                <option value="confirmed">Confirmée</option>
                <option value="processing">En préparation</option>
                <option value="shipped">Expédiée</option>
                <option value="delivered">Livrée</option>
                <option value="cancelled">Annulée</option>
              </select>
            </div>

            {/* Tracking Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Numéro de suivi (optionnel)
              </label>
              <input
                type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ex: TN123456789"
              />
            </div>

            {/* Note */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Note (optionnelle)
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ajouter une note sur cette mise à jour..."
              />
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Localisation (optionnelle)
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ex: Centre de tri Tunis"
              />
            </div>
          </div>

          <div className="flex space-x-3 mt-6">
            <button
              type="submit"
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
            >
              <Save className="w-4 h-4 mr-2" />
              Mettre à jour
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Annuler
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

// Create Order Modal Component
const CreateOrderModal = ({ onClose, onOrderCreated }) => {
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [formData, setFormData] = useState({
    customer: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      address: {
        street: '',
        city: '',
        postalCode: '',
        country: 'Tunisia'
      }
    },
    items: [],
    notes: '',
    shippingCost: 0,
    status: 'pending'
  });
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await api.get('/products');
      const productsData = response.data.products || response.data;
      setProducts(productsData);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const addProduct = () => {
    if (!selectedProduct || quantity <= 0) {
      return;
    }

    const product = products.find(p => p._id === selectedProduct);
    if (!product) {
      return;
    }

    const existingItemIndex = formData.items.findIndex(item => item.product === selectedProduct);

    if (existingItemIndex >= 0) {
      // Update existing item
      const updatedItems = [...formData.items];
      updatedItems[existingItemIndex].quantity += quantity;
      setFormData(prev => ({ ...prev, items: updatedItems }));
    } else {
      // Add new item
      const newItem = {
        product: product._id,
        name: product.name,
        price: product.price,
        quantity: quantity,
        image: product.images?.[0] || ''
      };
      setFormData(prev => ({ ...prev, items: [...prev.items, newItem] }));
    }

    setSelectedProduct('');
    setQuantity(1);
  };

  const removeProduct = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const calculateTotal = () => {
    const itemsTotal = formData.items.reduce((total, item) => total + (item.price * item.quantity), 0);
    return itemsTotal + formData.shippingCost;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.items.length === 0) {
      alert('Veuillez ajouter au moins un produit');
      return;
    }

    setLoading(true);
    try {
      // Transform items to match backend API expectations
      const transformedItems = formData.items.map(item => ({
        product: item.product, // Just the product ID
        quantity: item.quantity
      }));

      const orderData = {
        customer: formData.customer,
        items: transformedItems,
        shippingCost: formData.shippingCost,
        notes: formData.notes,
        status: formData.status
      };

      const response = await api.post('/orders/admin', orderData);
      onOrderCreated(response.data);
    } catch (error) {
      console.error('Error creating order:', error);
      if (error.response?.data?.errors) {
        // Show validation errors
        const errorMessages = error.response.data.errors.map(err => err.msg).join('\n');
        alert('Erreurs de validation:\n' + errorMessages);
      } else {
        alert('Erreur lors de la création de la commande: ' + (error.response?.data?.message || error.message));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit} className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Nouvelle Commande</h2>
            <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Customer Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Informations Client</h3>

              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Prénom"
                  value={formData.customer.firstName}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    customer: { ...prev.customer, firstName: e.target.value }
                  }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
                <input
                  type="text"
                  placeholder="Nom"
                  value={formData.customer.lastName}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    customer: { ...prev.customer, lastName: e.target.value }
                  }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <input
                type="email"
                placeholder="Email"
                value={formData.customer.email}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  customer: { ...prev.customer, email: e.target.value }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />

              <input
                type="tel"
                placeholder="Téléphone"
                value={formData.customer.phone}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  customer: { ...prev.customer, phone: e.target.value }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />

              <input
                type="text"
                placeholder="Adresse"
                value={formData.customer.address.street}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  customer: {
                    ...prev.customer,
                    address: { ...prev.customer.address, street: e.target.value }
                  }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />

              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Ville"
                  value={formData.customer.address.city}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    customer: {
                      ...prev.customer,
                      address: { ...prev.customer.address, city: e.target.value }
                    }
                  }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
                <input
                  type="text"
                  placeholder="Code postal"
                  value={formData.customer.address.postalCode}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    customer: {
                      ...prev.customer,
                      address: { ...prev.customer.address, postalCode: e.target.value }
                    }
                  }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Products */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Produits</h3>

              {/* Add Product */}
              <div className="flex space-x-2">
                <select
                  value={selectedProduct}
                  onChange={(e) => setSelectedProduct(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Sélectionner un produit</option>
                  {products.map(product => (
                    <option key={product._id} value={product._id}>
                      {product.name} - {product.price} TND
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value))}
                  className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={addProduct}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Selected Products */}
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {formData.items.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-gray-600">
                        {item.quantity} × {item.price} TND = {(item.quantity * item.price).toFixed(2)} TND
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeProduct(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Order Summary */}
              <div className="border-t pt-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Sous-total:</span>
                    <span>{formData.items.reduce((total, item) => total + (item.price * item.quantity), 0).toFixed(2)} TND</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Frais de livraison:</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.shippingCost}
                      onChange={(e) => setFormData(prev => ({ ...prev, shippingCost: parseFloat(e.target.value) || 0 }))}
                      className="w-24 px-2 py-1 border border-gray-300 rounded text-right"
                    />
                  </div>
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total:</span>
                    <span>{calculateTotal().toFixed(2)} TND</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes (optionnel)</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Notes sur la commande..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading || formData.items.length === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title={formData.items.length === 0 ? 'Ajoutez au moins un produit pour créer la commande' : ''}
            >
              {loading ? 'Création...' : `Créer la commande (${formData.items.length} produit${formData.items.length !== 1 ? 's' : ''})`}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default OrderManagement;
