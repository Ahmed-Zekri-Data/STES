import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Package,
  Truck,
  CheckCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  Users,
  MapPin,
  Calendar,
  BarChart3,
  Activity,
  Target
} from 'lucide-react';
import axios from 'axios';
import LoadingSpinner from '../../components/LoadingSpinner';

const TrackingDashboard = () => {
  const [stats, setStats] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');

  useEffect(() => {
    fetchDashboardData();
  }, [timeRange]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch tracking statistics
      const [statsResponse, ordersResponse] = await Promise.all([
        axios.get('/api/orders/stats', { params: { timeRange } }),
        axios.get('/api/orders', { params: { limit: 10, sort: 'createdAt', order: 'desc' } })
      ]);

      setStats(statsResponse.data);
      setRecentOrders(ordersResponse.data.orders);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'text-yellow-600 bg-yellow-100',
      confirmed: 'text-blue-600 bg-blue-100',
      processing: 'text-purple-600 bg-purple-100',
      shipped: 'text-orange-600 bg-orange-100',
      delivered: 'text-green-600 bg-green-100',
      cancelled: 'text-red-600 bg-red-100'
    };
    return colors[status] || 'text-gray-600 bg-gray-100';
  };

  const getStatusIcon = (status) => {
    const icons = {
      pending: Clock,
      confirmed: CheckCircle,
      processing: Package,
      shipped: Truck,
      delivered: CheckCircle,
      cancelled: AlertTriangle
    };
    const Icon = icons[status] || Clock;
    return <Icon className="w-4 h-4" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tableau de Bord Tracking</h1>
          <p className="text-gray-600">Suivi en temps réel de toutes les commandes</p>
        </div>
        
        <div className="mt-4 sm:mt-0">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="24h">Dernières 24h</option>
            <option value="7d">7 derniers jours</option>
            <option value="30d">30 derniers jours</option>
            <option value="90d">90 derniers jours</option>
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Orders */}
        <motion.div
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Commandes</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.totalOrders || 0}</p>
              <p className="text-xs text-green-600 mt-1">
                +{stats?.orderGrowth || 0}% vs période précédente
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </motion.div>

        {/* In Transit */}
        <motion.div
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">En Transit</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.inTransit || 0}</p>
              <p className="text-xs text-orange-600 mt-1">
                {stats?.urgentOrders || 0} urgent{stats?.urgentOrders > 1 ? 's' : ''}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Truck className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </motion.div>

        {/* Delivered */}
        <motion.div
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Livrées</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.delivered || 0}</p>
              <p className="text-xs text-green-600 mt-1">
                {stats?.deliveryRate || 0}% taux de livraison
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </motion.div>

        {/* Average Delivery Time */}
        <motion.div
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Délai Moyen</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.avgDeliveryTime || 0}j</p>
              <p className="text-xs text-blue-600 mt-1">
                {stats?.onTimeDelivery || 0}% à temps
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Charts and Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <motion.div
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Répartition des Statuts</h3>
            <BarChart3 className="w-5 h-5 text-gray-400" />
          </div>
          
          <div className="space-y-4">
            {stats?.statusDistribution && Object.entries(stats.statusDistribution).map(([status, count]) => {
              const percentage = stats.totalOrders > 0 ? Math.round((count / stats.totalOrders) * 100) : 0;
              return (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
                      {getStatusIcon(status)}
                      <span className="ml-1 capitalize">{status}</span>
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900 w-8">{count}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Recent Orders */}
        <motion.div
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.5 }}
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Commandes Récentes</h3>
            <Activity className="w-5 h-5 text-gray-400" />
          </div>
          
          <div className="space-y-4">
            {recentOrders.slice(0, 5).map((order, index) => (
              <motion.div
                key={order._id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.1 * index }}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getStatusColor(order.status)}`}>
                    {getStatusIcon(order.status)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{order.orderNumber}</p>
                    <p className="text-xs text-gray-500">{order.customer.name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{order.totalAmount} TND</p>
                  <p className="text-xs text-gray-500">
                    {new Date(order.createdAt).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Performance Metrics */}
      <motion.div
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.6 }}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Métriques de Performance</h3>
          <Target className="w-5 h-5 text-gray-400" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats?.customerSatisfaction || 0}%</p>
            <p className="text-sm text-gray-600">Satisfaction Client</p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Users className="w-8 h-8 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats?.repeatCustomers || 0}%</p>
            <p className="text-sm text-gray-600">Clients Fidèles</p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <MapPin className="w-8 h-8 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats?.coverageAreas || 0}</p>
            <p className="text-sm text-gray-600">Zones Couvertes</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default TrackingDashboard;
