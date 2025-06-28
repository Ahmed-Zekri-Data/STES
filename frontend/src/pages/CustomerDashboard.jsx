import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, ShoppingBag, Heart, MapPin, Settings, Award, Package, Clock, Bell } from 'lucide-react';
import { useCustomer } from '../context/CustomerContext';
import { useLanguage } from '../context/LanguageContext';
import AnimatedButton from '../components/AnimatedButton';
import LoadingSpinner from '../components/LoadingSpinner';
import OrderHistory from '../components/customer/OrderHistory';
import NotificationPreferences from '../components/notifications/NotificationPreferences';

const CustomerDashboard = () => {
  const { customer, isAuthenticated, loading } = useCustomer();
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState('overview');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Accès non autorisé
          </h2>
          <p className="text-gray-600 mb-6">
            Veuillez vous connecter pour accéder à votre compte.
          </p>
          <AnimatedButton
            onClick={() => window.location.href = '/'}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
          >
            Retour à l'accueil
          </AnimatedButton>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', name: 'Vue d\'ensemble', icon: User },
    { id: 'orders', name: 'Mes commandes', icon: ShoppingBag },
    { id: 'addresses', name: 'Adresses', icon: MapPin },
    { id: 'wishlist', name: 'Liste de souhaits', icon: Heart },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'settings', name: 'Paramètres', icon: Settings },
  ];

  const stats = [
    {
      name: 'Commandes totales',
      value: customer?.orderCount || 0,
      icon: Package,
      color: 'blue'
    },
    {
      name: 'Montant dépensé',
      value: `${customer?.totalSpent || 0} TND`,
      icon: ShoppingBag,
      color: 'green'
    },
    {
      name: 'Points de fidélité',
      value: customer?.loyaltyPoints || 0,
      icon: Award,
      color: 'purple'
    },
    {
      name: 'Membre depuis',
      value: customer?.createdAt ? new Date(customer.createdAt).getFullYear() : new Date().getFullYear(),
      icon: Clock,
      color: 'orange'
    }
  ];

  const renderOverview = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl p-8 text-white">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
            <User className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">
              Bienvenue, {customer?.firstName}!
            </h1>
            <p className="text-blue-100">
              Gérez votre compte et vos commandes
            </p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-xl p-6 shadow-lg border border-gray-100"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
              <div className={`w-12 h-12 bg-${stat.color}-100 rounded-lg flex items-center justify-center`}>
                <stat.icon className={`w-6 h-6 text-${stat.color}-600`} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Actions rapides
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <AnimatedButton
            onClick={() => setActiveTab('orders')}
            className="flex items-center justify-center space-x-2 bg-blue-50 text-blue-700 p-4 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <ShoppingBag className="w-5 h-5" />
            <span>Voir mes commandes</span>
          </AnimatedButton>
          <AnimatedButton
            onClick={() => setActiveTab('addresses')}
            className="flex items-center justify-center space-x-2 bg-green-50 text-green-700 p-4 rounded-lg hover:bg-green-100 transition-colors"
          >
            <MapPin className="w-5 h-5" />
            <span>Gérer les adresses</span>
          </AnimatedButton>
          <AnimatedButton
            onClick={() => setActiveTab('settings')}
            className="flex items-center justify-center space-x-2 bg-purple-50 text-purple-700 p-4 rounded-lg hover:bg-purple-100 transition-colors"
          >
            <Settings className="w-5 h-5" />
            <span>Paramètres du compte</span>
          </AnimatedButton>
        </div>
      </div>

      {/* Account Status */}
      <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Statut du compte
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Email vérifié</span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              customer?.isEmailVerified 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {customer?.isEmailVerified ? 'Vérifié' : 'Non vérifié'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Compte actif</span>
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
              Actif
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Dernière connexion</span>
            <span className="text-gray-900">
              {customer?.lastLogin 
                ? new Date(customer.lastLogin).toLocaleDateString('fr-FR')
                : 'Première connexion'
              }
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'orders':
        return <OrderHistory />;
      case 'notifications':
        return <NotificationPreferences />;
      case 'addresses':
        return (
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold mb-4">Mes adresses</h3>
            <p className="text-gray-600">Aucune adresse enregistrée.</p>
          </div>
        );
      case 'wishlist':
        return (
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold mb-4">Ma liste de souhaits</h3>
            <p className="text-gray-600">Votre liste de souhaits est vide.</p>
          </div>
        );
      case 'settings':
        return (
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold mb-4">Paramètres du compte</h3>
            <p className="text-gray-600">Paramètres à venir...</p>
          </div>
        );
      default:
        return renderOverview();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <div className="lg:w-64 flex-shrink-0">
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900">{customer?.fullName}</h2>
                  <p className="text-sm text-gray-500">{customer?.email}</p>
                </div>
              </div>
              
              <nav className="space-y-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <tab.icon className="w-5 h-5" />
                    <span className="font-medium">{tab.name}</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerDashboard;
