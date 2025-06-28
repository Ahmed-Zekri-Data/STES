import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight, Home } from 'lucide-react';

const Breadcrumb = () => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  // Remove 'admin' from the path for cleaner breadcrumbs
  const adminPathnames = pathnames.slice(1);

  const getBreadcrumbName = (path) => {
    const names = {
      'dashboard': 'Dashboard',
      'products': 'Products',
      'orders': 'Orders',
      'forms': 'Forms',
      'users': 'Users',
      'settings': 'Settings'
    };
    return names[path] || path.charAt(0).toUpperCase() + path.slice(1);
  };

  const getBreadcrumbPath = (index) => {
    return '/admin/' + adminPathnames.slice(0, index + 1).join('/');
  };

  if (adminPathnames.length === 0 || (adminPathnames.length === 1 && adminPathnames[0] === 'dashboard')) {
    return null; // Don't show breadcrumb on dashboard
  }

  return (
    <motion.nav
      className="flex items-center space-x-2 text-sm text-gray-600 mb-6"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        whileHover={{ scale: 1.05 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
      >
        <Link
          to="/admin/dashboard"
          className="flex items-center hover:text-blue-600 transition-colors duration-300"
        >
          <Home className="w-4 h-4 mr-1" />
          <span>Dashboard</span>
        </Link>
      </motion.div>

      {adminPathnames.map((path, index) => (
        <motion.div
          key={path}
          className="flex items-center space-x-2"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
        >
          <ChevronRight className="w-4 h-4 text-gray-400" />
          {index === adminPathnames.length - 1 ? (
            <span className="font-medium text-gray-900">
              {getBreadcrumbName(path)}
            </span>
          ) : (
            <motion.div
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            >
              <Link
                to={getBreadcrumbPath(index)}
                className="hover:text-blue-600 transition-colors duration-300"
              >
                {getBreadcrumbName(path)}
              </Link>
            </motion.div>
          )}
        </motion.div>
      ))}
    </motion.nav>
  );
};

export default Breadcrumb;
