import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Package, 
  Truck, 
  CheckCircle, 
  Clock, 
  MapPin, 
  Calendar,
  User,
  Mail,
  Phone,
  AlertCircle
} from 'lucide-react';
import axios from 'axios';

const TrackOrder = () => {
  const [trackingCode, setTrackingCode] = useState('');
  const [email, setEmail] = useState('');
  const [searchMethod, setSearchMethod] = useState('code'); // 'code' or 'email'
  const [loading, setLoading] = useState(false);
  const [orderData, setOrderData] = useState(null);
  const [error, setError] = useState('');

  const handleTrackByCode = async (e) => {
    e.preventDefault();
    if (!trackingCode.trim()) {
      setError('Veuillez entrer un code de suivi');
      return;
    }

    setLoading(true);
    setError('');
    setOrderData(null);

    try {
      const response = await axios.get(`/api/tracking/${trackingCode.trim()}`);
      setOrderData(response.data);
    } catch (error) {
      console.error('Error tracking order:', error);
      if (error.response?.status === 404) {
        setError('Code de suivi non trouvé. Vérifiez votre code et réessayez.');
      } else {
        setError('Erreur lors du suivi de la commande. Veuillez réessayer.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTrackByEmail = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Veuillez entrer votre adresse email');
      return;
    }

    setLoading(true);
    setError('');
    setOrderData(null);

    try {
      const response = await axios.post('/api/tracking/search', {
        email: email.trim()
      });
      
      if (response.data.orders && response.data.orders.length > 0) {
        // For now, show the most recent order
        const mostRecentOrder = response.data.orders[0];
        // Get full order details
        const orderResponse = await axios.get(`/api/tracking/${mostRecentOrder.trackingCode}`);
        setOrderData(orderResponse.data);
      }
    } catch (error) {
      console.error('Error searching orders:', error);
      if (error.response?.status === 404) {
        setError('Aucune commande trouvée pour cette adresse email.');
      } else {
        setError('Erreur lors de la recherche. Veuillez réessayer.');
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <Clock className="w-5 h-5" />;
      case 'confirmed': return <CheckCircle className="w-5 h-5" />;
      case 'processing': return <Package className="w-5 h-5" />;
      case 'shipped': return <Truck className="w-5 h-5" />;
      case 'delivered': return <CheckCircle className="w-5 h-5" />;
      default: return <Clock className="w-5 h-5" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'confirmed': return 'text-blue-600 bg-blue-100';
      case 'processing': return 'text-purple-600 bg-purple-100';
      case 'shipped': return 'text-orange-600 bg-orange-100';
      case 'delivered': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Suivi de Commande
          </h1>
          <p className="text-lg text-gray-600">
            Suivez votre commande en temps réel avec votre code de suivi ou votre email
          </p>
        </motion.div>

        {/* Search Methods */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-lg p-8 mb-8"
        >
          {/* Method Selector */}
          <div className="flex justify-center mb-6">
            <div className="bg-gray-100 rounded-lg p-1 flex">
              <button
                onClick={() => setSearchMethod('code')}
                className={`px-4 py-2 rounded-md transition-colors ${
                  searchMethod === 'code'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Code de suivi
              </button>
              <button
                onClick={() => setSearchMethod('email')}
                className={`px-4 py-2 rounded-md transition-colors ${
                  searchMethod === 'email'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Adresse email
              </button>
            </div>
          </div>

          {/* Search Forms */}
          <AnimatePresence mode="wait">
            {searchMethod === 'code' ? (
              <motion.form
                key="code-form"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onSubmit={handleTrackByCode}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Code de suivi
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={trackingCode}
                      onChange={(e) => setTrackingCode(e.target.value)}
                      placeholder="Ex: TRK-1748984093010-HPNRU8"
                      className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <Search className="w-5 h-5 mr-2" />
                      Suivre ma commande
                    </>
                  )}
                </button>
              </motion.form>
            ) : (
              <motion.form
                key="email-form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleTrackByEmail}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Adresse email
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="votre@email.com"
                      className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <Mail className="w-5 h-5 mr-2" />
                      Rechercher mes commandes
                    </>
                  )}
                </button>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center"
              >
                <AlertCircle className="w-5 h-5 text-red-500 mr-3" />
                <span className="text-red-700">{error}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Order Results */}
        <AnimatePresence>
          {orderData && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Order Header */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      Commande #{orderData.order.orderNumber}
                    </h2>
                    <p className="text-gray-600">
                      Code de suivi: {orderData.order.trackingCode}
                    </p>
                  </div>
                  <div className="mt-4 md:mt-0">
                    <div className={`inline-flex items-center px-4 py-2 rounded-full ${getStatusColor(orderData.order.status)}`}>
                      {getStatusIcon(orderData.order.status)}
                      <span className="ml-2 font-medium">{orderData.order.statusLabel}</span>
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-6">
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>Progression</span>
                    <span>{orderData.order.progressPercentage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${orderData.order.progressPercentage}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="bg-blue-600 h-2 rounded-full"
                    />
                  </div>
                </div>
              </div>

              {/* Order Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Customer Info */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <User className="w-5 h-5 mr-2" />
                    Informations de livraison
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <span className="text-gray-600">Client:</span>
                      <span className="ml-2 font-medium">{orderData.order.customer.name}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Ville:</span>
                      <span className="ml-2 font-medium">{orderData.order.customer.city}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Total:</span>
                      <span className="ml-2 font-medium text-green-600">{orderData.order.totalAmount} TND</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Articles:</span>
                      <span className="ml-2 font-medium">{orderData.order.totalItems} article(s)</span>
                    </div>
                  </div>
                </div>

                {/* Delivery Info */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Calendar className="w-5 h-5 mr-2" />
                    Informations de livraison
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <span className="text-gray-600">Commande passée:</span>
                      <span className="ml-2 font-medium">{formatDate(orderData.order.createdAt)}</span>
                    </div>
                    {orderData.order.estimatedDelivery && (
                      <div>
                        <span className="text-gray-600">Livraison estimée:</span>
                        <span className="ml-2 font-medium">{formatDate(orderData.order.estimatedDelivery)}</span>
                      </div>
                    )}
                    {orderData.order.actualDelivery && (
                      <div>
                        <span className="text-gray-600">Livré le:</span>
                        <span className="ml-2 font-medium text-green-600">{formatDate(orderData.order.actualDelivery)}</span>
                      </div>
                    )}
                    {orderData.order.isDelayed && (
                      <div className="text-orange-600 font-medium">
                        ⚠️ Livraison retardée
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Timeline */}
              {orderData.timeline && (
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">
                    Suivi détaillé
                  </h3>
                  <div className="space-y-4">
                    {orderData.timeline.map((step, index) => (
                      <motion.div
                        key={step.status}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`flex items-start ${step.completed ? 'text-gray-900' : 'text-gray-400'}`}
                      >
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mr-4 ${
                          step.completed 
                            ? step.current 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-green-600 text-white'
                            : 'bg-gray-200'
                        }`}>
                          {getStatusIcon(step.status)}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">{step.label}</div>
                          {step.timestamp && (
                            <div className="text-sm text-gray-500">
                              {formatDate(step.timestamp)}
                            </div>
                          )}
                          {step.note && (
                            <div className="text-sm text-gray-600 mt-1">
                              {step.note}
                            </div>
                          )}
                          {step.location && (
                            <div className="text-sm text-gray-500 flex items-center mt-1">
                              <MapPin className="w-3 h-3 mr-1" />
                              {step.location}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Order Items */}
              {orderData.order.items && orderData.order.items.length > 0 && (
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">
                    Articles commandés
                  </h3>
                  <div className="space-y-4">
                    {orderData.order.items.map((item, index) => (
                      <div key={index} className="flex items-center p-4 border border-gray-200 rounded-lg">
                        <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center mr-4">
                          <Package className="w-8 h-8 text-gray-400" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{item.name}</h4>
                          <p className="text-sm text-gray-600">
                            Quantité: {item.quantity} × {item.price} TND
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-gray-900">
                            {(item.quantity * item.price).toFixed(2)} TND
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default TrackOrder;
