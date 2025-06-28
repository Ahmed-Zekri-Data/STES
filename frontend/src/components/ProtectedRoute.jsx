import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAdmin } from '../context/AdminContext';
import { motion } from 'framer-motion';
import { Shield, Loader } from 'lucide-react';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAdmin();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex items-center justify-center">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl flex items-center justify-center shadow-lg"
            animate={{
              rotate: 360,
              scale: [1, 1.1, 1],
            }}
            transition={{
              rotate: {
                duration: 2,
                repeat: Infinity,
                ease: "linear"
              },
              scale: {
                duration: 1,
                repeat: Infinity,
                ease: "easeInOut"
              }
            }}
          >
            <Shield className="w-8 h-8 text-white" />
          </motion.div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Verifying Access
          </h2>
          <p className="text-gray-600 mb-4">
            Please wait while we authenticate your session...
          </p>
          <motion.div
            className="flex items-center justify-center space-x-2"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <Loader className="w-4 h-4 text-blue-600" />
            <span className="text-sm text-blue-600">Loading...</span>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
