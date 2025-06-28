import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Package, 
  Clock, 
  Truck, 
  CheckCircle, 
  XCircle, 
  Eye,
  Search,
  Filter,
  Calendar,
  MapPin,
  Phone,
  Mail
} from 'lucide-react';
import axios from 'axios';
import { useCustomer } from '../../context/CustomerContext';
import LoadingSpinner from '../LoadingSpinner';

const OrderHistory = () => {
  const { customer } = useCustomer();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [filters, setFilters] = useState({
    status: 'all',
    search: '',
    dateRange: 'all'
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalOrders: 0
  });

  useEffect(() => {
    fetchOrders();
  }, [filters.status, pagination.currentPage]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/customer-orders', {
        params: {
          page: pagination.currentPage,
          limit: 10,
          status: filters.status !== 'all' ? filters.status : undefined
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
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'processing': return 'bg-purple-100 text-purple-800';
      case 'shipped': return 'bg-indigo-100 text-indigo-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
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

  const filteredOrders = orders.filter(order => {
    const matchesSearch = !filters.search || 
      order.orderNumber.toLowerCase().includes(filters.search.toLowerCase()) ||
      order.items.some(item => item.name.toLowerCase().includes(filters.search.toLowerCase()));
    
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
        <h2 className="text-2xl font-bold text-gray-900">Historique des commandes</h2>
        <div className="mt-4 sm:mt-0 text-sm text-gray-600">
          {pagination.totalOrders} commande{pagination.totalOrders !== 1 ? 's' : ''}
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
              placeholder="Rechercher par numéro ou produit..."
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
              <option value="all">Tous les statuts</option>
              <option value="pending">En attente</option>
              <option value="confirmed">Confirmée</option>
              <option value="processing">En préparation</option>
              <option value="shipped">Expédiée</option>
              <option value="delivered">Livrée</option>
              <option value="cancelled">Annulée</option>
            </select>
          </div>

          {/* Date Range */}
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <select
              value={filters.dateRange}
              onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
            >
              <option value="all">Toutes les dates</option>
              <option value="week">Cette semaine</option>
              <option value="month">Ce mois</option>
              <option value="quarter">Ce trimestre</option>
              <option value="year">Cette année</option>
            </select>
          </div>
        </div>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="text-center py-12">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune commande trouvée</h3>
          <p className="text-gray-600">
            {filters.search || filters.status !== 'all' 
              ? 'Essayez de modifier vos filtres de recherche.'
              : 'Vous n\'avez pas encore passé de commande.'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order, index) => (
            <motion.div
              key={order._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                  {/* Order Info */}
                  <div className="flex-1">
                    <div className="flex items-center space-x-4 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {order.orderNumber}
                      </h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                        {getStatusIcon(order.status)}
                        <span className="ml-1">{getStatusLabel(order.status)}</span>
                      </span>
                    </div>
                    
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>Commandé le {new Date(order.createdAt).toLocaleDateString('fr-FR')}</p>
                      <p>{order.items.length} article{order.items.length !== 1 ? 's' : ''}</p>
                      {order.estimatedDelivery && (
                        <p>Livraison estimée: {new Date(order.estimatedDelivery).toLocaleDateString('fr-FR')}</p>
                      )}
                    </div>
                  </div>

                  {/* Order Amount & Actions */}
                  <div className="mt-4 lg:mt-0 lg:ml-6 flex flex-col lg:items-end space-y-2">
                    <div className="text-xl font-bold text-gray-900">
                      {order.totalAmount} TND
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Détails
                      </button>
                      <a
                        href={`/track-order?order=${order.orderNumber}`}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <Truck className="w-4 h-4 mr-1" />
                        Suivre
                      </a>
                    </div>
                  </div>
                </div>

                {/* Order Items Preview */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex flex-wrap gap-2">
                    {order.items.slice(0, 3).map((item, itemIndex) => (
                      <div key={itemIndex} className="flex items-center space-x-2 bg-gray-50 rounded-lg px-3 py-1">
                        {item.image && (
                          <img 
                            src={item.image} 
                            alt={item.name}
                            className="w-6 h-6 rounded object-cover"
                          />
                        )}
                        <span className="text-sm text-gray-700">{item.name}</span>
                        <span className="text-xs text-gray-500">×{item.quantity}</span>
                      </div>
                    ))}
                    {order.items.length > 3 && (
                      <div className="flex items-center px-3 py-1 text-sm text-gray-500">
                        +{order.items.length - 3} autre{order.items.length - 3 !== 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center space-x-2">
          <button
            onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage - 1 }))}
            disabled={pagination.currentPage === 1}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Précédent
          </button>
          
          <span className="px-3 py-2 text-sm text-gray-700">
            Page {pagination.currentPage} sur {pagination.totalPages}
          </span>
          
          <button
            onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage + 1 }))}
            disabled={pagination.currentPage === pagination.totalPages}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Suivant
          </button>
        </div>
      )}

      {/* Order Details Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <OrderDetailsModal 
            order={selectedOrder} 
            onClose={() => setSelectedOrder(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// Order Details Modal Component
const OrderDetailsModal = ({ order, onClose }) => {
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
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Détails de la commande
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XCircle className="w-6 h-6" />
            </button>
          </div>

          {/* Order Summary */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Numéro de commande</p>
                <p className="font-semibold">{order.orderNumber}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Date de commande</p>
                <p className="font-semibold">{new Date(order.createdAt).toLocaleDateString('fr-FR')}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Statut</p>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                  {getStatusIcon(order.status)}
                  <span className="ml-1">{getStatusLabel(order.status)}</span>
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total</p>
                <p className="font-semibold text-lg">{order.totalAmount} TND</p>
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

          {/* Delivery Info */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4">Informations de livraison</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="font-medium">{order.customer.name}</p>
                  <p className="text-gray-600">{order.customer.address.street}</p>
                  <p className="text-gray-600">{order.customer.address.city}, {order.customer.address.country}</p>
                  {order.customer.address.postalCode && (
                    <p className="text-gray-600">{order.customer.address.postalCode}</p>
                  )}
                </div>
              </div>
              
              <div className="mt-4 flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">{order.customer.phone}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">{order.customer.email}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-3">
            <a
              href={`/track-order?order=${order.orderNumber}`}
              className="flex-1 bg-blue-600 text-white text-center py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Suivre la commande
            </a>
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

export default OrderHistory;
