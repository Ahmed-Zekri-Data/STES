import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart,
  ShoppingCart,
  Trash2,
  Share2,
  Settings,
  Eye,
  EyeOff,
  Star,
  Filter,
  Grid,
  List,
  Search,
  Package
} from 'lucide-react';
import { useWishlist } from '../context/WishlistContext';
import { useCustomer } from '../context/CustomerContext';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import AnimatedButton from '../components/AnimatedButton';
import LoadingSpinner from '../components/LoadingSpinner';
import WishlistButton from '../components/WishlistButton';
import EnhancedProductCard from '../components/shop/EnhancedProductCard';

const Wishlist = () => {
  const { isAuthenticated } = useCustomer();
  const { wishlist, loading, clearWishlist, updateWishlistSettings, removeFromWishlist } = useWishlist();
  const { addToCart } = useCart();
  const { t, language } = useLanguage();
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    name: '',
    description: '',
    isPublic: false
  });

  useEffect(() => {
    if (wishlist) {
      setSettings({
        name: wishlist.name || 'Ma liste de souhaits',
        description: wishlist.description || '',
        isPublic: wishlist.isPublic || false
      });
    }
  }, [wishlist]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="w-24 h-24 bg-gradient-to-r from-red-400 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <Heart className="w-12 h-12 text-white" />
          </motion.div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Connectez-vous pour voir votre liste de souhaits
          </h2>
          <p className="text-gray-600 mb-6">
            Sauvegardez vos produits préférés et retrouvez-les facilement.
          </p>
          <AnimatedButton
            onClick={() => window.location.href = '/'}
            className="bg-gradient-to-r from-red-500 to-pink-500 text-white px-6 py-3 rounded-lg hover:from-red-600 hover:to-pink-600"
          >
            Retour à l'accueil
          </AnimatedButton>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const handleAddToCart = async (product) => {
    try {
      await addToCart(product, 1);
      // Optionally show success message
    } catch (error) {
      console.error('Error adding to cart:', error);
    }
  };

  const handleClearWishlist = async () => {
    if (window.confirm('Êtes-vous sûr de vouloir vider votre liste de souhaits ?')) {
      try {
        await clearWishlist();
      } catch (error) {
        console.error('Error clearing wishlist:', error);
      }
    }
  };

  const handleUpdateSettings = async () => {
    try {
      await updateWishlistSettings(settings);
      setShowSettings(false);
    } catch (error) {
      console.error('Error updating settings:', error);
    }
  };

  const shareWishlist = () => {
    if (settings.isPublic && wishlist?.id) {
      const url = `${window.location.origin}/wishlist/public/${wishlist.id}`;
      navigator.clipboard.writeText(url);
      // Show success message
    }
  };

  const wishlistItems = wishlist?.items || [];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="w-16 h-16 bg-gradient-to-r from-red-400 to-pink-500 rounded-full flex items-center justify-center"
              >
                <Heart className="w-8 h-8 text-white fill-current" />
              </motion.div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {settings.name}
                </h1>
                <p className="text-gray-600 mt-1">
                  {wishlistItems.length} produit{wishlistItems.length !== 1 ? 's' : ''}
                </p>
                {settings.description && (
                  <p className="text-gray-500 text-sm mt-1">{settings.description}</p>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {settings.isPublic && (
                <AnimatedButton
                  onClick={shareWishlist}
                  className="flex items-center space-x-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-200"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Partager</span>
                </AnimatedButton>
              )}
              
              <AnimatedButton
                onClick={() => setShowSettings(!showSettings)}
                className="flex items-center space-x-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200"
              >
                <Settings className="w-4 h-4" />
                <span>Paramètres</span>
              </AnimatedButton>

              {wishlistItems.length > 0 && (
                <AnimatedButton
                  onClick={handleClearWishlist}
                  className="flex items-center space-x-2 bg-red-100 text-red-700 px-4 py-2 rounded-lg hover:bg-red-200"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Vider</span>
                </AnimatedButton>
              )}
            </div>
          </div>

          {/* Settings Panel */}
          <AnimatePresence>
            {showSettings && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="mt-6 pt-6 border-t border-gray-200"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nom de la liste
                    </label>
                    <input
                      type="text"
                      value={settings.name}
                      onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <input
                      type="text"
                      value={settings.description}
                      onChange={(e) => setSettings({ ...settings, description: e.target.value })}
                      placeholder="Description optionnelle"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="isPublic"
                      checked={settings.isPublic}
                      onChange={(e) => setSettings({ ...settings, isPublic: e.target.checked })}
                      className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                    />
                    <label htmlFor="isPublic" className="text-sm text-gray-700">
                      Rendre la liste publique (partageable)
                    </label>
                    {settings.isPublic ? (
                      <Eye className="w-4 h-4 text-green-600" />
                    ) : (
                      <EyeOff className="w-4 h-4 text-gray-400" />
                    )}
                  </div>

                  <div className="flex space-x-3">
                    <AnimatedButton
                      onClick={() => setShowSettings(false)}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800"
                    >
                      Annuler
                    </AnimatedButton>
                    <AnimatedButton
                      onClick={handleUpdateSettings}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
                    >
                      Sauvegarder
                    </AnimatedButton>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Wishlist Items */}
        {wishlistItems.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg p-12 text-center"
          >
            <Heart className="w-24 h-24 text-gray-300 mx-auto mb-6" />
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Votre liste de souhaits est vide
            </h3>
            <p className="text-gray-600 mb-8">
              Découvrez nos produits et ajoutez vos favoris à votre liste de souhaits.
            </p>
            <AnimatedButton
              onClick={() => window.location.href = '/shop'}
              className="bg-gradient-to-r from-red-500 to-pink-500 text-white px-8 py-3 rounded-lg hover:from-red-600 hover:to-pink-600"
            >
              Découvrir nos produits
            </AnimatedButton>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <AnimatePresence>
              {wishlistItems.map((item, index) => (
                <motion.div
                  key={item._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300"
                >
                  <div className="relative">
                    <img
                      src={item.product?.images?.[0] || item.productSnapshot?.image || '/placeholder-product.jpg'}
                      alt={item.product?.name || item.productSnapshot?.name}
                      className="w-full h-48 object-cover"
                    />
                    <div className="absolute top-3 right-3">
                      <WishlistButton productId={item.product?._id || item.product} size="md" />
                    </div>
                  </div>

                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                      {item.product?.name || item.productSnapshot?.name}
                    </h3>
                    <p className="text-sm text-gray-600 mb-3">
                      {item.product?.category || item.productSnapshot?.category}
                    </p>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-lg font-bold text-red-600">
                        {item.product?.price || item.productSnapshot?.price} TND
                      </span>
                      <span className="text-xs text-gray-500">
                        Ajouté le {new Date(item.addedAt).toLocaleDateString('fr-FR')}
                      </span>
                    </div>

                    <div className="flex space-x-2">
                      <AnimatedButton
                        onClick={() => handleAddToCart(item.product)}
                        disabled={!item.product?.inStock}
                        className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                      >
                        <ShoppingCart className="w-4 h-4" />
                        <span>{item.product?.inStock ? 'Ajouter au panier' : 'Rupture de stock'}</span>
                      </AnimatedButton>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};

export default Wishlist;
