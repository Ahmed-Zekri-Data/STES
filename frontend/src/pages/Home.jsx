import React, { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import {
  ShoppingBag, Wrench, ArrowRight, ArrowUpRight, Truck, Banknote, Headphones, ShieldCheck,
  MousePointerClick, Star, MessageCircle, Compass, PackageCheck, Hammer, RefreshCw
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useShopSettings, whatsappLink } from '../context/shopSettings';
import { pickProducts } from '../utils/productPicks';
import { categoryLook } from '../utils/categoryIcons';
import ProductCard from '../components/product/ProductCard';
import ProductVisual from '../components/product/ProductVisual';
import { Reveal, SplitWords, SpotlightCard, Marquee, Magnetic, SectionHeader } from '../components/fx/Motion';
import { EASE } from '../utils/motion';

// three.js is only downloaded for this page, after the text is on screen
const WaterScene = lazy(() => import('../components/three/WaterScene'));

// Nothing the page says depends on it: without WebGL the hero keeps a
// gradient of the same colours
const HeroFallback = () => (
  <div
    className="absolute inset-0"
    style={{ background: 'linear-gradient(180deg, transparent 35%, rgb(var(--aqua-300) / 0.5) 60%, rgb(var(--aqua-700) / 0.8) 100%)' }}
  />
);

const HUD = [
  { icon: Truck, label: 'Livraison dans les 24 gouvernorats' },
  { icon: Banknote, label: 'Paiement à la livraison' },
  { icon: Headphones, label: 'Support client 7j/7' },
  { icon: ShieldCheck, label: 'Garantie sur tous nos produits' }
];

const Hero = ({ featured }) => {
  const { t } = useLanguage();
  const hero = useRef(null);
  const [webgl, setWebgl] = useState(true);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: hero, offset: ['start start', 'end start'] });
  const contentY = useTransform(scrollYProgress, [0, 1], ['0%', reduce ? '0%' : '30%']);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  const onError = useCallback(() => setWebgl(false), []);

  return (
    <section
      ref={hero}
      className="relative -mt-[4.75rem] flex min-h-[100svh] cursor-crosshair flex-col overflow-hidden"
      aria-label="Accueil"
    >
      <div className="absolute inset-0 grid-lines opacity-60" aria-hidden="true" />
      {webgl ? (
        <Suspense fallback={<HeroFallback />}>
          <WaterScene eventSource={hero} onError={onError} />
        </Suspense>
      ) : <HeroFallback />}
      {/* Keeps the headline readable over bright water */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-2/3 bg-gradient-to-b from-page via-page/70 to-transparent" aria-hidden="true" />

      <motion.div
        style={{ y: contentY, opacity: contentOpacity }}
        className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 pb-10 pt-36 sm:px-6 lg:px-8 lg:pt-44"
      >
        <div className="grid flex-1 items-start gap-10 lg:grid-cols-[1fr_auto]">
          <div className="max-w-4xl">
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: EASE }}
              className="glass inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 font-mono text-xs uppercase tracking-[0.16em] text-gray-700"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 motion-safe:animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
              </span>
              Équipements de piscine · Tunisie
            </motion.p>

            <h1 className="mt-6 font-display text-[clamp(2.75rem,7.5vw,6.5rem)] font-bold leading-[0.95] tracking-[-0.035em] text-gray-900">
              <SplitWords text={t('heroTitle')} highlightLast={2} delay={0.15} />
            </h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6, ease: EASE }}
              className="mt-6 max-w-xl text-lg leading-relaxed text-gray-700 sm:text-xl"
            >
              {t('heroSubtitle')}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.75, ease: EASE }}
              className="mt-9 flex flex-wrap items-center gap-3"
            >
              <Magnetic>
                <Link to="/shop" className="btn-brand px-7 py-4 text-base">
                  <ShoppingBag className="h-5 w-5" aria-hidden="true" />
                  {t('shopNow')}
                </Link>
              </Magnetic>
              <Magnetic strength={0.15}>
                <Link to="/services" className="btn-ghost px-7 py-4 text-base">
                  <Wrench className="h-5 w-5" aria-hidden="true" />
                  {t('bookInstallation')}
                </Link>
              </Magnetic>
            </motion.div>
          </div>

          {/* A featured product, floating over the water */}
          {featured && (
            <motion.div
              initial={{ opacity: 0, y: 40, rotate: 4 }}
              animate={{ opacity: 1, y: 0, rotate: 0 }}
              transition={{ duration: 1.1, delay: 0.9, ease: EASE }}
              className="hidden lg:block"
            >
              <Link
                to={`/product/${featured._id}`}
                className="glass group block w-72 cursor-pointer rounded-3xl p-3 transition-transform duration-500 hover:-translate-y-1 motion-safe:animate-float"
              >
                <div className="relative aspect-square overflow-hidden rounded-2xl">
                  <ProductVisual product={featured} eager />
                  <span className="absolute start-3 top-3 rounded-full bg-surface/90 px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-gray-700">
                    À la une
                  </span>
                </div>
                <div className="flex items-end justify-between gap-3 px-2 pb-1 pt-3">
                  <div className="min-w-0">
                    <p className="truncate font-display font-semibold text-gray-900">{featured.name}</p>
                    <p className="font-mono text-sm text-gray-600 tabular">{Number(featured.price).toLocaleString('fr-FR')} {t('currency')}</p>
                  </div>
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gray-900 text-white transition-transform duration-300 group-hover:rotate-45">
                    <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                  </span>
                </div>
              </Link>
            </motion.div>
          )}
        </div>

        <div className="mt-12 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <ul className="flex flex-wrap gap-2">
            {HUD.map(({ icon: Icon, label }, i) => (
              <motion.li
                key={label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 1 + i * 0.08, ease: EASE }}
                className="glass flex items-center gap-2 rounded-full px-3.5 py-2 text-sm text-gray-800"
              >
                <Icon className="h-4 w-4 text-blue-600" aria-hidden="true" />
                {label}
              </motion.li>
            ))}
          </ul>
          {webgl && !reduce && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.6 }}
              className="glass hidden items-center gap-2 rounded-full px-3.5 py-2 font-mono text-xs uppercase tracking-[0.18em] text-gray-700 sm:flex"
            >
              <MousePointerClick className="h-4 w-4" aria-hidden="true" />
              Touchez l&apos;eau
            </motion.p>
          )}
        </div>
      </motion.div>
    </section>
  );
};

// The shop's categories, sliding past in large type
const CategoryBand = () => {
  const { language } = useLanguage();
  const [categories, setCategories] = useState([]);
  useEffect(() => {
    axios.get('/api/products/categories')
      .then(response => setCategories(Object.entries(response.data.categories || {})))
      .catch(() => setCategories([]));
  }, []);
  if (!categories.length) return null;
  const name = (c) => (language === 'en' && c.nameEn) || (language === 'ar' && c.nameAr) || c.name;

  return (
    <section aria-label="Catégories" className="relative border-y border-gray-200 bg-surface/50 py-6 backdrop-blur">
      <Marquee duration={45}>
        {categories.map(([slug, category]) => {
          const { icon: Icon } = categoryLook(slug);
          return (
            <Link
              key={slug}
              to={`/shop?category=${encodeURIComponent(slug)}`}
              className="group/cat mx-6 flex items-center gap-4 font-display text-4xl font-bold tracking-tight text-transparent transition-colors duration-300 [-webkit-text-stroke:1px_rgb(var(--ink-t400))] hover:text-gray-900 hover:[-webkit-text-stroke:0] sm:text-6xl"
            >
              <Icon className="h-8 w-8 shrink-0 text-blue-500 transition-transform duration-500 group-hover/cat:rotate-[20deg] sm:h-10 sm:w-10" strokeWidth={1.5} aria-hidden="true" />
              {name(category)}
              <span className="ms-6 h-2 w-2 rounded-full bg-gray-300" aria-hidden="true" />
            </Link>
          );
        })}
      </Marquee>
    </section>
  );
};

// Small animated illustrations for the feature cards
const QualityArt = () => (
  <div className="relative mx-auto grid h-64 w-64 place-items-center [perspective:700px]" aria-hidden="true">
    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-300/30 to-violet-400/20 blur-2xl" />
    <div className="relative h-44 w-44 motion-safe:animate-[coin_6s_ease-in-out_infinite] [transform-style:preserve-3d]">
      <div className="absolute inset-0 grid place-items-center rounded-full border-4 border-amber-300 bg-gradient-to-br from-amber-200 via-amber-400 to-orange-500 shadow-[inset_0_-6px_12px_rgb(0_0_0/0.2),0_20px_40px_-15px_rgb(245_158_11/0.8)] [backface-visibility:hidden]">
        <Star className="h-20 w-20 fill-white text-white drop-shadow" />
      </div>
    </div>
  </div>
);

const SupportArt = () => (
  <div className="flex flex-col gap-2" aria-hidden="true">
    <div className="max-w-[80%] self-start rounded-2xl rounded-bl-md bg-gray-100 px-3.5 py-2 text-sm text-gray-700">Ma pompe fait du bruit…</div>
    <div className="max-w-[80%] self-end rounded-2xl rounded-br-md px-3.5 py-2 text-sm" style={{ background: 'rgb(var(--brand))', color: 'rgb(var(--on-brand))' }}>
      Un technicien vous rappelle.
    </div>
    <div className="flex gap-1 self-start rounded-2xl bg-gray-100 px-3.5 py-3">
      {[0, 1, 2].map(i => (
        <span key={i} className="h-1.5 w-1.5 rounded-full bg-gray-400 motion-safe:animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
      ))}
    </div>
  </div>
);

const WarrantyArt = () => (
  <svg viewBox="0 0 120 120" className="mx-auto h-28 w-28" aria-hidden="true">
    <defs>
      <linearGradient id="shield" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="rgb(var(--success-400))" />
        <stop offset="1" stopColor="rgb(var(--aqua-600))" />
      </linearGradient>
    </defs>
    <path d="M60 10l38 14v30c0 26-17 45-38 56C39 99 22 80 22 54V24z" fill="url(#shield)" opacity="0.18" />
    <path d="M60 10l38 14v30c0 26-17 45-38 56C39 99 22 80 22 54V24z" fill="none" stroke="url(#shield)" strokeWidth="3" className="draw" />
    <path d="M44 58l11 11 22-24" fill="none" stroke="rgb(var(--success-t500))" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" className="draw draw--late" />
  </svg>
);

const DeliveryArt = () => (
  <svg viewBox="0 0 300 110" className="w-full" aria-hidden="true">
    <path id="route" d="M10 90 C 70 90, 70 30, 130 30 S 200 80, 250 50 S 290 20, 290 20" fill="none" stroke="rgb(var(--ink-300))" strokeWidth="2" strokeDasharray="4 6" />
    {[[10, 90], [130, 30], [250, 50], [290, 20]].map(([x, y], i) => (
      <g key={i}>
        <circle cx={x} cy={y} r="9" fill="rgb(var(--aqua-500) / 0.15)" className="motion-safe:animate-ping" style={{ transformOrigin: `${x}px ${y}px`, animationDelay: `${i * 0.4}s` }} />
        <circle cx={x} cy={y} r="4" fill="rgb(var(--aqua-600))" />
      </g>
    ))}
    <circle r="6" fill="rgb(var(--violet-500))">
      <animateMotion dur="4s" repeatCount="indefinite" rotate="auto">
        <mpath href="#route" />
      </animateMotion>
    </circle>
  </svg>
);

const Features = () => {
  const cards = [
    { title: 'Qualité Premium', text: 'Produits de haute qualité pour votre piscine.', art: <QualityArt />, className: 'md:row-span-2' },
    { title: 'Service Client', text: 'Support client disponible 7j/7.', art: <SupportArt /> },
    { title: 'Garantie', text: 'Garantie sur tous nos produits.', art: <WarrantyArt /> },
    { title: 'Livraison Rapide', text: 'Livraison dans toute la Tunisie, suivie étape par étape.', art: <DeliveryArt />, className: 'md:col-span-2' }
  ];

  return (
    <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
      <SectionHeader
        eyebrow="01 · Pourquoi STES"
        title="Pourquoi nous choisir ?"
        text="Nous sommes votre partenaire de confiance pour tous vos besoins en équipements de piscine."
      />
      <div className="mt-14 grid gap-4 md:grid-cols-3 md:grid-rows-2">
        {cards.map((card, i) => (
          <Reveal key={card.title} delay={i * 0.08} className={card.className}>
            <SpotlightCard className="panel flex h-full flex-col justify-between gap-8 overflow-hidden p-7">
              <div className="grid flex-1 place-items-center">{card.art}</div>
              <div>
                <h3 className="font-display text-2xl font-semibold text-gray-900">{card.title}</h3>
                <p className="mt-2 text-gray-600">{card.text}</p>
              </div>
            </SpotlightCard>
          </Reveal>
        ))}
      </div>
    </section>
  );
};

const Products = ({ products }) => {
  if (products?.length === 0) return null;
  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <SectionHeader
        eyebrow="02 · Catalogue"
        title="Produits Populaires"
        text="Découvrez nos produits les plus demandés par nos clients tunisiens."
        action={(
          <Link to="/shop" className="btn-ghost">
            Voir Tous les Produits <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        )}
      />
      <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {products === null
          ? [0, 1, 2].map(i => <div key={i} className="skeleton h-[26rem] rounded-[var(--radius)]" />)
          : products.map((product, index) => <ProductCard key={product._id} product={product} index={index} />)}
      </div>
    </section>
  );
};

const STEPS = [
  { icon: Compass, title: 'Conseil et Expertise', text: 'Nous étudions votre projet et vous recommandons les bons équipements.' },
  { icon: PackageCheck, title: 'Livraison', text: 'Commandez en ligne et suivez votre colis jusqu’à votre porte.' },
  { icon: Hammer, title: 'Installation', text: 'Nos techniciens installent et mettent en service votre équipement.' },
  { icon: RefreshCw, title: 'Maintenance et Réparation', text: 'Entretien régulier et dépannage pour une eau toujours claire.' }
];

// The four steps, with a line of light drawn as the section scrolls by
const Process = () => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 70%', 'end 60%'] });
  const line = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <section ref={ref} className="mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
      <SectionHeader
        eyebrow="03 · Services"
        title="De l'idée à la baignade"
        text="Un seul interlocuteur, du premier conseil à l'entretien de votre piscine."
        action={(
          <Link to="/services" className="btn-ghost">
            Nos services <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        )}
      />
      <div className="relative mt-16">
        <div className="absolute start-6 top-0 h-full w-px bg-gray-200 md:start-0 md:top-6 md:h-px md:w-full" aria-hidden="true">
          <motion.div
            className="h-full w-full origin-top md:origin-left"
            style={{ scaleY: line, scaleX: line, background: 'linear-gradient(90deg, rgb(var(--aqua-500)), rgb(var(--violet-500)))' }}
          />
        </div>
        <ol className="grid gap-10 md:grid-cols-4 md:gap-6">
          {STEPS.map(({ icon: Icon, title, text }, i) => (
            <Reveal as="li" key={title} delay={i * 0.1} className="relative flex gap-5 md:flex-col">
              <span className="relative z-10 grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-gray-200 bg-surface shadow-soft">
                <Icon className="h-5 w-5 text-blue-600" aria-hidden="true" />
              </span>
              <div>
                <p className="font-mono text-xs text-gray-400">0{i + 1}</p>
                <h3 className="mt-1 font-display text-xl font-semibold text-gray-900">{title}</h3>
                <p className="mt-2 text-gray-600">{text}</p>
              </div>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
};

// Closing call to action: a deep-water panel with glowing rings
const Closing = ({ whatsapp }) => (
  <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
    <Reveal>
      <div className="dark relative isolate overflow-hidden rounded-[2.5rem] px-6 py-20 text-center sm:px-16 sm:py-28" style={{ backgroundColor: 'rgb(var(--deep))' }}>
        <div className="pointer-events-none absolute inset-0 -z-10 [perspective:900px]" aria-hidden="true">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="absolute left-1/2 top-1/2 rounded-full border motion-safe:animate-[tilt-spin_var(--d)_linear_infinite]"
              style={{
                width: `${36 + i * 18}rem`,
                height: `${36 + i * 18}rem`,
                marginLeft: `-${18 + i * 9}rem`,
                marginTop: `-${18 + i * 9}rem`,
                borderColor: i % 2 ? 'rgb(167 139 250 / 0.35)' : 'rgb(45 212 238 / 0.35)',
                boxShadow: `0 0 40px ${i % 2 ? 'rgb(167 139 250 / 0.15)' : 'rgb(45 212 238 / 0.15)'}`,
                '--d': `${24 + i * 8}s`,
                '--tilt': `${62 + i * 6}deg`
              }}
            />
          ))}
          <div className="absolute inset-0" style={{ background: 'radial-gradient(50% 60% at 50% 50%, rgb(45 212 238 / 0.18), transparent 70%)' }} />
        </div>
        <p className="eyebrow">04 · Contact</p>
        <h2 className="mx-auto mt-4 max-w-3xl font-display text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-6xl">
          <SplitWords text="Prêt à transformer votre piscine ?" inView highlightLast={1} />
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-lg text-white/70">
          Contactez-nous dès aujourd&apos;hui pour un devis gratuit et personnalisé.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Magnetic>
            <Link to="/contact" className="btn-brand px-7 py-4 text-base">
              Nous Contacter <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Link>
          </Magnetic>
          {whatsapp && (
            <Magnetic strength={0.15}>
              <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="btn-ghost px-7 py-4 text-base">
                <MessageCircle className="h-5 w-5 text-green-400" aria-hidden="true" /> WhatsApp
              </a>
            </Magnetic>
          )}
        </div>
      </div>
    </Reveal>
  </section>
);

const Home = () => {
  const whatsapp = whatsappLink(useShopSettings().contact.whatsapp);
  // The products marked "featured" in Admin → Products, topped up with the
  // newest ones; null while loading
  const [popularProducts, setPopularProducts] = useState(null);

  useEffect(() => {
    let cancelled = false;
    pickProducts({ limit: 3 })
      .then(products => { if (!cancelled) setPopularProducts(products); })
      .catch(error => {
        console.error('Error loading popular products:', error);
        if (!cancelled) setPopularProducts([]);
      });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="overflow-x-clip">
      <Hero featured={popularProducts?.[0]} />
      <CategoryBand />
      <Features />
      <Products products={popularProducts} />
      <Process />
      <Closing whatsapp={whatsapp} />
    </div>
  );
};

export default Home;
