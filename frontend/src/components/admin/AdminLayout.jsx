import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext';
import { motion, AnimatePresence } from 'framer-motion';
import Breadcrumb from './Breadcrumb';
import QuickActions from './QuickActions';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  FileText,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  Search,
  User,
  Waves,
  Plus,
  Tag,
  Award,
  UserCog,
  Truck
} from 'lucide-react';

const AdminLayout = () => {
  const { admin, logout } = useAdmin();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const navigation = [
    { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Products', href: '/admin/products', icon: Package },
    { name: 'Categories', href: '/admin/categories', icon: Tag },
    { name: 'Brands', href: '/admin/brands', icon: Award },
    { name: 'Orders', href: '/admin/orders', icon: ShoppingCart },
    { name: 'Tracking', href: '/admin/tracking', icon: Truck },
    { name: 'Customers', href: '/admin/customers', icon: Users },
    { name: 'Forms', href: '/admin/forms', icon: FileText },
    { name: 'Pages', href: '/admin/pages', icon: FileText },
    { name: 'Admin Users', href: '/admin/users', icon: UserCog },
    { name: 'Settings', href: '/admin/settings', icon: Settings },
  ];

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const isActive = (path) => location.pathname === path;

  const sidebarVariants = {
    open: {
      x: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30
      }
    },
    closed: {
      x: "-100%",
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30
      }
    }
  };

  const overlayVariants = {
    open: { opacity: 1 },
    closed: { opacity: 0 }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
            variants={overlayVariants}
            initial="closed"
            animate="open"
            exit="closed"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.div
        className="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl lg:translate-x-0"
        variants={sidebarVariants}
        initial="closed"
        animate={sidebarOpen ? "open" : "closed"}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <motion.div
            className="flex items-center justify-between h-16 px-6 border-b border-gray-200"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Link to="/admin/dashboard" className="flex items-center group">
              <motion.div
                className="w-8 h-8 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-lg flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300"
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.6 }}
              >
                <Waves className="text-white w-5 h-5" />
              </motion.div>
              <span className="ml-2 text-lg font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                STES.tn
              </span>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 rounded-md hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </motion.div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigation.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <Link
                    to={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`relative flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-300 group ${
                      isActive(item.href)
                        ? 'bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700 shadow-md'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-blue-600'
                    }`}
                  >
                    <Icon className={`w-5 h-5 mr-3 transition-colors duration-300 ${
                      isActive(item.href) ? 'text-blue-600' : 'text-gray-500 group-hover:text-blue-600'
                    }`} />
                    <span>{item.name}</span>
                    {isActive(item.href) && (
                      <motion.div
                        className="absolute right-2 w-2 h-2 bg-blue-600 rounded-full"
                        layoutId="activeIndicator"
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      />
                    )}
                  </Link>
                </motion.div>
              );
            })}
          </nav>

          {/* Admin info */}
          <motion.div
            className="p-4 border-t border-gray-200"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.8 }}
          >
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {admin?.fullName}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {admin?.role}
                </p>
              </div>
            </div>
            <motion.button
              onClick={handleLogout}
              className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors duration-300"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </motion.button>
          </motion.div>
        </div>
      </motion.div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <motion.header
          className="bg-white shadow-sm border-b border-gray-200"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center justify-between h-16 px-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-md hover:bg-gray-100 transition-colors"
              >
                <Menu className="w-5 h-5" />
              </button>

              {/* Admin Navigation - Desktop */}
              <nav className="hidden lg:flex items-center space-x-1 ml-8">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  return (
                    <motion.div
                      key={item.name}
                      whileHover={{ y: -2 }}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    >
                      <Link
                        to={item.href}
                        className={`relative flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300 group ${
                          isActive(item.href)
                            ? 'bg-blue-50 text-blue-700 shadow-md'
                            : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
                        }`}
                      >
                        <Icon className={`w-4 h-4 mr-2 transition-colors duration-300 ${
                          isActive(item.href) ? 'text-blue-600' : 'text-gray-500 group-hover:text-blue-600'
                        }`} />
                        <span>{item.name}</span>
                        {isActive(item.href) && (
                          <motion.div
                            className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-600 rounded-full"
                            layoutId="activeNavIndicator"
                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                          />
                        )}
                      </Link>
                    </motion.div>
                  );
                })}
              </nav>

              {/* Mobile Navigation Menu */}
              <div className="lg:hidden">
                <motion.button
                  onClick={() => setSidebarOpen(true)}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Menu className="w-5 h-5" />
                </motion.button>
              </div>

              {/* Search */}
              <div className="hidden md:block ml-8">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search..."
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Quick Actions */}
              <QuickActions />

              {/* Notifications */}
              <div className="relative">
                <motion.button
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                  className="p-2 text-gray-500 hover:text-gray-700 transition-colors relative"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Bell className="w-5 h-5" />
                  <motion.span
                    className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                </motion.button>

                {/* Notifications Dropdown */}
                <AnimatePresence>
                  {notificationsOpen && (
                    <motion.div
                      className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 z-50"
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="p-4 border-b border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
                      </div>
                      <div className="p-4 space-y-3">
                        <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                          <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">New order received</p>
                            <p className="text-xs text-gray-600">Order #ORD-2024-006 - 5 minutes ago</p>
                          </div>
                        </div>
                        <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
                          <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">Product stock low</p>
                            <p className="text-xs text-gray-600">Robot nettoyeur - 2 items left</p>
                          </div>
                        </div>
                        <div className="flex items-start space-x-3 p-3 bg-yellow-50 rounded-lg">
                          <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">New contact form</p>
                            <p className="text-xs text-gray-600">From Ahmed Ben Ali - 1 hour ago</p>
                          </div>
                        </div>
                      </div>
                      <div className="p-4 border-t border-gray-200">
                        <button className="w-full text-center text-sm text-blue-600 hover:text-blue-700 font-medium">
                          View all notifications
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Profile Dropdown */}
              <div className="relative">
                <motion.button
                  className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-medium text-gray-700">{admin?.fullName}</p>
                    <p className="text-xs text-gray-500">{admin?.role}</p>
                  </div>
                </motion.button>
              </div>
            </div>
          </div>
        </motion.header>

        {/* Page content */}
        <main className="p-6">
          <Breadcrumb />
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
