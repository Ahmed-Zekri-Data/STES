import React from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  FileText,
  Users,
  Settings,
  Truck
} from 'lucide-react';

const PageTitle = () => {
  const location = useLocation();
  const pathname = location.pathname;

  const getPageInfo = () => {
    const pages = {
      '/admin': {
        title: 'Dashboard',
        subtitle: 'Overview of your business',
        icon: LayoutDashboard,
        color: 'blue'
      },
      '/admin/dashboard': {
        title: 'Dashboard',
        subtitle: 'Overview of your business',
        icon: LayoutDashboard,
        color: 'blue'
      },
      '/admin/products': {
        title: 'Products',
        subtitle: 'Manage your product catalog',
        icon: Package,
        color: 'green'
      },
      '/admin/orders': {
        title: 'Orders',
        subtitle: 'Track and manage customer orders',
        icon: ShoppingCart,
        color: 'purple'
      },
      '/admin/tracking': {
        title: 'Tracking Dashboard',
        subtitle: 'Monitor order tracking and delivery status',
        icon: Truck,
        color: 'orange'
      },
      '/admin/forms': {
        title: 'Forms',
        subtitle: 'Manage contact forms and inquiries',
        icon: FileText,
        color: 'orange'
      },
      '/admin/pages': {
        title: 'Pages',
        subtitle: 'Manage About and Contact pages',
        icon: FileText,
        color: 'purple'
      },
      '/admin/users': {
        title: 'Users',
        subtitle: 'Manage user accounts',
        icon: Users,
        color: 'cyan'
      },
      '/admin/settings': {
        title: 'Settings',
        subtitle: 'Configure your application',
        icon: Settings,
        color: 'gray'
      }
    };

    return pages[pathname] || {
      title: 'Admin Panel',
      subtitle: 'Manage your application',
      icon: LayoutDashboard,
      color: 'blue'
    };
  };

  const pageInfo = getPageInfo();
  const Icon = pageInfo.icon;

  const getColorClasses = (color) => {
    const colors = {
      blue: 'from-blue-500 to-blue-600',
      green: 'from-green-500 to-green-600',
      purple: 'from-purple-500 to-purple-600',
      orange: 'from-orange-500 to-orange-600',
      cyan: 'from-cyan-500 to-cyan-600',
      gray: 'from-gray-500 to-gray-600'
    };
    return colors[color] || colors.blue;
  };

  return (
    <motion.div
      className="mb-8"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <div className="flex items-center space-x-4">
        <motion.div
          className={`w-12 h-12 bg-gradient-to-r ${getColorClasses(pageInfo.color)} rounded-xl flex items-center justify-center shadow-lg`}
          whileHover={{ 
            scale: 1.1,
            rotate: 360,
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
          }}
          transition={{ duration: 0.6 }}
        >
          <Icon className="w-6 h-6 text-white" />
        </motion.div>
        
        <div>
          <motion.h1
            className="text-3xl font-bold text-gray-900"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {pageInfo.title}
          </motion.h1>
          <motion.p
            className="text-gray-600 mt-1"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            {pageInfo.subtitle}
          </motion.p>
        </div>
      </div>
    </motion.div>
  );
};

export default PageTitle;
