import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useCart } from '../context/CartContext';
import { useCustomer } from '../context/CustomerContext';
import { ShoppingBag, Menu, X, User, LogOut, Settings, Heart, Truck, Package, ArrowUpRight } from 'lucide-react';
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion';
import AuthModal from './auth/AuthModal';
import InAppNotifications from './notifications/InAppNotifications';
import ThemeToggle from './ThemeToggle';
import Logo from './brand/Logo';

const LANGUAGES = [
  { code: 'fr', name: 'Français', short: 'FR' },
  { code: 'ar', name: 'العربية', short: 'ع' },
  { code: 'en', name: 'English', short: 'EN' }
];

const iconButton = 'relative grid h-10 w-10 place-items-center rounded-full text-gray-700 transition-colors duration-200 hover:bg-gray-100 hover:text-gray-900';

// Menus that drop from the bar: a frosted card that grows from its button
const Dropdown = ({ open, className = '', children }) => (
  <AnimatePresence>
    {open && (
      <motion.div
        initial={{ opacity: 0, y: -8, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -6, scale: 0.98, transition: { duration: 0.12 } }}
        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
        style={{ transformOrigin: 'top right' }}
        className={`glass absolute end-0 top-full z-50 mt-3 overflow-hidden rounded-2xl ${className}`}
      >
        {children}
      </motion.div>
    )}
  </AnimatePresence>
);

// Closes a menu when clicking anywhere else or pressing Escape
const useDismiss = (open, close) => {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (event) => { if (!ref.current?.contains(event.target)) close(); };
    const onKey = (event) => { if (event.key === 'Escape') close(); };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close]);
  return ref;
};

const Navbar = () => {
  const { t, language, changeLanguage } = useLanguage();
  const { getCartItemsCount, toggleCart } = useCart();
  const { customer, isAuthenticated, logout } = useCustomer();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('login');
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const cartCount = getCartItemsCount();

  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, 'change', (y) => setScrolled(y > 24));

  const languageRef = useDismiss(isLanguageMenuOpen, () => setIsLanguageMenuOpen(false));
  const userRef = useDismiss(isUserMenuOpen, () => setIsUserMenuOpen(false));

  // Leaving a page closes its menus
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsUserMenuOpen(false);
  }, [location.pathname]);

  // The full-screen menu on phones keeps the page from scrolling behind it
  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isMobileMenuOpen]);

  const navigation = [
    { name: t('home'), href: '/' },
    { name: t('shop'), href: '/shop' },
    { name: t('services'), href: '/services' },
    { name: 'Suivi', href: '/track-order' },
    { name: t('about'), href: '/about' },
    { name: t('contact'), href: '/contact' }
  ];

  const isActive = (path) => (path === '/' ? location.pathname === '/' : location.pathname.startsWith(path));

  const openAuthModal = (mode) => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
    setIsMobileMenuOpen(false);
  };

  const accountLinks = [
    { to: '/account', icon: User, label: 'Mon compte' },
    { to: '/account?tab=orders', icon: Package, label: 'Mes commandes' },
    { to: '/track-order', icon: Truck, label: 'Suivi de commande' },
    { to: '/wishlist', icon: Heart, label: 'Ma liste de souhaits' },
    { to: '/account?tab=settings', icon: Settings, label: 'Paramètres' }
  ];

  return (
    <>
      <nav className="sticky top-0 z-50 px-3 pt-3 sm:px-5" aria-label="Navigation principale">
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 28 }}
          className={`glass relative mx-auto flex max-w-7xl items-center justify-between rounded-full ps-4 pe-2 transition-[height,box-shadow] duration-500 ease-out ${
            scrolled ? 'h-14 shadow-large' : 'h-16'
          }`}
        >
          <Link to="/" aria-label="STES.tn" className="shrink-0 rounded-full">
            <Logo />
          </Link>

          {/* Links, from 1024px */}
          <div className="hidden lg:flex items-center gap-1 rounded-full p-1">
            {navigation.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={`relative rounded-full px-4 py-2 text-sm font-medium transition-colors duration-200 ${
                    active ? 'text-gray-900' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-liquid"
                      className="absolute inset-0 rounded-full bg-gray-100 ring-1 ring-inset ring-blue-500/20"
                      style={{ boxShadow: 'inset 0 -2px 0 rgb(var(--aqua-500) / 0.55)' }}
                      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                    />
                  )}
                  <span className="relative">{item.name}</span>
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5">
            <ThemeToggle className="hidden sm:inline-flex me-1" />

            {/* Language, in the menu on phones */}
            <div ref={languageRef} className="relative hidden sm:block">
              <button
                onClick={() => setIsLanguageMenuOpen(open => !open)}
                aria-label="Langue"
                aria-expanded={isLanguageMenuOpen}
                className={`${iconButton} font-mono text-xs font-semibold`}
              >
                {LANGUAGES.find(lang => lang.code === language)?.short}
              </button>
              <Dropdown open={isLanguageMenuOpen} className="w-44 p-1.5">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => { changeLanguage(lang.code); setIsLanguageMenuOpen(false); }}
                    aria-pressed={language === lang.code}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm transition-colors ${
                      language === lang.code ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {lang.name}
                    <span className="font-mono text-xs text-gray-400">{lang.short}</span>
                  </button>
                ))}
              </Dropdown>
            </div>

            {isAuthenticated ? (
              <div ref={userRef} className="sm:relative">
                <button
                  onClick={() => setIsUserMenuOpen(open => !open)}
                  aria-label="Mon compte"
                  aria-expanded={isUserMenuOpen}
                  className="flex items-center gap-2 rounded-full p-1 pe-1 sm:pe-3 text-gray-700 transition-colors hover:bg-gray-100"
                >
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 font-display text-sm font-bold text-white">
                    {customer?.firstName?.[0]?.toUpperCase() || <User className="h-4 w-4" />}
                  </span>
                  <span className="hidden text-sm font-medium sm:block">{customer?.firstName}</span>
                </button>
                <Dropdown open={isUserMenuOpen} className="w-[min(18rem,calc(100vw-1.5rem))]">
                  <div className="border-b border-gray-200 px-4 py-4">
                    <p className="font-display font-semibold text-gray-900">{customer?.fullName}</p>
                    <p className="truncate text-sm text-gray-500">{customer?.email}</p>
                    {customer?.loyaltyPoints > 0 && (
                      <p className="mt-2 inline-flex rounded-full bg-blue-50 px-2.5 py-0.5 font-mono text-xs text-blue-700">
                        {customer.loyaltyPoints} points de fidélité
                      </p>
                    )}
                  </div>
                  <div className="p-1.5">
                    {accountLinks.map(({ to, icon: Icon, label }) => (
                      <Link
                        key={to}
                        to={to}
                        onClick={() => setIsUserMenuOpen(false)}
                        className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900"
                      >
                        <Icon className="h-4 w-4 text-gray-400 transition-colors group-hover:text-blue-600" aria-hidden="true" />
                        {label}
                      </Link>
                    ))}
                  </div>
                  <div className="border-t border-gray-200 p-1.5">
                    <button
                      onClick={() => { logout(); setIsUserMenuOpen(false); }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-red-600 transition-colors hover:bg-red-50"
                    >
                      <LogOut className="h-4 w-4" aria-hidden="true" />
                      Se déconnecter
                    </button>
                  </div>
                </Dropdown>
              </div>
            ) : (
              <>
                {/* Phones: one icon; "S'inscrire" is in the menu */}
                <button onClick={() => openAuthModal('login')} aria-label="Connexion" className={`${iconButton} sm:hidden`}>
                  <User className="h-5 w-5" />
                </button>
                <div className="hidden items-center gap-1 sm:flex">
                  <button
                    onClick={() => openAuthModal('login')}
                    className="rounded-full px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900"
                  >
                    Connexion
                  </button>
                  <button onClick={() => openAuthModal('register')} className="btn-brand !px-4 !py-2 text-sm">
                    S&apos;inscrire
                  </button>
                </div>
              </>
            )}

            {isAuthenticated && <InAppNotifications />}

            <button onClick={toggleCart} aria-label="Panier" className={iconButton}>
              <ShoppingBag className="h-5 w-5" />
              <AnimatePresence>
                {cartCount > 0 && (
                  <motion.span
                    key={cartCount}
                    initial={{ scale: 0.4, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 600, damping: 18 }}
                    className="absolute -end-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full px-1 font-mono text-[11px] font-semibold"
                    style={{ background: 'rgb(var(--brand))', color: 'rgb(var(--on-brand))', boxShadow: 'var(--shadow-glow)' }}
                  >
                    {cartCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>

            <button
              onClick={() => setIsMobileMenuOpen(open => !open)}
              aria-label="Menu"
              aria-expanded={isMobileMenuOpen}
              className={`${iconButton} lg:hidden`}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={isMobileMenuOpen ? 'close' : 'open'}
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                >
                  {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </motion.span>
              </AnimatePresence>
            </button>
          </div>
        </motion.div>
      </nav>

      {/* Phones and tablets: a full-screen sheet under the bar */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            className="fixed inset-0 z-40 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
          >
            <div className="absolute inset-0 bg-page/80 backdrop-blur-2xl" onClick={() => setIsMobileMenuOpen(false)} />
            <motion.div
              className="relative flex h-full flex-col px-6 pb-8 pt-28"
              initial={{ y: -24 }}
              animate={{ y: 0 }}
              exit={{ y: -12 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <ul className="space-y-1">
                {navigation.map((item, index) => (
                  <motion.li
                    key={item.href}
                    initial={{ opacity: 0, x: -24 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.04 * index, type: 'spring', stiffness: 300, damping: 28 }}
                  >
                    <Link
                      to={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      aria-current={isActive(item.href) ? 'page' : undefined}
                      className={`group flex items-center justify-between border-b border-gray-200 py-4 font-display text-3xl font-semibold transition-colors ${
                        isActive(item.href) ? 'text-gradient' : 'text-gray-900'
                      }`}
                    >
                      {item.name}
                      <ArrowUpRight className="h-6 w-6 text-gray-400 transition-transform duration-300 group-hover:-translate-y-1 group-hover:translate-x-1" aria-hidden="true" />
                    </Link>
                  </motion.li>
                ))}
              </ul>

              <div className="mt-auto space-y-4 pt-8">
                {!isAuthenticated && (
                  <div className="grid grid-cols-2 gap-3 sm:hidden">
                    <button onClick={() => openAuthModal('login')} className="btn-ghost">Connexion</button>
                    <button onClick={() => openAuthModal('register')} className="btn-brand">S&apos;inscrire</button>
                  </div>
                )}
                <div className="flex items-center justify-between sm:hidden">
                  <span className="eyebrow">Langue</span>
                  <div className="flex gap-1 rounded-full bg-gray-100 p-1">
                    {LANGUAGES.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => changeLanguage(lang.code)}
                        aria-pressed={language === lang.code}
                        className={`rounded-full px-3.5 py-1.5 font-mono text-sm font-medium transition-colors ${
                          language === lang.code ? 'bg-surface text-gray-900 shadow-soft' : 'text-gray-500'
                        }`}
                      >
                        {lang.short}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between sm:hidden">
                  <span className="eyebrow">Thème</span>
                  <ThemeToggle />
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authModalMode}
      />
    </>
  );
};

export default Navbar;
