import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Package, Truck, MapPin, Clock, CheckCircle, AlertCircle, Phone, Mail } from 'lucide-react';
import { useOrderTracking } from '../context/OrderTrackingContext';
import { useLanguage } from '../context/LanguageContext';
import AnimatedButton from '../components/AnimatedButton';
import LoadingSpinner from '../components/LoadingSpinner';

const OrderTracking = () => {
  const { 
    trackOrder, 
    searchOrdersByEmail, 
    trackingData, 
    searchResults, 
    loading, 
    clearTrackingData,
    getDeliveryStatus,
    formatTimelineForDisplay
  } = useOrderTracking();
  
  const { t, language } = useLanguage();
  const [searchType, setSearchType] = useState('tracking'); // 'tracking' or 'email'
  const [searchValue, setSearchValue] = useState('');
  const [emailSearch, setEmailSearch] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    // Clear data when component mounts
    clearTrackingData();
  }, [clearTrackingData]);

  const handleTrackingSearch = async (e) => {
    e.preventDefault();
    if (!searchValue.trim()) {
      setError('Veuillez entrer un numéro de commande ou code de suivi');
      return;
    }

    setError('');
    try {
      await trackOrder(searchValue.trim());
    } catch (error) {
      setError(error.message);
    }
  };

  const handleEmailSearch = async (e) => {
    e.preventDefault();
    if (!emailSearch.trim()) {
      setError('Veuillez entrer votre adresse email');
      return;
    }

    setError('');
    try {
      await searchOrdersByEmail(emailSearch.trim());
    } catch (error) {
      setError(error.message);
    }
  };

  const renderSearchForm = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-lg p-8 mb-8"
    >
      <div className="text-center mb-8">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2 }}
          className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4"
        >
          <Search className="w-8 h-8 text-white" />
        </motion.div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Suivi de commande
        </h1>
        <p className="text-gray-600">
          Suivez votre commande en temps réel avec notre système de tracking avancé
        </p>
      </div>

      {/* Search Type Tabs */}
      <div className="flex justify-center mb-6">
        <div className="bg-gray-100 rounded-lg p-1 flex">
          <button
            onClick={() => setSearchType('tracking')}
            className={`px-6 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
              searchType === 'tracking'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Numéro de suivi
          </button>
          <button
            onClick={() => setSearchType('email')}
            className={`px-6 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
              searchType === 'email'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Recherche par email
          </button>
        </div>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6"
        >
          {error}
        </motion.div>
      )}

      <AnimatePresence mode="wait">
        {searchType === 'tracking' ? (
          <motion.form
            key="tracking"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            onSubmit={handleTrackingSearch}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Numéro de commande ou code de suivi
              </label>
              <div className="relative">
                <Package className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  placeholder="ORD-1234567890-0001 ou TRK-1234567890-ABC123"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Vous pouvez utiliser votre numéro de commande (ORD-...) ou votre code de suivi (TRK-...)
              </p>
            </div>
            <AnimatedButton
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-3 rounded-lg font-medium hover:from-blue-600 hover:to-cyan-600 transition-all duration-200"
            >
              {loading ? <LoadingSpinner size="sm" /> : 'Suivre ma commande'}
            </AnimatedButton>
          </motion.form>
        ) : (
          <motion.form
            key="email"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            onSubmit={handleEmailSearch}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Adresse email utilisée pour la commande
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="email"
                  value={emailSearch}
                  onChange={(e) => setEmailSearch(e.target.value)}
                  placeholder="votre@email.com"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Nous afficherons toutes vos commandes récentes
              </p>
            </div>
            <AnimatedButton
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3 rounded-lg font-medium hover:from-green-600 hover:to-emerald-600 transition-all duration-200"
            >
              {loading ? <LoadingSpinner size="sm" /> : 'Rechercher mes commandes'}
            </AnimatedButton>
          </motion.form>
        )}
      </AnimatePresence>
    </motion.div>
  );

  const renderTrackingResult = () => {
    if (!trackingData) return null;

    const { order, timeline, tracking } = trackingData;
    const deliveryStatus = getDeliveryStatus(order);
    const formattedTimeline = formatTimelineForDisplay(timeline);

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Order Header */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Commande {order.orderNumber}
              </h2>
              <p className="text-gray-600">
                Code de suivi: {order.trackingCode}
              </p>
            </div>
            <div className="text-right">
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                order.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                order.status === 'processing' ? 'bg-purple-100 text-purple-800' :
                order.status === 'confirmed' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {order.statusLabel}
              </div>
              {order.isUrgent && (
                <div className="mt-2">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    🚨 Urgent
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Progression</span>
              <span className="text-sm font-medium text-gray-700">{order.progressPercentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${order.progressPercentage}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className={`h-2 rounded-full ${
                  order.status === 'delivered' ? 'bg-green-500' :
                  order.status === 'shipped' ? 'bg-blue-500' :
                  'bg-purple-500'
                }`}
              />
            </div>
          </div>

          {/* Delivery Status */}
          {deliveryStatus && (
            <div className={`p-4 rounded-lg mb-6 ${
              deliveryStatus.type === 'delivered' && deliveryStatus.onTime ? 'bg-green-50 border border-green-200' :
              deliveryStatus.type === 'delayed' ? 'bg-red-50 border border-red-200' :
              deliveryStatus.type === 'arriving' ? 'bg-yellow-50 border border-yellow-200' :
              'bg-blue-50 border border-blue-200'
            }`}>
              <div className="flex items-center">
                {deliveryStatus.type === 'delivered' && deliveryStatus.onTime ? (
                  <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                ) : deliveryStatus.type === 'delayed' ? (
                  <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                ) : (
                  <Clock className="w-5 h-5 text-blue-600 mr-2" />
                )}
                <span className={`font-medium ${
                  deliveryStatus.type === 'delivered' && deliveryStatus.onTime ? 'text-green-800' :
                  deliveryStatus.type === 'delayed' ? 'text-red-800' :
                  'text-blue-800'
                }`}>
                  {deliveryStatus.message}
                </span>
              </div>
            </div>
          )}

          {/* Order Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Informations de livraison</h4>
              <div className="space-y-1 text-sm text-gray-600">
                <p className="flex items-center">
                  <MapPin className="w-4 h-4 mr-2" />
                  {order.customer.city}
                </p>
                {order.estimatedDelivery && (
                  <p className="flex items-center">
                    <Clock className="w-4 h-4 mr-2" />
                    Estimée: {new Date(order.estimatedDelivery).toLocaleDateString('fr-FR')}
                  </p>
                )}
                {order.actualDelivery && (
                  <p className="flex items-center">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Livrée: {new Date(order.actualDelivery).toLocaleDateString('fr-FR')}
                  </p>
                )}
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Transporteur</h4>
              <div className="space-y-1 text-sm text-gray-600">
                <p className="flex items-center">
                  <Truck className="w-4 h-4 mr-2" />
                  {order.shippingProvider.name}
                </p>
                {order.shippingProvider.contact && (
                  <p className="flex items-center">
                    <Phone className="w-4 h-4 mr-2" />
                    {order.shippingProvider.contact}
                  </p>
                )}
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Résumé de commande</h4>
              <div className="space-y-1 text-sm text-gray-600">
                <p>{order.totalItems} article{order.totalItems > 1 ? 's' : ''}</p>
                <p className="font-semibold text-gray-900">{order.totalAmount} TND</p>
                <p className="text-xs">
                  Commandé le {new Date(order.createdAt).toLocaleDateString('fr-FR')}
                </p>
              </div>
            </div>
          </div>

          {order.deliveryInstructions && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-2">Instructions de livraison</h4>
              <p className="text-sm text-gray-600">{order.deliveryInstructions}</p>
            </div>
          )}
        </div>

        {/* Timeline */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Historique de suivi</h3>
          <div className="space-y-6">
            {formattedTimeline.map((step, index) => (
              <motion.div
                key={step.status}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-start"
              >
                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                  step.completed ? `bg-${step.color}-100` : 'bg-gray-100'
                }`}>
                  {step.completed ? (
                    <CheckCircle className={`w-5 h-5 text-${step.color}-600`} />
                  ) : (
                    <div className={`w-3 h-3 rounded-full ${
                      step.current ? `bg-${step.color}-500` : 'bg-gray-300'
                    }`} />
                  )}
                </div>
                <div className="ml-4 flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className={`font-medium ${
                      step.completed ? 'text-gray-900' : 'text-gray-500'
                    }`}>
                      {step.label}
                    </h4>
                    {step.formattedDate && (
                      <span className="text-sm text-gray-500">{step.formattedDate}</span>
                    )}
                  </div>
                  {step.note && (
                    <p className="text-sm text-gray-600 mt-1">{step.note}</p>
                  )}
                  {step.location && (
                    <p className="text-xs text-gray-500 mt-1 flex items-center">
                      <MapPin className="w-3 h-3 mr-1" />
                      {step.location}
                    </p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Order Items */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Articles commandés</h3>
          <div className="space-y-4">
            {order.items.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg"
              >
                <img
                  src={item.image || '/placeholder-product.jpg'}
                  alt={item.name}
                  className="w-16 h-16 object-cover rounded-lg"
                />
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{item.name}</h4>
                  <p className="text-sm text-gray-600">Quantité: {item.quantity}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{item.price} TND</p>
                  <p className="text-sm text-gray-600">
                    Total: {(item.price * item.quantity).toFixed(2)} TND
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    );
  };

  const renderSearchResults = () => {
    if (!searchResults) return null;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-lg p-8"
      >
        <h3 className="text-xl font-bold text-gray-900 mb-6">
          Vos commandes ({searchResults.total})
        </h3>
        <div className="space-y-4">
          {searchResults.orders.map((order, index) => (
            <motion.div
              key={order.orderNumber}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => {
                setSearchValue(order.orderNumber);
                setSearchType('tracking');
                trackOrder(order.orderNumber);
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">{order.orderNumber}</h4>
                  <p className="text-sm text-gray-600">
                    {new Date(order.createdAt).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <div className="text-right">
                  <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                    order.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                    order.status === 'processing' ? 'bg-purple-100 text-purple-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {order.statusLabel}
                  </div>
                  <p className="text-sm font-semibold text-gray-900 mt-1">
                    {order.totalAmount} TND
                  </p>
                  {order.isDelayed && (
                    <p className="text-xs text-red-600 mt-1">En retard</p>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {renderSearchForm()}
        {renderTrackingResult()}
        {renderSearchResults()}
      </div>
    </div>
  );
};

export default OrderTracking;
