import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';
import { ShoppingCart, Eye, Heart, Star } from 'lucide-react';

const AnimatedProductCard = ({ product, index = 0 }) => {
  const { t } = useLanguage();

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

  return (
    <motion.div
      className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden"
      variants={cardVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      whileHover={{ y: -8 }}
    >
      {/* Product Badge */}
      <div className="absolute top-4 left-4 z-10">
        <motion.span 
          className="bg-gradient-to-r from-green-400 to-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg"
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          Populaire
        </motion.span>
      </div>

      {/* Wishlist Button */}
      <motion.button
        className="absolute top-4 right-4 z-10 w-10 h-10 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center text-gray-600 hover:text-red-500 hover:bg-white transition-all duration-300 shadow-lg"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <Heart className="w-5 h-5" />
      </motion.button>

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
            <motion.button
              className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-gray-700 hover:text-blue-600 shadow-lg"
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
            >
              <Eye className="w-5 h-5" />
            </motion.button>
            <motion.button
              className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white hover:bg-blue-700 shadow-lg"
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
            >
              <ShoppingCart className="w-5 h-5" />
            </motion.button>
          </motion.div>
        </motion.div>
      </div>

      {/* Product Info */}
      <div className="p-6">
        {/* Rating */}
        <div className="flex items-center mb-2">
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 + i * 0.1 }}
            >
              <Star className="w-4 h-4 text-yellow-400 fill-current" />
            </motion.div>
          ))}
          <span className="text-sm text-gray-500 ml-2">(4.8)</span>
        </div>

        {/* Product Name */}
        <motion.h3 
          className="text-lg font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors duration-300"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          {product.name}
        </motion.h3>

        {/* Category */}
        <motion.p 
          className="text-sm text-gray-500 mb-3 capitalize"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          {product.category}
        </motion.p>

        {/* Price */}
        <motion.div 
          className="flex items-center justify-between"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <div className="flex items-center space-x-2">
            <span className="text-2xl font-bold text-blue-600">
              {product.price} {t('currency')}
            </span>
          </div>
        </motion.div>

        {/* Action Button */}
        <motion.div
          className="mt-4"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Link
            to={`/product/${product.id}`}
            className="w-full"
          >
            <motion.button
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-3 px-4 rounded-xl font-semibold hover:from-blue-700 hover:to-cyan-700 transition-all duration-300 shadow-lg hover:shadow-xl transform"
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

export default AnimatedProductCard;
