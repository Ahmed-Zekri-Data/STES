import { useEffect } from 'react';

// Each page's title, description, preview picture and structured data, for
// search engines and link previews. When the server hosts the shop it sends
// the same tags with the page (backend/services/seoService.js): keep the two
// in step. Here they follow the visitor from page to page.

export const SITE_NAME = 'STES.tn';
export const DEFAULT_DESCRIPTION = 'STES.tn : équipements, produits et installation de piscines en Tunisie. Livraison dans les 24 gouvernorats.';
const DEFAULT_IMAGE = '/og-image.png';

// Public pages with a fixed title
export const PAGES = {
  '/': {
    title: 'STES.tn – Équipements et installation de piscines en Tunisie',
    description: DEFAULT_DESCRIPTION
  },
  '/shop': {
    title: 'Boutique',
    description: 'Pompes, filtres, produits d’entretien et accessoires de piscine. Paiement à la livraison, livraison dans toute la Tunisie.'
  },
  '/services': {
    title: 'Installation et entretien de piscines',
    description: 'Installation, rénovation et entretien de piscines partout en Tunisie. Demandez un devis gratuit à nos techniciens.'
  },
  '/about': {
    title: 'À propos',
    description: 'STES.tn, spécialiste tunisien des équipements de piscine : notre histoire, nos valeurs et notre équipe.'
  },
  '/contact': {
    title: 'Contact',
    description: 'Une question, un projet de piscine ? Contactez STES.tn par téléphone, WhatsApp ou email. Réponse sous 24h.'
  },
  '/construire': {
    title: 'Construire ma piscine',
    description: 'Dessinez votre piscine sur votre terrain, placez les équipements, voyez-la dans votre jardin et obtenez une estimation. Devis gratuit.'
  },
  '/entretien': {
    title: 'Calendrier d’entretien de piscine',
    description: 'Que faire pour votre piscine, et quand : remise en route, analyses, canicule, hivernage. Recevez gratuitement nos rappels par email ou WhatsApp.'
  },
  '/track-order': {
    title: 'Suivi de commande',
    description: 'Suivez votre commande STES.tn en temps réel avec votre code de suivi.'
  }
};

// Pages that only make sense for the visitor using them: kept out of search results
const PRIVATE_PAGES = [
  ['/cart', 'Panier'],
  ['/checkout', 'Commande'],
  ['/account', 'Mon compte'],
  ['/wishlist', 'Mes favoris'],
  ['/reset-password', 'Nouveau mot de passe'],
  ['/verify-email', 'Confirmation de l’email'],
  ['/entretien/mes-rappels', 'Mes rappels d’entretien'],
  ['/payment/', 'Paiement'],
  ['/admin', 'Administration']
];

export const NOT_FOUND = { title: 'Page introuvable', noindex: true };

const underPrefix = (pathname, prefix) => (prefix.endsWith('/')
  ? pathname.startsWith(prefix)
  : pathname === prefix || pathname.startsWith(`${prefix}/`));

// Pages whose tags depend on what they show set them themselves
export const setsOwnMeta = (pathname) => pathname === '/shop' || pathname.startsWith('/product/');

// The tags of a page with fixed ones
export const metaForPath = (pathname) => {
  const clean = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  if (PAGES[clean]) return { ...PAGES[clean], path: clean };
  const privatePage = PRIVATE_PAGES.find(([prefix]) => underPrefix(clean, prefix));
  return privatePage ? { title: privatePage[1], noindex: true } : NOT_FOUND;
};

export const fullTitle = (title) => (!title ? PAGES['/'].title : title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`);

// Up to 160 characters, cut between words
export const summary = (text, max = 160) => {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const space = cut.lastIndexOf(' ');
  return `${(space > max / 2 ? cut.slice(0, space) : cut).replace(/[\s,.;:–-]+$/, '')}…`;
};

// Previews need full addresses; placeholders are replaced by the shop's picture
const absoluteImage = (image, site) => {
  if (!image || String(image).startsWith('/api/placeholder')) return `${site}${DEFAULT_IMAGE}`;
  return /^https?:\/\//.test(image) ? image : `${site}${image.startsWith('/') ? '' : '/'}${image}`;
};

const isAvailable = (product) => product.inStock !== false && (product.stockQuantity ?? 1) > 0;

// schema.org data for a product page, with its place in the shop
export const productJsonLd = (product, site) => {
  const url = `${site}/product/${product._id}`;
  const brand = (typeof product.brand === 'object' ? product.brand?.name : product.brand) || '';
  const rating = product.ratingStats || {};
  const categoryName = product.categoryName || product.category;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Product',
        name: product.name,
        description: summary(product.description, 5000),
        image: [absoluteImage(product.image, site)],
        sku: product.sku || String(product._id),
        ...(product.model && { mpn: product.model }),
        ...(brand && { brand: { '@type': 'Brand', name: brand } }),
        category: categoryName,
        offers: {
          '@type': 'Offer',
          url,
          priceCurrency: 'TND',
          price: Number(Number(product.price).toFixed(3)),
          availability: isAvailable(product) ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
          itemCondition: 'https://schema.org/NewCondition',
          seller: { '@type': 'Organization', name: SITE_NAME }
        },
        ...(rating.totalReviews > 0 && {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: Math.round(rating.averageRating * 10) / 10,
            reviewCount: rating.totalReviews
          }
        })
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          ['Accueil', `${site}/`],
          ['Boutique', `${site}/shop`],
          [categoryName, `${site}/shop?category=${encodeURIComponent(product.category)}`],
          [product.name, url]
        ].map(([name, item], index) => ({ '@type': 'ListItem', position: index + 1, name, item }))
      }
    ]
  };
};

// schema.org data for the home page: the shop and how to reach it
export const storeJsonLd = (contact, site) => ({
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Store',
      '@id': `${site}/#store`,
      name: SITE_NAME,
      description: DEFAULT_DESCRIPTION,
      url: `${site}/`,
      logo: `${site}/logo.png`,
      image: `${site}${DEFAULT_IMAGE}`,
      ...(contact.phone && { telephone: contact.phone }),
      ...(contact.email && { email: contact.email }),
      ...(contact.address && {
        address: { '@type': 'PostalAddress', streetAddress: contact.address, addressCountry: 'TN' }
      }),
      areaServed: { '@type': 'Country', name: 'Tunisie' },
      currenciesAccepted: 'TND'
    },
    { '@type': 'WebSite', name: SITE_NAME, url: `${site}/`, inLanguage: 'fr-TN' }
  ]
});

export const productMeta = (product, site) => ({
  title: product.seoTitle || product.name,
  description: summary(product.seoDescription || product.description) || DEFAULT_DESCRIPTION,
  path: `/product/${product._id}`,
  image: absoluteImage(product.image, site),
  type: 'product',
  price: product.price,
  jsonLd: productJsonLd(product, site)
});

// Creates, updates or (content null) removes one <head> tag
const setTag = (doc, tag, key, value, attribute, content) => {
  let element = doc.head.querySelector(`${tag}[${key}="${value}"]`);
  if (content == null) {
    element?.remove();
    return;
  }
  if (!element) {
    element = doc.createElement(tag);
    element.setAttribute(key, value);
    doc.head.appendChild(element);
  }
  element.setAttribute(attribute, content);
};

// Puts a page's tags in the document
export const applyPageMeta = (meta, doc = document, site = window.location.origin) => {
  const title = fullTitle(meta.title);
  const description = meta.description || DEFAULT_DESCRIPTION;
  const url = meta.path && !meta.noindex ? `${site}${meta.path}` : null;
  const hasPrice = meta.price !== undefined && meta.price !== null;
  doc.title = title;
  setTag(doc, 'meta', 'name', 'description', 'content', description);
  setTag(doc, 'meta', 'name', 'robots', 'content', meta.noindex ? 'noindex' : null);
  setTag(doc, 'link', 'rel', 'canonical', 'href', url);
  const properties = {
    'og:type': meta.type || 'website',
    'og:title': meta.title || SITE_NAME,
    'og:description': description,
    'og:image': meta.image || `${site}${DEFAULT_IMAGE}`,
    'og:url': meta.path ? `${site}${meta.path}` : null,
    'product:price:amount': hasPrice ? Number(meta.price).toFixed(3) : null,
    'product:price:currency': hasPrice ? 'TND' : null
  };
  for (const [property, content] of Object.entries(properties)) {
    setTag(doc, 'meta', 'property', property, 'content', content);
  }

  let data = doc.getElementById('page-data');
  if (!meta.jsonLd) {
    data?.remove();
  } else {
    if (!data) {
      data = doc.createElement('script');
      data.type = 'application/ld+json';
      data.id = 'page-data';
      doc.head.appendChild(data);
    }
    data.textContent = JSON.stringify(meta.jsonLd);
  }
};

// Sets the page's tags while it is shown; null while it does not know them yet
export const usePageMeta = (meta) => {
  const key = meta ? JSON.stringify(meta) : null;
  useEffect(() => {
    if (key) applyPageMeta(JSON.parse(key));
  }, [key]);
};
