import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Minus, ShoppingBag, Trash2, Truck, ArrowRight } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { useShopSettings } from '../context/shopSettings';
import ProductVisual from './product/ProductVisual';
import { cartKey as lineKey } from '../utils/productOffer';

const money = (amount) => Number(amount).toLocaleString('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });

// How far the cart is from free delivery (the amount set in Admin → Settings)
export const FreeDeliveryMeter = ({ subtotal, className = '' }) => {
  const { delivery } = useShopSettings();
  const threshold = delivery.freeDeliveryOver;
  const done = subtotal > threshold;
  const progress = Math.min(1, subtotal / Math.max(1, threshold));
  return (
    <div className={className}>
      <p className="flex items-center gap-2 text-sm text-gray-700">
        <Truck className={`h-4 w-4 ${done ? 'text-green-600' : 'text-blue-600'}`} aria-hidden="true" />
        {done
          ? <span><strong className="font-semibold text-green-700">Livraison offerte</strong> pour cette commande</span>
          : <span>Plus que <strong className="font-semibold text-gray-900 tabular">{money(threshold - subtotal)} TND</strong> pour la livraison offerte</span>}
      </p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100" aria-hidden="true">
        <motion.div
          className="h-full rounded-full"
          style={{ background: done ? 'rgb(var(--success-500))' : 'linear-gradient(90deg, rgb(var(--aqua-500)), rgb(var(--violet-500)))' }}
          initial={false}
          animate={{ width: `${progress * 100}%` }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        />
      </div>
    </div>
  );
};

const CartSidebar = () => {
  const { cartItems, isCartOpen, setIsCartOpen, updateQuantity, removeFromCart, getCartTotal } = useCart();
  const { t, isRTL } = useLanguage();
  const closeRef = useRef(null);
  const subtotal = getCartTotal();
  const close = () => setIsCartOpen(false);

  // While open: Escape closes, the page behind does not scroll
  useEffect(() => {
    if (!isCartOpen) return undefined;
    const onKey = (event) => { if (event.key === 'Escape') setIsCartOpen(false); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [isCartOpen, setIsCartOpen]);

  const offscreen = isRTL ? '-105%' : '105%';

  return (
    <AnimatePresence>
      {isCartOpen && (
        <div className="fixed inset-0 z-[65]">
          <motion.div
            className="absolute inset-0 bg-gray-950/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label={t('cart')}
            className={`glass absolute inset-y-2 ${isRTL ? 'left-2' : 'right-2'} flex w-[calc(100%-1rem)] max-w-md flex-col overflow-hidden rounded-[1.75rem]`}
            initial={{ x: offscreen }}
            animate={{ x: 0 }}
            exit={{ x: offscreen, transition: { duration: 0.25, ease: 'easeIn' } }}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
          >
            <header className="flex items-center justify-between px-6 pb-4 pt-5">
              <div>
                <p className="eyebrow">Votre sélection</p>
                <h2 className="font-display text-2xl font-bold text-gray-900">
                  {t('cart')} <span className="font-mono text-base font-medium text-gray-400">({cartItems.length})</span>
                </h2>
              </div>
              <button ref={closeRef} type="button" onClick={close} aria-label="Fermer le panier" className="grid h-10 w-10 place-items-center rounded-full bg-gray-100 text-gray-700 transition-transform hover:rotate-90">
                <X className="h-5 w-5" />
              </button>
            </header>

            {cartItems.length > 0 && <FreeDeliveryMeter subtotal={subtotal} className="mx-6 mb-2 rounded-2xl bg-gray-50 p-3" />}

            <div className="flex-1 overflow-y-auto px-4 py-2">
              {cartItems.length === 0 ? (
                <div className="grid h-full place-items-center px-6 text-center">
                  <div>
                    <span className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-blue-50 text-blue-600">
                      <ShoppingBag className="h-9 w-9" aria-hidden="true" />
                    </span>
                    <p className="mt-5 font-display text-xl font-semibold text-gray-900">{t('cartEmpty')}</p>
                    <p className="mt-1 text-sm text-gray-500">Découvrez nos produits et ajoutez-les à votre panier.</p>
                    <Link to="/shop" onClick={close} className="btn-brand mt-6">
                      Continuer vos achats <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              ) : (
                <ul className="space-y-2">
                  <AnimatePresence initial={false}>
                    {cartItems.map((item) => (
                      <motion.li
                        key={lineKey(item)}
                        layout
                        initial={{ opacity: 0, x: 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 60, height: 0, marginTop: 0, transition: { duration: 0.25 } }}
                        className="flex gap-3 rounded-2xl p-2 transition-colors hover:bg-gray-50"
                      >
                        <Link to={`/product/${item._id}`} onClick={close} className="h-20 w-20 shrink-0 overflow-hidden rounded-xl">
                          <ProductVisual product={item} iconClassName="h-2/5 w-2/5" />
                        </Link>
                        <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
                          <div className="flex items-start justify-between gap-2">
                            <Link to={`/product/${item._id}`} onClick={close} className="line-clamp-2 text-sm font-medium text-gray-900 hover:text-blue-600">
                              {item.name}
                            </Link>
                            <button
                              type="button"
                              onClick={() => removeFromCart(lineKey(item))}
                              aria-label={`Retirer ${item.name} du panier`}
                              className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-gray-400 hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="inline-flex items-center rounded-full border border-gray-200">
                              <button type="button" onClick={() => updateQuantity(lineKey(item), item.quantity - 1)} aria-label={`Diminuer la quantité de ${item.name}`} className="grid h-8 w-8 place-items-center rounded-full text-gray-600 hover:bg-gray-100">
                                <Minus className="h-3.5 w-3.5" />
                              </button>
                              <span className="w-7 text-center font-mono text-sm tabular">{item.quantity}</span>
                              <button type="button" onClick={() => updateQuantity(lineKey(item), item.quantity + 1)} aria-label={`Augmenter la quantité de ${item.name}`} className="grid h-8 w-8 place-items-center rounded-full text-gray-600 hover:bg-gray-100">
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <p className="font-display font-semibold text-gray-900 tabular">{money(item.price * item.quantity)} <span className="text-xs text-gray-500">{t('currency')}</span></p>
                          </div>
                        </div>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              )}
            </div>

            {cartItems.length > 0 && (
              <footer className="space-y-4 border-t border-gray-200 px-6 pb-6 pt-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-gray-600">Sous-total</span>
                  <span className="font-display text-2xl font-bold text-gray-900 tabular">{money(subtotal)} <span className="text-sm font-medium text-gray-500">{t('currency')}</span></span>
                </div>
                <p className="-mt-2 text-xs text-gray-500">Prix TTC. Livraison calculée à la commande, selon le gouvernorat.</p>
                <div className="grid grid-cols-2 gap-2">
                  <Link to="/cart" onClick={close} className="btn-ghost !px-4 text-sm">Voir le panier</Link>
                  <Link to="/checkout" onClick={close} className="btn-brand !px-4 text-sm">
                    {t('checkout')} <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </div>
              </footer>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CartSidebar;
