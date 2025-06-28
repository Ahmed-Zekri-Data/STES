import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart } from 'lucide-react';
import { useWishlist } from '../context/WishlistContext';
import { useCustomer } from '../context/CustomerContext';

const WishlistButton = ({ 
  productId, 
  size = 'md', 
  showText = false, 
  className = '',
  onToggle = null 
}) => {
  const { isAuthenticated } = useCustomer();
  const { isInWishlist, toggleWishlist, loading } = useWishlist();
  const [isToggling, setIsToggling] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const inWishlist = isInWishlist(productId);

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12'
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  const handleToggle = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      setShowTooltip(true);
      setTimeout(() => setShowTooltip(false), 2000);
      return;
    }

    setIsToggling(true);
    try {
      await toggleWishlist(productId);
      if (onToggle) {
        onToggle(productId, !inWishlist);
      }
    } catch (error) {
      console.error('Error toggling wishlist:', error);
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <div className="relative">
      <motion.button
        onClick={handleToggle}
        disabled={isToggling || loading}
        className={`
          relative flex items-center justify-center rounded-full transition-all duration-300
          ${sizeClasses[size]}
          ${inWishlist 
            ? 'bg-red-100 text-red-600 hover:bg-red-200' 
            : 'bg-white/80 text-gray-600 hover:bg-red-50 hover:text-red-600'
          }
          ${isToggling ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110'}
          shadow-md hover:shadow-lg backdrop-blur-sm
          ${className}
        `}
        whileHover={{ scale: isToggling ? 1 : 1.1 }}
        whileTap={{ scale: isToggling ? 1 : 0.95 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
      >
        <AnimatePresence mode="wait">
          {isToggling ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className={`animate-spin rounded-full border-2 border-current border-t-transparent ${
                size === 'sm' ? 'w-3 h-3' : size === 'md' ? 'w-4 h-4' : 'w-5 h-5'
              }`}
            />
          ) : (
            <motion.div
              key="heart"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <Heart 
                className={`${iconSizes[size]} transition-all duration-300 ${
                  inWishlist ? 'fill-current' : ''
                }`}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pulse effect when adding to wishlist */}
        <AnimatePresence>
          {inWishlist && (
            <motion.div
              initial={{ scale: 1, opacity: 1 }}
              animate={{ scale: 2, opacity: 0 }}
              exit={{ scale: 1, opacity: 0 }}
              transition={{ duration: 0.6 }}
              className="absolute inset-0 rounded-full bg-red-400"
            />
          )}
        </AnimatePresence>
      </motion.button>

      {/* Text label */}
      {showText && (
        <motion.span
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className={`ml-2 text-sm font-medium transition-colors duration-300 ${
            inWishlist ? 'text-red-600' : 'text-gray-600'
          }`}
        >
          {inWishlist ? 'Dans la liste' : 'Ajouter à la liste'}
        </motion.span>
      )}

      {/* Tooltip for non-authenticated users */}
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg whitespace-nowrap z-50"
          >
            Connectez-vous pour ajouter à la liste de souhaits
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default WishlistButton;
