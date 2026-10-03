import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useLanguage } from '../context/LanguageContext';
import { useShopSettings, whatsappLink, phoneLink } from '../context/shopSettings';
import { Phone, Mail, MapPin, MessageCircle, ArrowRight, Check, Loader2, Facebook, Instagram, Music2 } from 'lucide-react';
import { LogoMark } from './brand/Logo';
import { track } from '../utils/analytics';
import { openCookieChoice } from '../utils/cookieChoice';

// Waves at the top of the footer, where the page meets the deep water
const Waves = () => (
  <div className="pointer-events-none absolute inset-x-0 bottom-full h-16 overflow-hidden sm:h-24" aria-hidden="true">
    {[
      { fill: 'rgb(var(--aqua-400) / 0.35)', duration: '14s', offset: 0 },
      { fill: 'rgb(var(--aqua-700) / 0.6)', duration: '10s', offset: 6 },
      { fill: 'rgb(var(--deep))', duration: '7s', offset: 12 }
    ].map(({ fill, duration, offset }) => (
      <svg
        key={duration}
        viewBox="0 0 1440 100"
        preserveAspectRatio="none"
        className="absolute bottom-0 h-full w-[200%] motion-safe:animate-[wave_var(--d)_linear_infinite]"
        style={{ '--d': duration }}
      >
        <path
          d={`M0 ${50 + offset}c120 0 240-${30 - offset} 360-${30 - offset}s240 ${30 - offset} 360 ${30 - offset} 240-${30 - offset} 360-${30 - offset} 240 ${30 - offset} 360 ${30 - offset}v${50 - offset}H0z`}
          fill={fill}
        />
        <path
          transform="translate(1440 0)"
          d={`M0 ${50 + offset}c120 0 240-${30 - offset} 360-${30 - offset}s240 ${30 - offset} 360 ${30 - offset} 240-${30 - offset} 360-${30 - offset} 240 ${30 - offset} 360 ${30 - offset}v${50 - offset}H0z`}
          fill={fill}
        />
      </svg>
    ))}
  </div>
);

const Newsletter = () => {
  const [email, setEmail] = useState('');
  const [state, setState] = useState({ status: 'idle', message: '' });

  const subscribe = async (event) => {
    event.preventDefault();
    setState({ status: 'sending', message: '' });
    try {
      const response = await axios.post('/api/forms/newsletter', { email });
      setState({ status: 'done', message: response.data.message || 'Inscription réussie !' });
      setEmail('');
      track('generate_lead', { form: 'newsletter' });
    } catch (error) {
      setState({
        status: 'error',
        message: error.response?.data?.message || error.response?.data?.errors?.[0]?.msg || 'Inscription impossible pour le moment.'
      });
    }
  };

  return (
    <form onSubmit={subscribe} className="w-full max-w-md" noValidate>
      <label htmlFor="newsletter-email" className="eyebrow !text-cyan-300">Newsletter</label>
      <div className="mt-3 flex items-center gap-2 rounded-full border border-white/15 bg-white/5 p-1.5 ps-5 backdrop-blur focus-within:border-cyan-400/70">
        <input
          id="newsletter-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="votre@email.com"
          className="min-w-0 flex-1 border-0 !bg-transparent p-0 text-white placeholder:text-white/40 focus:ring-0"
        />
        <button
          type="submit"
          disabled={state.status === 'sending' || !email}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand text-on-brand shadow-glow transition-transform duration-200 hover:scale-105 disabled:opacity-50"
          aria-label="S'inscrire à la newsletter"
        >
          {state.status === 'sending' ? <Loader2 className="h-4 w-4 animate-spin" /> : state.status === 'done' ? <Check className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
        </button>
      </div>
      <p role="status" className={`mt-2 min-h-5 text-sm ${state.status === 'error' ? 'text-red-300' : 'text-cyan-200'}`}>
        {state.message}
      </p>
    </form>
  );
};

const Footer = () => {
  const { t, language } = useLanguage();
  const [shopCategories, setShopCategories] = useState({});
  const { contact, marketing = {} } = useShopSettings();
  const whatsapp = whatsappLink(contact.whatsapp);
  // The shop's pages on social networks, from Admin → Settings → Marketing
  const socials = [
    { href: marketing.facebookUrl, label: 'Facebook', icon: Facebook },
    { href: marketing.instagramUrl, label: 'Instagram', icon: Instagram },
    { href: marketing.tiktokUrl, label: 'TikTok', icon: Music2 }
  ].filter(social => social.href);
  const measuring = Boolean(marketing.gaMeasurementId || marketing.metaPixelId);

  // The first categories of the shop, as ordered in Admin → Categories
  useEffect(() => {
    axios.get('/api/products/categories')
      .then(response => setShopCategories(response.data.categories || {}))
      .catch(() => setShopCategories({}));
  }, []);

  const quickLinks = [
    { name: t('home'), href: '/' },
    { name: t('shop'), href: '/shop' },
    { name: 'Suivi Commande', href: '/track-order' },
    { name: t('services'), href: '/services' },
    { name: 'Construire ma piscine', href: '/construire' },
    { name: 'Calendrier d’entretien', href: '/entretien' },
    { name: t('about'), href: '/about' },
    { name: t('contact'), href: '/contact' }
  ];

  const localName = (category) =>
    (language === 'en' && category.nameEn) || (language === 'ar' && category.nameAr) || category.name;
  const categories = Object.entries(shopCategories).slice(0, 5).map(([slug, category]) => ({
    name: localName(category),
    href: `/shop?category=${encodeURIComponent(slug)}`
  }));

  const linkClass = 'text-sm text-white/60 transition-colors duration-200 hover:text-white';

  return (
    <footer className="dark relative mt-24 text-white sm:mt-32" style={{ backgroundColor: 'rgb(var(--deep))' }}>
      <Waves />
      {/* Light rays in the deep water */}
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden="true"
        style={{ background: 'radial-gradient(60% 50% at 20% 0%, rgb(34 211 238 / 0.14), transparent 70%), radial-gradient(50% 45% at 85% 30%, rgb(139 92 246 / 0.12), transparent 70%)' }}
      />

      <div className="relative mx-auto max-w-7xl px-4 pb-8 pt-12 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-10 border-b border-white/10 pb-12 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-md">
            <div className="flex items-center gap-3">
              <LogoMark className="h-11 w-11" animated />
              <span className="font-display text-2xl font-bold">STES<span className="text-cyan-300">.tn</span></span>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-white/60">{t('aboutDesc')}</p>
            {socials.length > 0 && (
              <ul className="mt-5 flex gap-3" aria-label="STES sur les réseaux sociaux">
                {socials.map(({ href, label, icon: Icon }) => (
                  <li key={label}>
                    <a href={href} target="_blank" rel="noopener noreferrer" aria-label={`STES sur ${label}`} className="grid h-11 w-11 place-items-center rounded-full border border-white/15 text-white/70 transition-colors hover:border-cyan-400/60 hover:text-white">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <Newsletter />
        </div>

        <div className="grid grid-cols-2 gap-10 py-12 md:grid-cols-4">
          <div>
            <h3 className="eyebrow !text-white/40">Navigation</h3>
            <ul className="mt-4 space-y-2.5">
              {quickLinks.map((link) => (
                <li key={link.href}><Link to={link.href} className={linkClass}>{link.name}</Link></li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="eyebrow !text-white/40">{t('products')}</h3>
            <ul className="mt-4 space-y-2.5">
              {categories.map((category) => (
                <li key={category.href}><Link to={category.href} className={linkClass}>{category.name}</Link></li>
              ))}
            </ul>
          </div>

          <div className="col-span-2">
            <h3 className="eyebrow !text-white/40">{t('contactInfo')}</h3>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              <li>
                <a href={phoneLink(contact.phone)} className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 transition-colors hover:border-cyan-400/50">
                  <Phone className="h-5 w-5 text-cyan-300" aria-hidden="true" />
                  <span className="text-sm text-white/80 group-hover:text-white">{contact.phone}</span>
                </a>
              </li>
              <li>
                <a href={`mailto:${contact.email}`} className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 transition-colors hover:border-cyan-400/50">
                  <Mail className="h-5 w-5 text-cyan-300" aria-hidden="true" />
                  <span className="truncate text-sm text-white/80 group-hover:text-white">{contact.email}</span>
                </a>
              </li>
              <li className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                <MapPin className="h-5 w-5 text-cyan-300" aria-hidden="true" />
                <span className="text-sm text-white/80">{contact.address}</span>
              </li>
              {whatsapp && (
                <li>
                  <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 transition-colors hover:border-emerald-400/50">
                    <MessageCircle className="h-5 w-5 text-emerald-300" aria-hidden="true" />
                    <span className="text-sm text-white/80 group-hover:text-white">{t('whatsapp')} : {contact.whatsapp}</span>
                  </a>
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* The name, in outline, filling with water light on hover */}
        <div
          className="group relative select-none overflow-hidden font-display font-bold leading-none tracking-tighter"
          aria-hidden="true"
          style={{ fontSize: 'clamp(4rem, 19vw, 16rem)' }}
        >
          <span className="block text-transparent [-webkit-text-stroke:1px_rgb(255_255_255/0.14)]">STES.tn</span>
          <span
            className="absolute inset-0 bg-clip-text text-transparent opacity-0 transition-opacity duration-700 group-hover:opacity-100"
            style={{ backgroundImage: 'linear-gradient(90deg, rgb(103 232 249), rgb(56 189 248), rgb(167 139 250))', WebkitMaskImage: 'linear-gradient(to bottom, black 30%, transparent 95%)', maskImage: 'linear-gradient(to bottom, black 30%, transparent 95%)' }}
          >
            STES.tn
          </span>
        </div>

        <div className="mt-6 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs text-white/40 sm:flex-row">
          <p>
            © {new Date().getFullYear()} STES.tn. Tous droits réservés.
            {measuring && <> · <button type="button" onClick={openCookieChoice} className="underline underline-offset-2 hover:text-white">Cookies</button></>}
          </p>
          <p className="font-mono">Fait en Tunisie · Livraison dans les 24 gouvernorats</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
