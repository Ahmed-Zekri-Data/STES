import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Package,
  ShoppingCart,
  FileText,
  Users,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Eye,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle
} from 'lucide-react';
import axios from 'axios';
import AnimatedCounter from '../../components/AnimatedCounter';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalOrders: 0,
    totalRevenue: 0,
    totalUsers: 0,
    pendingOrders: 0,
    completedOrders: 0,
    cancelledOrders: 0,
    recentOrders: [],
    topProducts: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch data from multiple endpoints
      const [productsRes, ordersRes, customersRes] = await Promise.all([
        axios.get('/api/products'),
        axios.get('/api/orders'),
        axios.get('/api/admin/customers').catch(() => ({ data: { customers: [] } }))
      ]);

      const products = productsRes.data.products || productsRes.data || [];
      const orders = ordersRes.data.orders || ordersRes.data || [];
      const customers = customersRes.data.customers || [];

      // Calculate statistics
      const totalRevenue = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
      const pendingOrders = orders.filter(order => order.status === 'pending').length;
      const completedOrders = orders.filter(order => order.status === 'delivered' || order.status === 'completed').length;
      const cancelledOrders = orders.filter(order => order.status === 'cancelled').length;

      // Get recent orders (last 5)
      const recentOrders = orders
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5)
        .map(order => ({
          id: order._id,
          customer: `${order.customer?.firstName || ''} ${order.customer?.lastName || ''}`.trim() || order.customer?.email || 'Unknown Customer',
          total: order.totalAmount || 0,
          status: order.status,
          date: new Date(order.createdAt).toLocaleDateString('fr-FR')
        }));

      // Calculate top products (mock for now, would need order items analysis)
      const topProducts = products
        .sort((a, b) => (b.stockQuantity || 0) - (a.stockQuantity || 0))
        .slice(0, 4)
        .map(product => ({
          name: product.name,
          sales: Math.floor(Math.random() * 50) + 10, // Mock sales data
          revenue: Math.floor(Math.random() * 10000) + 5000 // Mock revenue data
        }));

      setStats({
        totalProducts: products.length,
        totalOrders: orders.length,
        totalRevenue: Math.round(totalRevenue),
        totalUsers: customers.length,
        pendingOrders,
        completedOrders,
        cancelledOrders,
        recentOrders,
        topProducts
      });

      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Products',
      value: stats.totalProducts,
      icon: Package,
      color: 'from-blue-500 to-blue-600',
      change: '+12%',
      changeType: 'increase'
    },
    {
      title: 'Total Orders',
      value: stats.totalOrders,
      icon: ShoppingCart,
      color: 'from-green-500 to-green-600',
      change: '+8%',
      changeType: 'increase'
    },
    {
      title: 'Revenue',
      value: stats.totalRevenue,
      icon: DollarSign,
      color: 'from-purple-500 to-purple-600',
      change: '+15%',
      changeType: 'increase',
      prefix: '',
      suffix: ' TND'
    },
    {
      title: 'Total Users',
      value: stats.totalUsers,
      icon: Users,
      color: 'from-orange-500 to-orange-600',
      change: '+5%',
      changeType: 'increase'
    }
  ];

  const orderStatusCards = [
    {
      title: 'Pending Orders',
      value: stats.pendingOrders,
      icon: Clock,
      color: 'from-yellow-500 to-yellow-600'
    },
    {
      title: 'Completed Orders',
      value: stats.completedOrders,
      icon: CheckCircle,
      color: 'from-green-500 to-green-600'
    },
    {
      title: 'Cancelled Orders',
      value: stats.cancelledOrders,
      icon: XCircle,
      color: 'from-red-500 to-red-600'
    }
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'processing': return <AlertCircle className="w-4 h-4" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'cancelled': return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 shadow-lg animate-pulse">
              <div className="h-4 bg-gray-300 rounded mb-4"></div>
              <div className="h-8 bg-gray-300 rounded mb-2"></div>
              <div className="h-3 bg-gray-300 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome back, Admin! 👋
        </h1>
        <p className="text-gray-600">
          Here's what's happening with your store today.
        </p>
      </motion.div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.title}
              className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              whileHover={{ y: -5 }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">
                    {stat.title}
                  </p>
                  <div className="flex items-center space-x-2">
                    <AnimatedCounter
                      end={stat.value}
                      duration={2}
                      prefix={stat.prefix || ''}
                      suffix={stat.suffix || ''}
                      className="text-2xl font-bold text-gray-900"
                    />
                    <div className={`flex items-center text-sm ${
                      stat.changeType === 'increase' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {stat.changeType === 'increase' ? (
                        <TrendingUp className="w-4 h-4 mr-1" />
                      ) : (
                        <TrendingDown className="w-4 h-4 mr-1" />
                      )}
                      {stat.change}
                    </div>
                  </div>
                </div>
                <motion.div
                  className={`w-12 h-12 bg-gradient-to-r ${stat.color} rounded-xl flex items-center justify-center shadow-lg`}
                  whileHover={{ scale: 1.1, rotate: 360 }}
                  transition={{ duration: 0.6 }}
                >
                  <Icon className="w-6 h-6 text-white" />
                </motion.div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Order Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {orderStatusCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.title}
              className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 + index * 0.1 }}
              whileHover={{ y: -3 }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">
                    {stat.title}
                  </p>
                  <AnimatedCounter
                    end={stat.value}
                    duration={1.5}
                    className="text-3xl font-bold text-gray-900"
                  />
                </div>
                <motion.div
                  className={`w-12 h-12 bg-gradient-to-r ${stat.color} rounded-xl flex items-center justify-center shadow-lg`}
                  whileHover={{ scale: 1.1 }}
                  transition={{ duration: 0.3 }}
                >
                  <Icon className="w-6 h-6 text-white" />
                </motion.div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Recent Orders & Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Orders */}
        <motion.div
          className="bg-white rounded-2xl shadow-lg border border-gray-100"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <ShoppingCart className="w-5 h-5 mr-2 text-blue-600" />
              Recent Orders
            </h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {stats.recentOrders.map((order, index) => (
                <motion.div
                  key={order.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors duration-300"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 1 + index * 0.1 }}
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{order.customer}</p>
                    <p className="text-sm text-gray-500">{order.date}</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="font-semibold text-gray-900">
                      {order.total} TND
                    </span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                      {getStatusIcon(order.status)}
                      <span className="ml-1 capitalize">{order.status}</span>
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Top Products */}
        <motion.div
          className="bg-white rounded-2xl shadow-lg border border-gray-100"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Package className="w-5 h-5 mr-2 text-green-600" />
              Top Products
            </h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {stats.topProducts.map((product, index) => (
                <motion.div
                  key={product.name}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors duration-300"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 1 + index * 0.1 }}
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{product.name}</p>
                    <p className="text-sm text-gray-500">{product.sales} sales</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      {product.revenue} TND
                    </p>
                    <div className="w-20 bg-gray-200 rounded-full h-2 mt-1">
                      <motion.div
                        className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${(product.sales / 50) * 100}%` }}
                        transition={{ duration: 1, delay: 1.2 + index * 0.1 }}
                      />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
