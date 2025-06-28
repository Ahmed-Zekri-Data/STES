import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, ShoppingCart, FileText, Package, Users } from 'lucide-react';

const QuickActions = () => {
  const quickActions = [
    {
      name: 'Add Product',
      href: '/admin/products',
      icon: Plus,
      color: 'blue',
      description: 'Add new product'
    },
    {
      name: 'View Orders',
      href: '/admin/orders',
      icon: ShoppingCart,
      color: 'green',
      description: 'Manage orders'
    },
    {
      name: 'Check Forms',
      href: '/admin/forms',
      icon: FileText,
      color: 'purple',
      description: 'Review submissions'
    },
    {
      name: 'Products',
      href: '/admin/products',
      icon: Package,
      color: 'orange',
      description: 'Manage inventory'
    }
  ];

  const getColorClasses = (color) => {
    const colors = {
      blue: 'text-blue-600 hover:bg-blue-50 hover:text-blue-700',
      green: 'text-green-600 hover:bg-green-50 hover:text-green-700',
      purple: 'text-purple-600 hover:bg-purple-50 hover:text-purple-700',
      orange: 'text-orange-600 hover:bg-orange-50 hover:text-orange-700'
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="hidden md:flex items-center space-x-2">
      {quickActions.map((action, index) => {
        const Icon = action.icon;
        return (
          <motion.div
            key={action.name}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <Link
              to={action.href}
              className={`p-2 rounded-lg transition-all duration-300 ${getColorClasses(action.color)}`}
              title={action.description}
            >
              <motion.div
                whileHover={{ scale: 1.1, rotate: 5 }}
                whileTap={{ scale: 0.9 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              >
                <Icon className="w-4 h-4" />
              </motion.div>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
};

export default QuickActions;
