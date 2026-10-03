import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform, useMotionTemplate, useReducedMotion } from 'framer-motion';
import { ArrowLeft, Plus, Minus, ShoppingBag, Star, Truck, Banknote, ShieldCheck, Check, ChevronRight, Send, MessageCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useCart } from '../context/CartContext';
import { useShopSettings, whatsappLink } from '../context/shopSettings';
import { useCustomer } from '../context/CustomerContext';
import { hasVariants, isOnRequest, priceOf, availability, canBuy, priceRange } from '../utils/productOffer';
import ProductReviews from '../components/product/ProductReviews';
import ProductVisual from '../components/product/ProductVisual';
import ProductCard from '../components/product/ProductCard';
import WishlistButton from '../components/WishlistButton';
import { Reveal } from '../components/fx/Motion';
import { categoryLook } from '../utils/categoryIcons';
import { pickProducts } from '../utils/productPicks';
import { flyToCart } from '../utils/flyToCart';
import { EASE } from '../utils/motion';
import { productMeta, usePageMeta } from '../utils/pageMeta';
import { track } from '../utils/analytics';

// The product on a lit stage that turns towards the pointer
const Stage = ({ product, reference }) => {
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
          Réf. {reference || String(product._id).slice(-6).toUpperCase()}
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

const money = (value) => Number(value).toLocaleString('fr-FR', { maximumFractionDigits: 3 });

// Picks a version: buttons for a few, a list for many
const VersionPicker = ({ product, value, onChange, currency }) => {
  const versions = product.variants;
  const priceText = (v) => (isOnRequest(product, v) ? 'prix sur demande' : `${money(v.price)} ${currency}`);
  if (versions.length > 8) {
    return (
      <label className="block text-sm font-medium text-gray-700">
        Version
        <select className="mt-1.5 w-full rounded-2xl border border-gray-200 bg-surface px-4 py-3 text-base text-gray-900" value={value || ''} onChange={(event) => onChange(event.target.value)}>
          <option value="" disabled>Choisissez une version…</option>
          {versions.map(v => (
            <option key={v.sku || v.label} value={v.sku}>
              {`${v.label} · ${priceText(v)}${availability(product, v).state === 'out' ? ' · rupture' : ''}`}
            </option>
          ))}
        </select>
      </label>
    );
  }
  return (
    <fieldset>
      <legend className="text-sm font-medium text-gray-700">Version</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {versions.map(v => {
          const selected = v.sku === value;
          const out = availability(product, v).state === 'out';
          return (
            <button
              key={v.sku || v.label}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(v.sku)}
              className={`rounded-2xl border px-3.5 py-2 text-start text-sm transition-colors ${selected ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-200 bg-surface text-gray-800 hover:border-blue-400'} ${out && !selected ? 'opacity-60' : ''}`}
            >
              <span className="block font-semibold">{v.label}</span>
              <span className={`block text-xs tabular ${selected ? 'text-white/85' : 'text-gray-500'}`}>{isOnRequest(product, v) ? 'Prix sur demande' : `${money(v.price)} ${currency}`}{out ? ' · rupture' : ''}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
};

// "Prix sur demande": the visitor leaves their details and the shop replies
// with a price (it lands in Admin → Forms as a quote request)
const PriceRequest = ({ product, variant }) => {
  const { customer } = useCustomer();
  const { contact } = useShopSettings();
  const code = variant?.sku || product.sku;
  const what = `${product.name}${variant ? ` – ${variant.label}` : ''}${code ? ` (réf. ${code})` : ''}`;
  const [form, setForm] = useState(() => ({
    name: [customer?.firstName, customer?.lastName].filter(Boolean).join(' '),
    phone: customer?.phone || '', email: customer?.email || '', city: ''
  }));
  const [state, setState] = useState('idle');
  const [error, setError] = useState('');
  const set = (key) => (event) => setForm(current => ({ ...current, [key]: event.target.value }));
  const send = async (event) => {
    event.preventDefault();
    setState('sending');
    setError('');
    try {
      await axios.post('/api/forms/quote', { ...form, message: `Demande de prix : ${what}` });
      setState('sent');
      track('generate_lead', { form: 'price_request' });
    } catch (err) {
      setError(err.response?.data?.errors?.[0]?.msg || err.response?.data?.message || 'L’envoi n’a pas abouti. Réessayez ou écrivez-nous sur WhatsApp.');
      setState('idle');
    }
  };
  const whatsapp = whatsappLink(contact.whatsapp);
  const field = 'mt-1 w-full rounded-2xl border border-gray-200 bg-surface px-4 py-2.5 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15';

  if (state === 'sent') {
    return (
      <div className="rounded-2xl bg-green-50 p-4 text-sm text-green-800" role="status">
        <p className="flex items-center gap-2 font-semibold"><Check className="h-4 w-4" aria-hidden="true" /> Demande envoyée</p>
        <p className="mt-1">Nous vous rappelons rapidement avec le prix de {what}.</p>
      </div>
    );
  }
  return (
    <form onSubmit={send} className="space-y-3" aria-label="Demander le prix">
      <p className="text-sm text-gray-600">Ce produit est vendu sur devis. Laissez vos coordonnées : nous vous donnons le prix et le délai, sans engagement.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-medium text-gray-700">Nom<input className={field} value={form.name} onChange={set('name')} required maxLength={100} autoComplete="name" /></label>
        <label className="text-sm font-medium text-gray-700">Téléphone<input className={field} type="tel" value={form.phone} onChange={set('phone')} required minLength={8} maxLength={20} autoComplete="tel" /></label>
        <label className="text-sm font-medium text-gray-700">Email<input className={field} type="email" value={form.email} onChange={set('email')} required autoComplete="email" /></label>
        <label className="text-sm font-medium text-gray-700">Ville<input className={field} value={form.city} onChange={set('city')} required maxLength={50} autoComplete="address-level2" /></label>
      </div>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="submit" className="btn-brand flex-1" disabled={state === 'sending'}><Send className="h-4 w-4" aria-hidden="true" /> {state === 'sending' ? 'Envoi…' : 'Demander le prix'}</button>
        {whatsapp && (
          <a className="btn-ghost" href={`${whatsapp}?text=${encodeURIComponent(`Bonjour, quel est le prix de ${what} ?`)}`} target="_blank" rel="noopener noreferrer">
            <MessageCircle className="h-4 w-4" aria-hidden="true" /> WhatsApp
          </a>
        )}
      </div>
    </form>
  );
};

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
  const [variantSku, setVariantSku] = useState(null);
  const tabsRef = useRef(null);
  const addRef = useRef(null);
  const addedTimer = useRef();

  useEffect(() => () => clearTimeout(addedTimer.current), []);

  const versions = hasVariants(product);
  const variant = versions ? product.variants.find(v => v.sku === variantSku) || null : null;
  const buyable = Boolean(product) && canBuy(product, variant);
  const stock = product ? availability(product, variant) : { state: 'out', stock: 0 };
  // On order: the quantity is not limited by the stock
  const maxQuantity = stock.state === 'order' ? 99 : Math.max(1, stock.stock);
  const onRequest = Boolean(product) && (versions ? Boolean(variant) && isOnRequest(product, variant) : isOnRequest(product));
  const unitPrice = product ? priceOf(product, variant) || 0 : 0;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setQuantity(1);
    setActiveTab('description');
    axios.get(`/api/products/${id}`)
      .then(response => {
        if (cancelled) return;
        setProduct(response.data);
        track('view_item', { items: [{ id: response.data._id, name: response.data.name, price: response.data.price }] });
        // The first version that can be bought is chosen for the visitor; when
        // none can (all on request, or out of stock), the first one
        const list = response.data.variants || [];
        const first = list.find(v => canBuy(response.data, v)) || list[0];
        setVariantSku(first?.sku ?? null);
      })
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

  usePageMeta(loading ? null : product
    ? productMeta(product, window.location.origin)
    : { title: 'Produit introuvable', noindex: true });

  const showReviews = () => {
    setActiveTab('reviews');
    tabsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleAddToCart = (event) => {
    if (!buyable) return;
    addToCart(product, quantity, variant);
    flyToCart(event?.currentTarget || addRef.current);
    setAdded(true);
    clearTimeout(addedTimer.current);
    addedTimer.current = setTimeout(() => setAdded(false), 1600);
  };

  const changeQuantity = (next) => {
    if (next >= 1 && next <= maxQuantity) setQuantity(next);
  };
  const chooseVersion = (sku) => { setVariantSku(sku); setQuantity(1); };

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
  const stockLevel = Math.min(1, (stock.stock || 0) / 30);
  const range = priceRange(product);
  // "Prix sur demande" in place of a price
  const askPrice = onRequest || (!versions && isOnRequest(product)) || (versions && !variant && !range);
  const specifications = Object.entries(product.specifications || {});
  const brand = typeof product.brand === 'object' ? product.brand?.name : product.brand;
  const freeDelivery = unitPrice * quantity > delivery.freeDeliveryOver;

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
            <Stage product={product} reference={variant?.sku || product.sku} />
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

              {askPrice ? (
                <p className="mt-6 font-display text-4xl font-bold tracking-tight text-gray-900">Prix sur demande</p>
              ) : versions && !variant ? (
                <p className="mt-6 font-display text-4xl font-bold tracking-tight text-gray-900 tabular">
                  {range.max > range.min ? `${money(range.min)} – ${money(range.max)}` : money(range.min)}
                  <span className="ms-2 text-xl font-medium text-gray-500">{t('currency')}</span>
                </p>
              ) : (
                <p className="mt-6 font-display text-5xl font-bold tracking-tight text-gray-900 tabular">
                  {money(unitPrice)}
                  <span className="ms-2 text-xl font-medium text-gray-500">{t('currency')}</span>
                </p>
              )}
              <p className="mt-1 text-sm text-gray-500">{askPrice ? 'Prix et délai donnés sur devis' : 'Prix TTC'}</p>

              {product.description && <p className="mt-6 text-lg leading-relaxed text-gray-600">{product.description}</p>}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2, ease: EASE }}
              className="panel mt-8 space-y-5 p-5 sm:p-6"
            >
              {versions && <VersionPicker product={product} value={variantSku} onChange={chooseVersion} currency={t('currency')} />}

              {(!versions || variant) && !onRequest && (
              <div>
                <div className="flex items-center justify-between text-sm">
                  <span className={`inline-flex items-center gap-2 font-medium ${stock.state === 'in' ? 'text-green-700' : stock.state === 'order' ? 'text-sky-700' : 'text-red-600'}`}>
                    <span className={`h-2 w-2 rounded-full ${stock.state === 'in' ? 'bg-green-500' : stock.state === 'order' ? 'bg-sky-500' : 'bg-red-500'}`} />
                    {stock.state === 'in' ? `En stock (${stock.stock} disponibles)` : stock.state === 'order' ? 'Sur commande : nous le commandons pour vous, délai confirmé par téléphone' : 'Rupture de stock'}
                  </span>
                </div>
                {stock.state === 'in' && (
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
              )}

              {(onRequest || (!versions && isOnRequest(product))) && <PriceRequest product={product} variant={variant} />}
              {versions && !variant && <p className="text-sm text-gray-600">Choisissez une version pour voir son prix et sa disponibilité.</p>}

              {buyable && (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="sr-only">{t('quantity')}</span>
                  <Stepper value={quantity} max={maxQuantity} onChange={changeQuantity} />
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
              {activeTab === 'specifications' && versions && (
                <div className="mb-8 overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <caption className="mb-3 text-left font-display text-lg font-semibold text-gray-900">Versions</caption>
                    <thead className="border-b border-gray-200 text-xs uppercase text-gray-500">
                      <tr><th className="py-2 pe-4">Réf.</th><th className="py-2 pe-4">Version</th><th className="py-2 pe-4 text-end">Prix</th><th className="py-2">Disponibilité</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {product.variants.map(v => (
                        <tr key={v.sku || v.label}>
                          <td className="py-2 pe-4 font-mono text-gray-500">{v.sku}</td>
                          <td className="py-2 pe-4 text-gray-900">{v.label}</td>
                          <td className="py-2 pe-4 text-end tabular text-gray-900">{isOnRequest(product, v) ? 'Sur demande' : `${money(v.price)} ${t('currency')}`}</td>
                          <td className="py-2 text-gray-600">{availability(product, v).label}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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
                ) : !versions && <p className="text-gray-600">Pas de caractéristiques renseignées pour ce produit.</p>
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
      {buyable && (
        <div className="glass fixed inset-x-3 bottom-3 z-40 flex items-center gap-3 rounded-full p-2 ps-5 lg:hidden">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-gray-500">{product.name}{variant ? ` – ${variant.label}` : ''}</p>
            <p className="font-display font-bold text-gray-900 tabular">{money(unitPrice * quantity)} {t('currency')}</p>
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
