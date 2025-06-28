import React from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { X, Plus, Minus, ShoppingBag, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AnimatedButton from './AnimatedButton';

const CartSidebar = () => {
  const { 
    cartItems, 
    isCartOpen, 
    setIsCartOpen, 
    updateQuantity, 
    removeFromCart, 
    getCartTotal 
  } = useCart();
  const { t, isRTL } = useLanguage();

  if (!isCartOpen) return null;

  const sidebarVariants = {
    hidden: {
      x: isRTL ? -400 : 400,
      opacity: 0
    },
    visible: {
      x: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30
      }
    },
    exit: {
      x: isRTL ? -400 : 400,
      opacity: 0,
      transition: {
        duration: 0.3
      }
    }
  };

  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, x: isRTL ? -100 : 100 }
  };

  return (
    <AnimatePresence>
      {isCartOpen && (
        <>
          {/* Overlay */}
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={() => setIsCartOpen(false)}
          />

          {/* Sidebar */}
          <motion.div
            className={`fixed top-0 ${isRTL ? 'left-0' : 'right-0'} h-full w-96 bg-white shadow-2xl z-50`}
            variants={sidebarVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">
              {t('cart')} ({cartItems.length})
            </h2>
            <button
              onClick={() => setIsCartOpen(false)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-4">
            {cartItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <ShoppingBag className="w-16 h-16 mb-4" />
                <p className="text-lg font-medium">{t('cartEmpty')}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {cartItems.map((item) => (
                  <div key={item._id} className="flex items-center space-x-4 p-3 border rounded-lg">
                    <img
                      src={item.image || '/api/placeholder/80/80'}
                      alt={item.name}
                      className="w-16 h-16 object-cover rounded-md"
                    />
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 text-sm">
                        {item.name}
                      </h3>
                      <p className="text-primary-600 font-semibold">
                        {item.price} {t('currency')}
                      </p>
                      
                      {/* Quantity Controls */}
                      <div className="flex items-center space-x-2 mt-2">
                        <button
                          onClick={() => updateQuantity(item._id, item.quantity - 1)}
                          className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="px-3 py-1 bg-gray-100 rounded text-sm font-medium">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item._id, item.quantity + 1)}
                          className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => removeFromCart(item._id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {cartItems.length > 0 && (
            <div className="border-t p-4 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-gray-900">
                  {t('total')}:
                </span>
                <span className="text-xl font-bold text-primary-600">
                  {getCartTotal().toFixed(2)} {t('currency')}
                </span>
              </div>
              
              <div className="space-y-2">
                <Link
                  to="/cart"
                  onClick={() => setIsCartOpen(false)}
                  className="w-full bg-gray-100 text-gray-900 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors text-center block"
                >
                  {t('cart')}
                </Link>
                <Link
                  to="/checkout"
                  onClick={() => setIsCartOpen(false)}
                  className="w-full bg-primary-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-primary-700 transition-colors text-center block"
                >
                  {t('checkout')}
                </Link>
              </div>
            </div>
          )}
        </div>
      </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CartSidebar;
