import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus, Trash2, ShoppingBag, ArrowRight, ShieldCheck } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { useShopSettings, deliveryEstimate } from '../context/shopSettings';
import { pickProducts } from '../utils/productPicks';
import ProductVisual from '../components/product/ProductVisual';
import ProductCard from '../components/product/ProductCard';
import { FreeDeliveryMeter } from '../components/CartSidebar';
import { SplitWords } from '../components/fx/Motion';
import { categoryLook } from '../utils/categoryIcons';
import { cartKey as lineKey } from '../utils/productOffer';

// In-stock products from the same categories as the cart, not already in it
const CartSuggestions = ({ cartItems }) => {
  const [products, setProducts] = useState([]);
  const cartKey = cartItems.map(item => item._id).sort().join(',');

  useEffect(() => {
    let cancelled = false;
    pickProducts({
      categories: cartItems.map(item => item.category),
      exclude: cartItems.map(item => item._id),
      limit: 3
    })
      .then(picked => { if (!cancelled) setProducts(picked); })
      .catch(error => console.error('Error loading suggestions:', error));
    return () => { cancelled = true; };
    // Again when the products in the cart change, not their quantities
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartKey]);

  if (!products.length) return null;
  return (
    <section className="mt-24" aria-labelledby="suggestions-title">
      <p className="eyebrow">Pour compléter</p>
      <h2 id="suggestions-title" className="mt-2 font-display text-3xl font-bold tracking-tight text-gray-900">Vous pourriez aussi aimer</h2>
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product, index) => <ProductCard key={product._id} product={product} index={index} />)}
      </div>
    </section>
  );
};

const Cart = () => {
  const { delivery, stampDuty = 0 } = useShopSettings();
  const { cartItems, updateQuantity, removeFromCart, getCartTotal, clearCart } = useCart();
  const { t } = useLanguage();
  const subtotal = getCartTotal();
  const shipping = deliveryEstimate(subtotal, delivery);

  if (cartItems.length === 0) {
    return (
      <div className="mx-auto grid max-w-xl place-items-center px-4 py-32 text-center">
        <motion.span
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 14 }}
          className="grid h-24 w-24 place-items-center rounded-[2rem] bg-blue-50 text-blue-600 shadow-glow"
        >
          <ShoppingBag className="h-11 w-11" aria-hidden="true" />
        </motion.span>
        <h1 className="mt-8 font-display text-4xl font-bold text-gray-900">{t('cartEmpty')}</h1>
        <p className="mt-3 text-gray-600">Votre panier est vide. Découvrez nos produits et ajoutez-les à votre panier.</p>
        <Link to="/shop" className="btn-brand mt-8">
          <span>Continuer vos achats</span>
          <ArrowRight className="h-5 w-5" aria-hidden="true" />
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pb-8 pt-10 sm:px-6 sm:pt-14 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Étape 1 sur 2 · Panier</p>
          <h1 className="mt-2 font-display text-5xl font-bold tracking-[-0.03em] text-gray-900 sm:text-6xl">
            <SplitWords text={t('cart')} />{' '}
            <span className="font-mono text-2xl font-medium text-gray-400">({cartItems.length} {cartItems.length === 1 ? 'article' : 'articles'})</span>
          </h1>
        </div>
        <button type="button" onClick={clearCart} className="rounded-full px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50">
          Vider le panier
        </button>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_24rem]">
        <div>
          <FreeDeliveryMeter subtotal={subtotal} className="panel mb-4 p-4" />
          <ul className="space-y-3">
            <AnimatePresence initial={false}>
              {cartItems.map((item) => {
                const { icon: Icon } = categoryLook(item.category);
                return (
                  <motion.li
                    key={lineKey(item)}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -40, transition: { duration: 0.25 } }}
                    className="panel flex gap-4 p-3 sm:p-4"
                  >
                    <Link to={`/product/${item._id}`} className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl sm:h-28 sm:w-28">
                      <ProductVisual product={item} iconClassName="h-2/5 w-2/5" />
                    </Link>
                    <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="inline-flex items-center gap-1.5 text-xs text-gray-500">
                            <Icon className="h-3.5 w-3.5 text-blue-600" aria-hidden="true" />
                            {item.categoryName || item.category}
                          </p>
                          <Link to={`/product/${item._id}`} className="mt-0.5 block font-display text-lg font-semibold leading-snug text-gray-900 hover:text-blue-600">
                            {item.name}
                          </Link>
                          <p className="text-sm text-gray-500 tabular">{Number(item.price).toLocaleString('fr-FR')} {t('currency')} l&apos;unité</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFromCart(lineKey(item))}
                          aria-label={`Retirer ${item.name} du panier`}
                          className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <div className="inline-flex items-center rounded-full border border-gray-200">
                          <button type="button" onClick={() => updateQuantity(lineKey(item), item.quantity - 1)} aria-label={`Diminuer la quantité de ${item.name}`} className="grid h-9 w-9 place-items-center rounded-full text-gray-600 hover:bg-gray-100">
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="w-8 text-center font-mono tabular">{item.quantity}</span>
                          <button type="button" onClick={() => updateQuantity(lineKey(item), item.quantity + 1)} aria-label={`Augmenter la quantité de ${item.name}`} className="grid h-9 w-9 place-items-center rounded-full text-gray-600 hover:bg-gray-100">
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                        <p className="font-display text-xl font-bold text-gray-900 tabular">
                          {(item.price * item.quantity).toFixed(3)} <span className="text-sm font-medium text-gray-500">{t('currency')}</span>
                        </p>
                      </div>
                    </div>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        </div>

        {/* Order Summary */}
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="glass rounded-[1.75rem] p-6">
            <h2 className="font-display text-xl font-semibold text-gray-900">Résumé de la commande</h2>

            <div className="mt-5 space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Sous-total:</span>
                <span className="font-medium tabular">{subtotal.toFixed(3)} {t('currency')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Livraison:</span>
                <span className="font-medium tabular">
                  {shipping.free
                    ? <span className="text-green-700">Gratuite</span>
                    : `dès ${shipping.from.toFixed(3)} ${t('currency')}`}
                </span>
              </div>
              <div className="border-t border-gray-200 pt-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-lg font-semibold text-gray-900">{t('total')}:</span>
                  <span className="font-display text-3xl font-bold text-gray-900 tabular">
                    {shipping.free ? '' : 'dès '}{(subtotal + shipping.from + stampDuty).toFixed(3)} {t('currency')}
                  </span>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Prix TTC{stampDuty > 0 && `, timbre fiscal (${stampDuty} ${t('currency')}) compris`}.
                  {!shipping.free && ' La livraison dépend du gouvernorat : le prix exact s\'affiche à l\'étape Livraison.'}
                  {delivery.cashOnDeliveryFee > 0 && ` Paiement à la livraison : +${delivery.cashOnDeliveryFee} ${t('currency')}.`}
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <Link to="/checkout" className="btn-brand w-full py-4 text-base">
                Procéder au paiement <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </Link>
              <Link to="/shop" className="btn-ghost w-full">Continuer vos achats</Link>
            </div>

            <p className="mt-5 flex items-center gap-2 text-xs text-gray-500">
              <ShieldCheck className="h-4 w-4 text-green-600" aria-hidden="true" />
              Paiement sécurisé : vos informations de paiement sont protégées.
            </p>
          </div>
        </aside>
      </div>

      <CartSuggestions cartItems={cartItems} />
    </div>
  );
};

export default Cart;
