import React, { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion, useMotionTemplate } from 'framer-motion';
import { Star, Plus, Check, ArrowUpRight, Award, Zap, Clock, SlidersHorizontal, MessageSquare } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useLanguage } from '../../context/LanguageContext';
import WishlistButton from '../WishlistButton';
import ProductVisual from './ProductVisual';
import { categoryLook } from '../../utils/categoryIcons';
import { flyToCart } from '../../utils/flyToCart';
import { hasVariants, isOnRequest, availability, priceRange } from '../../utils/productOffer';

const formatPrice = (price) => Number(price).toLocaleString('fr-FR');

const brandName = (brand) => (typeof brand === 'object' ? brand?.name : brand);

const badgesOf = (product) => [
  product.featured && { text: 'Populaire', icon: Award, tone: 'bg-amber-100 text-amber-800' },
  product.ratingStats?.averageRating >= 4.5 && product.ratingStats?.totalReviews > 0 && { text: 'Très bien noté', icon: Star, tone: 'bg-violet-100 text-violet-800' },
  product.stockQuantity > 0 && product.stockQuantity <= 5 && { text: 'Stock limité', icon: Zap, tone: 'bg-rose-100 text-rose-800' },
  availability(product).state === 'order' && { text: 'Sur commande', icon: Clock, tone: 'bg-sky-100 text-sky-800' }
].filter(Boolean);

// The price on a card: one price, "dès" the lowest of the versions, or
// "Prix sur demande"
const PriceTag = ({ product, currency }) => {
  if (isOnRequest(product)) {
    return <p className="font-display text-lg font-bold tracking-tight text-gray-900">Prix sur demande</p>;
  }
  const range = priceRange(product);
  return (
    <p className="font-display text-2xl font-bold tracking-tight text-gray-900 tabular">
      {range && range.max > range.min && <span className="me-1 text-sm font-medium text-gray-500">dès</span>}
      {formatPrice(product.price)} <span className="text-sm font-medium text-gray-500">{currency}</span>
    </p>
  );
};

const Rating = ({ stats }) => {
  if (!(stats?.totalReviews > 0)) return null;
  const rating = stats.averageRating;
  return (
    <div className="flex items-center gap-1.5" aria-label={`Note ${rating.toFixed(1)} sur 5`}>
      <div className="flex">
        {[0, 1, 2, 3, 4].map(i => (
          <Star key={i} className={`h-3.5 w-3.5 ${i < Math.round(rating) ? 'fill-current text-amber-400' : 'text-gray-300'}`} aria-hidden="true" />
        ))}
      </div>
      <span className="font-mono text-xs text-gray-500">{rating.toFixed(1)} · {stats.totalReviews}</span>
    </div>
  );
};

// A product with versions, or a price on request, is chosen or asked about
// on its page: the card links there instead of adding to the cart
const ChooseLink = ({ product, compact }) => {
  const onRequest = isOnRequest(product);
  const Icon = onRequest ? MessageSquare : SlidersHorizontal;
  const text = onRequest ? 'Devis' : 'Choisir';
  return (
    <Link
      to={`/product/${product._id}`}
      aria-label={onRequest ? `Demander le prix de ${product.name}` : `Choisir la version de ${product.name}`}
      className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full font-display text-sm font-semibold transition-transform duration-300 hover:-translate-y-0.5 ${compact ? 'h-10 w-10' : 'h-11 px-4'}`}
      style={{ background: 'rgb(var(--brand))', color: 'rgb(var(--on-brand))', boxShadow: 'var(--shadow-glow)' }}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {!compact && text}
    </Link>
  );
};

// "Add to cart": a round button that turns into a check for a moment
const AddButton = ({ product, compact = false }) => {
  const { addToCart } = useCart();
  const [added, setAdded] = useState(false);
  const ref = useRef(null);
  const timer = useRef();
  useEffect(() => () => clearTimeout(timer.current), []);
  const outOfStock = availability(product).state === 'out';
  if (hasVariants(product) || isOnRequest(product)) return <ChooseLink product={product} compact={compact} />;

  const add = (event) => {
    event.preventDefault();
    event.stopPropagation();
    addToCart(product);
    flyToCart(ref.current);
    setAdded(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setAdded(false), 1400);
  };

  return (
    <button
      ref={ref}
      type="button"
      onClick={add}
      disabled={outOfStock}
      aria-label={`Ajouter ${product.name} au panier`}
      className={`relative inline-flex shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-full font-display text-sm font-semibold transition-[transform,box-shadow,background-color] duration-300 hover:-translate-y-0.5 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 ${
        compact ? 'h-10 w-10' : 'h-11 px-4'
      }`}
      style={{
        background: added ? 'rgb(var(--success-600))' : 'rgb(var(--brand))',
        color: added ? 'white' : 'rgb(var(--on-brand))',
        boxShadow: added ? 'none' : 'var(--shadow-glow)'
      }}
    >
      <motion.span key={added ? 'added' : 'add'} initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="inline-flex items-center gap-1.5">
        {added ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        {!compact && (added ? 'Ajouté' : 'Ajouter')}
      </motion.span>
    </button>
  );
};

// Tilts towards the mouse, with a light reflection following it
const useTilt = () => {
  const reduce = useReducedMotion();
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const spring = { stiffness: 220, damping: 22, mass: 0.6 };
  const rotateY = useSpring(useTransform(px, [0, 1], [-9, 9]), spring);
  const rotateX = useSpring(useTransform(py, [0, 1], [7, -7]), spring);
  const glareX = useTransform(px, v => `${v * 100}%`);
  const glareY = useTransform(py, v => `${v * 100}%`);
  const glare = useMotionTemplate`radial-gradient(420px circle at ${glareX} ${glareY}, rgb(255 255 255 / 0.22), transparent 45%)`;
  const visualX = useSpring(useTransform(px, [0, 1], [8, -8]), spring);
  const visualY = useSpring(useTransform(py, [0, 1], [6, -6]), spring);

  const onPointerMove = (event) => {
    if (reduce || event.pointerType !== 'mouse') return;
    const box = event.currentTarget.getBoundingClientRect();
    px.set((event.clientX - box.left) / box.width);
    py.set((event.clientY - box.top) / box.height);
  };
  const onPointerLeave = () => { px.set(0.5); py.set(0.5); };

  return { rotateX, rotateY, glare, visualX, visualY, onPointerMove, onPointerLeave };
};

const ProductCard = ({ product, index = 0, viewMode = 'grid' }) => {
  const { t } = useLanguage();
  const tilt = useTilt();
  const url = `/product/${product._id}`;
  const { icon: CategoryIcon } = categoryLook(product.category);
  const badges = badgesOf(product);
  const brand = brandName(product.brand);
  const stock = availability(product);
  const outOfStock = stock.state === 'out';

  const reveal = {
    initial: { opacity: 0, y: 28 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-40px' },
    transition: { duration: 0.7, delay: Math.min(index, 8) * 0.06, ease: [0.22, 1, 0.36, 1] }
  };

  const categoryChip = (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500">
      <CategoryIcon className="h-3.5 w-3.5 text-blue-600" aria-hidden="true" />
      {product.categoryName || product.category}
    </span>
  );

  const price = <PriceTag product={product} currency={t('currency')} />;

  if (viewMode === 'list') {
    return (
      <motion.article {...reveal} className="group panel relative flex overflow-hidden transition-shadow duration-500 hover:shadow-large">
        <Link to={url} aria-label={`Voir ${product.name}`} className="relative w-36 shrink-0 sm:w-56">
          <ProductVisual product={product} iconClassName="h-2/5 w-2/5" />
        </Link>
        <div className="flex min-w-0 flex-1 flex-col gap-2 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              {categoryChip}
              <h3 className="font-display text-lg font-semibold leading-tight text-gray-900">
                <Link to={url} className="hover:text-blue-600">{product.name}</Link>
              </h3>
              {brand && <p className="text-xs text-gray-500">Marque : {brand}</p>}
            </div>
            <WishlistButton productId={product._id} size="sm" />
          </div>
          <Rating stats={product.ratingStats} />
          {product.description && <p className="line-clamp-2 text-sm text-gray-600">{product.description}</p>}
          <div className="mt-auto flex items-center justify-between gap-3 pt-2">
            <div>
              {price}
              <p className={`text-xs font-medium ${outOfStock ? 'text-red-600' : stock.state === 'order' ? 'text-sky-700' : 'text-green-700'}`}>{stock.label}</p>
            </div>
            <div className="flex items-center gap-2">
              <Link to={url} className="hidden rounded-full px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 sm:inline-flex">
                Voir Détails
              </Link>
              <AddButton product={product} />
            </div>
          </div>
        </div>
      </motion.article>
    );
  }

  return (
    <motion.article {...reveal} className="group relative [perspective:1100px]">
      <motion.div
        onPointerMove={tilt.onPointerMove}
        onPointerLeave={tilt.onPointerLeave}
        style={{ rotateX: tilt.rotateX, rotateY: tilt.rotateY, transformStyle: 'preserve-3d' }}
        className="panel relative flex h-full flex-col overflow-hidden transition-shadow duration-500 group-hover:shadow-float"
      >
        <Link to={url} aria-label={`Voir ${product.name}`} className="relative block aspect-[4/3] overflow-hidden">
          <motion.div className="absolute -inset-3" style={{ x: tilt.visualX, y: tilt.visualY }}>
            <ProductVisual product={product} />
          </motion.div>
          {outOfStock && (
            <span className="absolute inset-0 grid place-items-center bg-gray-950/50 backdrop-blur-[2px]">
              <span className="rounded-full bg-surface px-4 py-1.5 text-sm font-semibold text-gray-900">Rupture de stock</span>
            </span>
          )}
        </Link>

        {badges.length > 0 && (
          <div className="pointer-events-none absolute start-3 top-3 flex flex-col items-start gap-1.5">
            {badges.map(({ text, icon: Icon, tone }) => (
              <span key={text} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-soft ${tone}`}>
                <Icon className="h-3 w-3" aria-hidden="true" /> {text}
              </span>
            ))}
          </div>
        )}
        <div className="absolute end-3 top-3">
          <WishlistButton productId={product._id} size="md" />
        </div>

        <div className="flex flex-1 flex-col gap-2 p-5">
          <div className="flex items-center justify-between gap-2">
            {categoryChip}
            <Rating stats={product.ratingStats} />
          </div>
          <h3 className="font-display text-lg font-semibold leading-snug text-gray-900">
            <Link to={url} className="transition-colors hover:text-blue-600">{product.name}</Link>
          </h3>
          {brand && <p className="-mt-1 text-xs text-gray-500">Marque : {brand}</p>}
          <div className="mt-auto flex items-end justify-between gap-3 pt-3">
            <div>
              {price}
              <Link to={url} className="group/link mt-0.5 inline-flex items-center gap-1 text-sm font-medium text-blue-600">
                Voir Détails
                <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover/link:-translate-y-0.5 group-hover/link:translate-x-0.5" aria-hidden="true" />
              </Link>
            </div>
            <AddButton product={product} compact />
          </div>
        </div>

        {/* Light reflection that follows the mouse */}
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{ background: tilt.glare, mixBlendMode: 'soft-light' }}
        />
      </motion.div>
    </motion.article>
  );
};

export default ProductCard;
