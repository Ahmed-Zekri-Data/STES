import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform, useMotionTemplate, useReducedMotion } from 'framer-motion';
import { ArrowLeft, Plus, Minus, ShoppingBag, Star, Truck, Banknote, ShieldCheck, Check, ChevronRight } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useCart } from '../context/CartContext';
import { useShopSettings } from '../context/shopSettings';
import ProductReviews from '../components/product/ProductReviews';
import ProductVisual from '../components/product/ProductVisual';
import ProductCard from '../components/product/ProductCard';
import WishlistButton from '../components/WishlistButton';
import { Reveal } from '../components/fx/Motion';
import { categoryLook } from '../utils/categoryIcons';
import { pickProducts } from '../utils/productPicks';
import { flyToCart } from '../utils/flyToCart';
import { EASE } from '../utils/motion';

// The product on a lit stage that turns towards the pointer
const Stage = ({ product }) => {
  const reduce = useReducedMotion();
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const spring = { stiffness: 160, damping: 20 };
  const rotateY = useSpring(useTransform(px, [0, 1], [-14, 14]), spring);
  const rotateX = useSpring(useTransform(py, [0, 1], [10, -10]), spring);
  const lightX = useTransform(px, v => `${v * 100}%`);
  const lightY = useTransform(py, v => `${v * 100}%`);
  const light = useMotionTemplate`radial-gradient(500px circle at ${lightX} ${lightY}, rgb(255 255 255 / 0.25), transparent 50%)`;

  const move = (event) => {
    if (reduce || event.pointerType === 'touch') return;
    const box = event.currentTarget.getBoundingClientRect();
    px.set((event.clientX - box.left) / box.width);
    py.set((event.clientY - box.top) / box.height);
  };

  return (
    <div className="[perspective:1400px]" onPointerMove={move} onPointerLeave={() => { px.set(0.5); py.set(0.5); }}>
      <motion.div
        style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
        className="group panel relative aspect-square overflow-hidden !rounded-[2rem] shadow-float"
      >
        <ProductVisual product={product} eager iconClassName="h-1/3 w-1/3" />
        <motion.div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: light, mixBlendMode: 'soft-light' }} />
        <div className="pointer-events-none absolute bottom-4 start-4 rounded-full bg-surface/80 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-gray-600 backdrop-blur">
          Réf. {String(product._id).slice(-6).toUpperCase()}
        </div>
      </motion.div>
    </div>
  );
};

const Stepper = ({ value, max, onChange }) => (
  <div className="inline-flex items-center rounded-full border border-gray-200 bg-surface p-1">
    <button type="button" onClick={() => onChange(value - 1)} disabled={value <= 1} aria-label="Diminuer la quantité" className="grid h-10 w-10 place-items-center rounded-full text-gray-700 hover:bg-gray-100 disabled:opacity-30">
      <Minus className="h-4 w-4" />
    </button>
    <output aria-live="polite" className="w-10 text-center font-mono text-lg font-medium tabular">{value}</output>
    <button type="button" onClick={() => onChange(value + 1)} disabled={value >= max} aria-label="Augmenter la quantité" className="grid h-10 w-10 place-items-center rounded-full text-gray-700 hover:bg-gray-100 disabled:opacity-30">
      <Plus className="h-4 w-4" />
    </button>
  </div>
);

const TABS = [
  ['description', 'description'],
  ['specifications', 'specifications'],
  ['reviews', null]
];

const ProductDetails = () => {
  const { id } = useParams();
  const { hash } = useLocation();
  const { t } = useLanguage();
  const { addToCart } = useCart();
  const { delivery, bank } = useShopSettings();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState('description');
  const [added, setAdded] = useState(false);
  const [related, setRelated] = useState([]);
  const tabsRef = useRef(null);
  const addRef = useRef(null);
  const addedTimer = useRef();

  useEffect(() => () => clearTimeout(addedTimer.current), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setQuantity(1);
    setActiveTab('description');
    axios.get(`/api/products/${id}`)
      .then(response => { if (!cancelled) setProduct(response.data); })
      .catch(error => {
        // 404 or an invalid ID: show "product not found"
        if (cancelled) return;
        setProduct(null);
        if (error.response?.status !== 404 && error.response?.status !== 400) {
          console.error('Error fetching product:', error);
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  // Other products from the same category
  useEffect(() => {
    if (!product) return undefined;
    let cancelled = false;
    pickProducts({ categories: [product.category], exclude: [product._id], limit: 3 })
      .then(list => { if (!cancelled) setRelated(list); })
      .catch(() => { if (!cancelled) setRelated([]); });
    return () => { cancelled = true; };
  }, [product?._id, product?.category]); // eslint-disable-line react-hooks/exhaustive-deps

  // "Donner mon avis" links in the delivery email end with #avis
  useEffect(() => {
    if (product && hash === '#avis') {
      setActiveTab('reviews');
      tabsRef.current?.scrollIntoView({ block: 'start' });
    }
  }, [product, hash]);

  const showReviews = () => {
    setActiveTab('reviews');
    tabsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleAddToCart = (event) => {
    if (!product) return;
    addToCart(product, quantity);
    flyToCart(event?.currentTarget || addRef.current);
    setAdded(true);
    clearTimeout(addedTimer.current);
    addedTimer.current = setTimeout(() => setAdded(false), 1600);
  };

  const changeQuantity = (next) => {
    if (next >= 1 && next <= (product?.stockQuantity || 1)) setQuantity(next);
  };

  if (loading) {
    return (
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:px-8" role="status" aria-label="Chargement">
        <div className="skeleton aspect-square !rounded-[2rem]" />
        <div className="space-y-4 pt-6">
          <div className="skeleton h-4 w-32" />
          <div className="skeleton h-12 w-3/4" />
          <div className="skeleton h-10 w-40" />
          <div className="skeleton h-24 w-full" />
          <div className="skeleton h-14 w-full !rounded-full" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="mx-auto grid max-w-xl place-items-center px-4 py-32 text-center">
        <p className="eyebrow">Erreur 404</p>
        <h1 className="mt-3 font-display text-4xl font-bold text-gray-900">Produit non trouvé</h1>
        <p className="mt-3 text-gray-600">Ce produit n&apos;existe plus ou l&apos;adresse est incorrecte.</p>
        <Link to="/shop" className="btn-brand mt-8">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Retour à la boutique
        </Link>
      </div>
    );
  }

  const averageRating = product.ratingStats?.averageRating || 0;
  const totalReviews = product.ratingStats?.totalReviews || 0;
  const { icon: CategoryIcon } = categoryLook(product.category);
  const stockLevel = Math.min(1, (product.stockQuantity || 0) / 30);
  const specifications = Object.entries(product.specifications || {});
  const brand = typeof product.brand === 'object' ? product.brand?.name : product.brand;
  const freeDelivery = product.price * quantity > delivery.freeDeliveryOver;

  const perks = [
    { icon: Truck, title: freeDelivery ? 'Livraison offerte' : `Livraison offerte dès ${delivery.freeDeliveryOver} TND`, text: 'Dans les 24 gouvernorats' },
    { icon: Banknote, title: 'Paiement à la livraison', text: bank ? 'Ou par virement bancaire' : 'En espèces, à la réception' },
    { icon: ShieldCheck, title: 'Garantie', text: 'Sur tous nos produits' }
  ];

  return (
    <div className="pb-28 lg:pb-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <nav aria-label="Fil d'Ariane" className="flex flex-wrap items-center gap-1.5 pt-8 text-sm text-gray-500">
          <Link to="/shop" className="hover:text-gray-900">{t('shop')}</Link>
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          <Link to={`/shop?category=${encodeURIComponent(product.category)}`} className="hover:text-gray-900">
            {product.categoryName || product.category}
          </Link>
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="truncate text-gray-900" aria-current="page">{product.name}</span>
        </nav>

        <div className="mt-6 grid gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.9, ease: EASE }} className="lg:sticky lg:top-28 lg:self-start">
            <Stage product={product} />
          </motion.div>

          <div className="lg:pt-4">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1, ease: EASE }}>
              <p className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
                <CategoryIcon className="h-4 w-4" aria-hidden="true" />
                {product.categoryName || product.category}
                {brand && <span className="text-blue-500">· {brand}</span>}
              </p>
              <h1 className="mt-4 font-display text-4xl font-bold leading-[1.05] tracking-[-0.03em] text-gray-900 sm:text-5xl">
                {product.name}
              </h1>

              <button type="button" onClick={showReviews} className="mt-4 inline-flex items-center gap-2 rounded-full text-sm text-gray-600 hover:text-gray-900">
                <span className="flex" aria-hidden="true">
                  {[0, 1, 2, 3, 4].map(i => (
                    <Star key={i} className={`h-4 w-4 ${i < Math.round(averageRating) ? 'fill-current text-amber-400' : 'text-gray-300'}`} />
                  ))}
                </span>
                <span className="underline-offset-4 hover:underline">
                  {totalReviews > 0 ? `${averageRating.toFixed(1)} sur 5 (${totalReviews} avis)` : 'Aucun avis : donnez le vôtre'}
                </span>
              </button>

              <p className="mt-6 font-display text-5xl font-bold tracking-tight text-gray-900 tabular">
                {Number(product.price).toLocaleString('fr-FR')}
                <span className="ms-2 text-xl font-medium text-gray-500">{t('currency')}</span>
              </p>
              <p className="mt-1 text-sm text-gray-500">Prix TTC</p>

              {product.description && <p className="mt-6 text-lg leading-relaxed text-gray-600">{product.description}</p>}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2, ease: EASE }}
              className="panel mt-8 space-y-5 p-5 sm:p-6"
            >
              <div>
                <div className="flex items-center justify-between text-sm">
                  <span className={`inline-flex items-center gap-2 font-medium ${product.inStock ? 'text-green-700' : 'text-red-600'}`}>
                    <span className={`h-2 w-2 rounded-full ${product.inStock ? 'bg-green-500' : 'bg-red-500'}`} />
                    {product.inStock ? `En stock (${product.stockQuantity} disponibles)` : 'Rupture de stock'}
                  </span>
                </div>
                {product.inStock && (
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100" aria-hidden="true">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: 'linear-gradient(90deg, rgb(var(--aqua-500)), rgb(var(--violet-500)))' }}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(8, stockLevel * 100)}%` }}
                      transition={{ duration: 1.2, delay: 0.4, ease: EASE }}
                    />
                  </div>
                )}
              </div>

              {product.inStock && (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="sr-only">{t('quantity')}</span>
                  <Stepper value={quantity} max={product.stockQuantity} onChange={changeQuantity} />
                  <button ref={addRef} type="button" onClick={handleAddToCart} className="btn-brand flex-1 py-3.5 text-base">
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.span key={added ? 'added' : 'add'} initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -10, opacity: 0 }} className="inline-flex items-center gap-2">
                        {added ? <Check className="h-5 w-5" aria-hidden="true" /> : <ShoppingBag className="h-5 w-5" aria-hidden="true" />}
                        {added ? 'Ajouté au panier' : t('addToCart')}
                      </motion.span>
                    </AnimatePresence>
                  </button>
                  <WishlistButton productId={product._id} size="lg" />
                </div>
              )}

              <ul className="grid gap-3 border-t border-gray-200 pt-5 sm:grid-cols-3">
                {perks.map(({ icon: Icon, title, text }) => (
                  <li key={title} className="flex gap-3 sm:flex-col sm:gap-2">
                    <Icon className="h-5 w-5 shrink-0 text-blue-600" aria-hidden="true" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{title}</p>
                      <p className="text-xs text-gray-500">{text}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>

        {/* Details */}
        <section ref={tabsRef} className="mt-20 scroll-mt-28" aria-label="Détails du produit">
          <div role="tablist" className="inline-flex rounded-full bg-gray-100 p-1">
            {TABS.map(([key, label]) => (
              <button
                key={key}
                role="tab"
                id={`tab-${key}`}
                aria-selected={activeTab === key}
                aria-controls={`panel-${key}`}
                onClick={() => setActiveTab(key)}
                className={`relative rounded-full px-4 py-2 text-sm font-medium transition-colors sm:px-5 ${activeTab === key ? 'text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
              >
                {activeTab === key && <motion.span layoutId="product-tab" className="absolute inset-0 rounded-full bg-surface shadow-soft" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                <span className="relative">{label ? t(label) : `Avis (${totalReviews})`}</span>
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              id={`panel-${activeTab}`}
              role="tabpanel"
              aria-labelledby={`tab-${activeTab}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}
              transition={{ duration: 0.4, ease: EASE }}
              className="panel mt-6 p-6 sm:p-8"
            >
              {activeTab === 'description' && (
                <p className="max-w-3xl text-lg leading-relaxed text-gray-600">{product.description || 'Pas encore de description.'}</p>
              )}
              {activeTab === 'specifications' && (
                specifications.length > 0 ? (
                  <dl className="grid gap-x-10 md:grid-cols-2">
                    {specifications.map(([key, value]) => (
                      <div key={key} className="flex justify-between gap-6 border-b border-gray-200 py-3">
                        <dt className="font-medium text-gray-900">{key}</dt>
                        <dd className="text-end text-gray-600">{value}</dd>
                      </div>
                    ))}
                  </dl>
                ) : <p className="text-gray-600">Pas de caractéristiques renseignées pour ce produit.</p>
              )}
              {activeTab === 'reviews' && (
                <ProductReviews
                  productId={product._id}
                  onStatsChange={(ratingStats) => setProduct(current => ({ ...current, ratingStats }))}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </section>

        {related.length > 0 && (
          <section className="mt-24" aria-labelledby="related-title">
            <Reveal as="p" className="eyebrow">Même catégorie</Reveal>
            <h2 id="related-title" className="mt-2 font-display text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">Vous pourriez aussi aimer</h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((item, index) => <ProductCard key={item._id} product={item} index={index} />)}
            </div>
          </section>
        )}
      </div>

      {/* Phones: price and "add to cart" stay at the bottom of the screen */}
      {product.inStock && (
        <div className="glass fixed inset-x-3 bottom-3 z-40 flex items-center gap-3 rounded-full p-2 ps-5 lg:hidden">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-gray-500">{product.name}</p>
            <p className="font-display font-bold text-gray-900 tabular">{(product.price * quantity).toLocaleString('fr-FR')} {t('currency')}</p>
          </div>
          <button type="button" onClick={handleAddToCart} className="btn-brand !px-5 !py-3 text-sm">
            {added ? <Check className="h-4 w-4" aria-hidden="true" /> : <ShoppingBag className="h-4 w-4" aria-hidden="true" />}
            {added ? 'Ajouté' : 'Ajouter'}
          </button>
        </div>
      )}
    </div>
  );
};

export default ProductDetails;
