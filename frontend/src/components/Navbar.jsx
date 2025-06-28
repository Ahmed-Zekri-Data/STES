import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useCart } from '../context/CartContext';
import { useCustomer } from '../context/CustomerContext';
import { useTheme } from '../context/ThemeContext';
import { ShoppingCart, Menu, X, Globe, Waves, User, LogOut, Settings, Heart, Truck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AuthModal from './auth/AuthModal';
import InAppNotifications from './notifications/InAppNotifications';
import ThemeToggle from './ThemeToggle';

const Navbar = () => {
  const { t, language, changeLanguage, isRTL } = useLanguage();
  const { getCartItemsCount, toggleCart } = useCart();
  const { customer, isAuthenticated, logout } = useCustomer();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('login');
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 10;
      setScrolled(isScrolled);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navigation = [
    { name: t('home'), href: '/' },
    { name: t('shop'), href: '/shop' },
    { name: 'Boutique Pro', href: '/boutique' },
    { name: t('services'), href: '/services' },
    { name: 'Suivi', href: '/track-order' },
    { name: t('about'), href: '/about' },
    { name: t('contact'), href: '/contact' },
  ];

  const languages = [
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'ar', name: 'العربية', flag: '🇹🇳' },
    { code: 'en', name: 'English', flag: '🇺🇸' },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <motion.nav
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md shadow-lg border-b border-neutral-200 dark:border-neutral-800'
          : 'bg-white dark:bg-neutral-900 shadow-soft dark:shadow-glow'
      }`}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <motion.div
            className="flex-shrink-0"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            <Link to="/" className="flex items-center group">
              <motion.div
                className="w-10 h-10 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300"
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.6 }}
              >
                <Waves className="text-white w-6 h-6" />
              </motion.div>
              <span className="ml-3 text-xl font-bold gradient-text">
                STES.tn
              </span>
            </Link>
          </motion.div>

          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-1">
              {navigation.map((item, index) => (
                <motion.div
                  key={item.name}
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <Link
                    to={item.href}
                    className={`relative px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 group ${
                      isActive(item.href)
                        ? 'text-primary-600 dark:text-primary-400'
                        : 'text-neutral-700 dark:text-neutral-300 hover:text-primary-600 dark:hover:text-primary-400'
                    }`}
                  >
                    <span className="relative z-10">{item.name}</span>
                    {isActive(item.href) && (
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-blue-100 to-cyan-100 rounded-xl"
                        layoutId="activeTab"
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Right side items */}
          <div className="flex items-center space-x-4">
            {/* Theme Toggle */}
            <ThemeToggle className="hidden sm:flex" />

            {/* Language Selector */}
            <div className="relative">
              <button
                onClick={() => setIsLanguageMenuOpen(!isLanguageMenuOpen)}
                className="flex items-center space-x-1 text-gray-700 hover:text-primary-600 transition-colors"
              >
                <Globe className="w-5 h-5" />
                <span className="text-sm font-medium">
                  {languages.find(lang => lang.code === language)?.flag}
                </span>
              </button>

              {isLanguageMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        changeLanguage(lang.code);
                        setIsLanguageMenuOpen(false);
                      }}
                      className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                        language === lang.code ? 'bg-primary-50 text-primary-700' : 'text-gray-700'
                      }`}
                    >
                      <span className="mr-2">{lang.flag}</span>
                      {lang.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Customer Authentication */}
            {isAuthenticated ? (
              <div className="relative">
                <motion.button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center space-x-2 text-gray-700 hover:text-blue-600 transition-colors p-2 rounded-lg hover:bg-blue-50"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <span className="hidden sm:block text-sm font-medium">
                    {customer?.firstName}
                  </span>
                </motion.button>

                <AnimatePresence>
                  {isUserMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50"
                    >
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-900">
                          {customer?.fullName}
                        </p>
                        <p className="text-sm text-gray-500">{customer?.email}</p>
                        {customer?.loyaltyPoints > 0 && (
                          <p className="text-xs text-blue-600 mt-1">
                            {customer.loyaltyPoints} points de fidélité
                          </p>
                        )}
                      </div>

                      <div className="py-1">
                        <Link
                          to="/account"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                        >
                          <User className="w-4 h-4 mr-3" />
                          Mon compte
                        </Link>
                        <Link
                          to="/orders"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                        >
                          <ShoppingCart className="w-4 h-4 mr-3" />
                          Mes commandes
                        </Link>
                        <Link
                          to="/track-order"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                        >
                          <Truck className="w-4 h-4 mr-3" />
                          Suivi de commande
                        </Link>
                        <Link
                          to="/wishlist"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                        >
                          <Heart className="w-4 h-4 mr-3" />
                          Ma liste de souhaits
                        </Link>
                        <Link
                          to="/account/settings"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                        >
                          <Settings className="w-4 h-4 mr-3" />
                          Paramètres
                        </Link>
                      </div>

                      <div className="border-t border-gray-100 py-1">
                        <button
                          onClick={() => {
                            logout();
                            setIsUserMenuOpen(false);
                          }}
                          className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <LogOut className="w-4 h-4 mr-3" />
                          Se déconnecter
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <motion.button
                  onClick={() => {
                    setAuthModalMode('login');
                    setIsAuthModalOpen(true);
                  }}
                  className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors px-3 py-2 rounded-lg hover:bg-blue-50"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Connexion
                </motion.button>
                <motion.button
                  onClick={() => {
                    setAuthModalMode('register');
                    setIsAuthModalOpen(true);
                  }}
                  className="text-sm font-medium bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-4 py-2 rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all duration-200 shadow-md hover:shadow-lg"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  S'inscrire
                </motion.button>
              </div>
            )}

            {/* Notifications (only for authenticated users) */}
            {isAuthenticated && <InAppNotifications />}

            {/* Cart Button */}
            <motion.button
              onClick={toggleCart}
              className="relative p-2 text-gray-700 hover:text-blue-600 transition-colors group"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <motion.div
                whileHover={{ rotate: [0, -10, 10, 0] }}
                transition={{ duration: 0.5 }}
              >
                <ShoppingCart className="w-6 h-6 group-hover:text-blue-600 transition-colors duration-300" />
              </motion.div>
              <AnimatePresence>
                {getCartItemsCount() > 0 && (
                  <motion.span
                    className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center shadow-lg"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  >
                    <motion.span
                      key={getCartItemsCount()}
                      initial={{ scale: 1.5 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.2 }}
                    >
                      {getCartItemsCount()}
                    </motion.span>
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 text-gray-700 hover:text-primary-600 transition-colors"
              >
                {isMobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              className="md:hidden"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              <motion.div
                className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-gradient-to-br from-blue-50 to-cyan-50 border-t border-blue-100"
                initial={{ y: -20 }}
                animate={{ y: 0 }}
                exit={{ y: -20 }}
                transition={{ duration: 0.3 }}
              >
                {navigation.map((item, index) => (
                  <motion.div
                    key={item.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                  >
                    <Link
                      to={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`block px-4 py-3 rounded-xl text-base font-medium transition-all duration-300 ${
                        isActive(item.href)
                          ? 'bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700 shadow-md'
                          : 'text-gray-700 hover:bg-white hover:text-blue-600 hover:shadow-md'
                      }`}
                    >
                      {item.name}
                    </Link>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authModalMode}
      />
    </motion.nav>
  );
};

export default Navbar;
