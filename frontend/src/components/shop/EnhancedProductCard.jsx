import React from 'react';
import { motion } from 'framer-motion';
import { Star, ShoppingCart, Eye, Award, Truck, Tag, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useLanguage } from '../../context/LanguageContext';
import WishlistButton from '../WishlistButton';

const EnhancedProductCard = ({ product, index = 0, viewMode = 'grid' }) => {
  const { t } = useLanguage();
  const { addToCart } = useCart();

  const cardVariants = {
    hidden: { 
      opacity: 0, 
      y: 50,
      scale: 0.9
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.6,
        delay: index * 0.1,
        ease: "easeOut"
      }
    }
  };

  const imageVariants = {
    hover: {
      scale: 1.1,
      transition: {
        duration: 0.4,
        ease: "easeOut"
      }
    }
  };

  const buttonVariants = {
    hover: {
      scale: 1.05,
      transition: {
        duration: 0.2,
        ease: "easeOut"
      }
    },
    tap: {
      scale: 0.95
    }
  };

  const renderStars = (rating, totalReviews) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < 5; i++) {
      stars.push(
        <Star
          key={i}
          className={`w-4 h-4 ${
            i < fullStars
              ? 'text-yellow-400 fill-current'
              : i === fullStars && hasHalfStar
              ? 'text-yellow-400 fill-current opacity-50'
              : 'text-gray-300'
          }`}
        />
      );
    }

    return (
      <div className="flex items-center space-x-1">
        <div className="flex">{stars}</div>
        <span className="text-sm text-gray-500">
          ({rating.toFixed(1)})
        </span>
        {totalReviews > 0 && (
          <span className="text-xs text-gray-400">
            {totalReviews} avis
          </span>
        )}
      </div>
    );
  };

  const getBadges = () => {
    const badges = [];
    
    if (product.featured) {
      badges.push({
        text: 'Populaire',
        className: 'bg-gradient-to-r from-orange-400 to-red-500',
        icon: <Award className="w-3 h-3" />
      });
    }
    
    if (product.ratingStats?.averageRating >= 4.5) {
      badges.push({
        text: 'Top Rated',
        className: 'bg-gradient-to-r from-yellow-400 to-orange-500',
        icon: <Star className="w-3 h-3" />
      });
    }
    
    if (product.stockQuantity > 0 && product.stockQuantity <= 5) {
      badges.push({
        text: 'Stock limité',
        className: 'bg-gradient-to-r from-red-500 to-pink-500',
        icon: <Zap className="w-3 h-3" />
      });
    }
    
    return badges;
  };

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product);
  };

  if (viewMode === 'list') {
    return (
      <motion.div
        className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden"
        variants={cardVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        whileHover={{ y: -2 }}
      >
        <div className="flex">
          {/* Image */}
          <div className="relative w-48 h-32 flex-shrink-0">
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-2 left-2">
              {getBadges().slice(0, 1).map((badge, index) => (
                <span
                  key={index}
                  className={`inline-flex items-center space-x-1 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg ${badge.className}`}
                >
                  {badge.icon}
                  <span>{badge.text}</span>
                </span>
              ))}
            </div>
            <div className="absolute top-2 right-2">
              <WishlistButton productId={product._id} size="sm" />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors">
                    {product.name}
                  </h3>
                  <p className="text-sm text-gray-500 capitalize">
                    {product.category} {product.subcategory && `• ${product.subcategory}`}
                  </p>
                  {product.brand && (
                    <p className="text-xs text-gray-400 mt-1">
                      Marque: {product.brand}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-blue-600">
                    {product.price} TND
                  </div>
                  {product.stockQuantity > 0 ? (
                    <div className="flex items-center text-green-600 text-xs">
                      <Truck className="w-3 h-3 mr-1" />
                      En stock
                    </div>
                  ) : (
                    <div className="text-red-500 text-xs">Rupture de stock</div>
                  )}
                </div>
              </div>

              {/* Rating */}
              {product.ratingStats?.totalReviews > 0 && (
                <div className="mb-3">
                  {renderStars(
                    product.ratingStats.averageRating,
                    product.ratingStats.totalReviews
                  )}
                </div>
              )}

              {/* Description */}
              <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                {product.description}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-2">
              <Link
                to={`/product/${product._id}`}
                className="flex-1"
              >
                <button className="w-full flex items-center justify-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                  <Eye className="w-4 h-4" />
                  <span>Voir</span>
                </button>
              </Link>
              <button
                onClick={handleAddToCart}
                disabled={!product.inStock}
                className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>Ajouter</span>
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // Grid view (default)
  return (
    <motion.div
      className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden"
      variants={cardVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      whileHover={{ y: -8 }}
    >
      {/* Badges */}
      <div className="absolute top-4 left-4 z-10 space-y-2">
        {getBadges().map((badge, index) => (
          <motion.span
            key={index}
            className={`inline-flex items-center space-x-1 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg ${badge.className}`}
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + index * 0.1 }}
          >
            {badge.icon}
            <span>{badge.text}</span>
          </motion.span>
        ))}
      </div>

      {/* Wishlist Button */}
      <div className="absolute top-4 right-4 z-10">
        <WishlistButton productId={product._id} />
      </div>

      {/* Product Image */}
      <div className="relative h-64 overflow-hidden bg-gradient-to-br from-blue-50 to-cyan-50">
        <motion.img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover"
          variants={imageVariants}
          whileHover="hover"
        />
        
        {/* Overlay on Hover */}
        <motion.div 
          className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
        >
          <motion.div
            className="flex space-x-3"
            initial={{ y: 20, opacity: 0 }}
            whileHover={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <Link to={`/product/${product._id}`}>
              <motion.button
                className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-gray-700 hover:text-blue-600 shadow-lg"
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
              >
                <Eye className="w-5 h-5" />
              </motion.button>
            </Link>
            <motion.button
              onClick={handleAddToCart}
              disabled={!product.inStock}
              className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white hover:bg-blue-700 disabled:bg-gray-400 shadow-lg"
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
            >
              <ShoppingCart className="w-5 h-5" />
            </motion.button>
          </motion.div>
        </motion.div>

        {/* Stock indicator */}
        {!product.inStock && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold">
              Rupture de stock
            </span>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="p-6">
        {/* Rating */}
        {product.ratingStats?.totalReviews > 0 && (
          <div className="mb-3">
            {renderStars(
              product.ratingStats.averageRating,
              product.ratingStats.totalReviews
            )}
          </div>
        )}

        {/* Product Name */}
        <motion.h3 
          className="text-lg font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors duration-300"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          {product.name}
        </motion.h3>

        {/* Category and Brand */}
        <motion.div 
          className="text-sm text-gray-500 mb-3 space-y-1"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <p className="capitalize">
            {product.category} {product.subcategory && `• ${product.subcategory}`}
          </p>
          {product.brand && (
            <p className="text-xs">Marque: {product.brand}</p>
          )}
        </motion.div>

        {/* Price and Stock */}
        <motion.div 
          className="flex items-center justify-between mb-4"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <div className="text-2xl font-bold text-blue-600">
            {product.price} TND
          </div>
          {product.inStock ? (
            <div className="flex items-center text-green-600 text-sm">
              <Truck className="w-4 h-4 mr-1" />
              En stock
            </div>
          ) : (
            <div className="text-red-500 text-sm">Rupture de stock</div>
          )}
        </motion.div>

        {/* Action Button */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Link
            to={`/product/${product._id}`}
            className="w-full"
          >
            <motion.button
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-3 px-4 rounded-xl font-semibold hover:from-blue-700 hover:to-cyan-700 transition-all duration-300 shadow-lg hover:shadow-xl"
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
            >
              Voir Détails
            </motion.button>
          </Link>
        </motion.div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute -bottom-2 -right-2 w-20 h-20 bg-gradient-to-br from-blue-400/20 to-cyan-400/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      <div className="absolute -top-2 -left-2 w-16 h-16 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100"></div>
    </motion.div>
  );
};

export default EnhancedProductCard;
