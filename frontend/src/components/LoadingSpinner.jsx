import React from 'react';
import { motion } from 'framer-motion';
import { Waves, Droplets, Sparkles } from 'lucide-react';

const LoadingSpinner = ({ size = 'medium', text = 'Chargement...' }) => {
  const sizeClasses = {
    small: 'w-6 h-6',
    medium: 'w-12 h-12',
    large: 'w-16 h-16'
  };

  const containerVariants = {
    animate: {
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    animate: {
      y: [0, -20, 0],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  const waveVariants = {
    animate: {
      scale: [1, 1.2, 1],
      rotate: [0, 180, 360],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      {/* Animated Icons */}
      <motion.div
        className="flex space-x-2"
        variants={containerVariants}
        animate="animate"
      >
        <motion.div
          className={`${sizeClasses[size]} text-blue-500`}
          variants={itemVariants}
        >
          <Waves className="w-full h-full" />
        </motion.div>
        <motion.div
          className={`${sizeClasses[size]} text-cyan-500`}
          variants={itemVariants}
        >
          <Droplets className="w-full h-full" />
        </motion.div>
        <motion.div
          className={`${sizeClasses[size]} text-blue-400`}
          variants={itemVariants}
        >
          <Sparkles className="w-full h-full" />
        </motion.div>
      </motion.div>

      {/* Spinning Wave */}
      <motion.div
        className="w-8 h-8 text-blue-600"
        variants={waveVariants}
        animate="animate"
      >
        <Waves className="w-full h-full" />
      </motion.div>

      {/* Loading Text */}
      {text && (
        <motion.p
          className="text-gray-600 font-medium"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {text}
        </motion.p>
      )}

      {/* Progress Dots */}
      <motion.div
        className="flex space-x-1"
        variants={containerVariants}
        animate="animate"
      >
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className="w-2 h-2 bg-blue-500 rounded-full"
            variants={{
              animate: {
                scale: [1, 1.5, 1],
                opacity: [0.5, 1, 0.5],
                transition: {
                  duration: 1,
                  repeat: Infinity,
                  delay: i * 0.2
                }
              }
            }}
          />
        ))}
      </motion.div>
    </div>
  );
};

// Full page loading overlay
export const LoadingOverlay = ({ text = 'Chargement...' }) => {
  return (
    <motion.div
      className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm mx-4"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        <LoadingSpinner size="large" text={text} />
      </motion.div>
    </motion.div>
  );
};

// Skeleton loader for cards
export const SkeletonCard = () => {
  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden animate-pulse">
      <div className="h-64 bg-gray-200"></div>
      <div className="p-6 space-y-4">
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        <div className="h-10 bg-gray-200 rounded"></div>
      </div>
    </div>
  );
};

// Pulse animation for loading states
export const PulseLoader = ({ className = "w-4 h-4" }) => {
  return (
    <motion.div
      className={`bg-blue-500 rounded-full ${className}`}
      animate={{
        scale: [1, 1.2, 1],
        opacity: [0.5, 1, 0.5],
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    />
  );
};

export default LoadingSpinner;
