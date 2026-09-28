const mongoose = require('mongoose');
const Product = require('../models/Product');
const Category = require('../models/Category');
const { getSettings } = require('./settingsService');

// What search engines and link previews (WhatsApp, Facebook...) see for
// each page: its title, description, picture and structured data. The shop
// sets the same things in the browser (frontend/src/utils/pageMeta.js):
// keep the two in step.

const SITE_NAME = 'STES.tn';
const DEFAULT_DESCRIPTION = 'STES.tn : équipements, produits et installation de piscines en Tunisie. Livraison dans les 24 gouvernorats.';
// 1200 × 630 picture shown when a page without its own photo is shared
const DEFAULT_IMAGE = '/og-image.png';

// Public pages with a fixed title
const PAGES = {
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
  '/track-order': {
    title: 'Suivi de commande',
    description: 'Suivez votre commande STES.tn en temps réel avec votre code de suivi.'
  }
};

// Pages that only make sense for the visitor using them: kept out of search
// results (robots.txt and a "noindex" tag). Matched by prefix.
const PRIVATE_PAGES = [
  ['/cart', 'Panier'],
  ['/checkout', 'Commande'],
  ['/account', 'Mon compte'],
  ['/wishlist', 'Mes favoris'],
  ['/reset-password', 'Nouveau mot de passe'],
  ['/verify-email', 'Confirmation de l’email'],
  ['/payment/', 'Paiement'],
  ['/admin', 'Administration']
];

const NOT_FOUND = { title: 'Page introuvable', noindex: true, status: 404 };

// "/admin" covers "/admin" and "/admin/orders"; "/payment/" everything under it
const underPrefix = (pathname, prefix) => (prefix.endsWith('/')
  ? pathname.startsWith(prefix)
  : pathname === prefix || pathname.startsWith(`${prefix}/`));

// "Filtre à sable" → "Filtre à sable | STES.tn"; the home title already has the name
const fullTitle = (title) => (!title ? PAGES['/'].title : title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`);

// Up to 160 characters, cut between words
const summary = (text, max = 160) => {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const space = cut.lastIndexOf(' ');
  return `${(space > max / 2 ? cut.slice(0, space) : cut).replace(/[\s,.;:–-]+$/, '')}…`;
};

// The shop's public address, e.g. "https://stes.tn". FRONTEND_URL is also
// used for links in emails; without it, the address the request came to.
const siteUrl = (req) => String(process.env.FRONTEND_URL || `${req.protocol}://${req.get('host')}`).replace(/\/+$/, '');

// Photos stored by the shop have paths ("/api/uploads/..."); previews need
// full addresses. Placeholders are not worth sharing: the shop's picture is used.
const absoluteImage = (image, site) => {
  if (!image || String(image).startsWith('/api/placeholder')) return `${site}${DEFAULT_IMAGE}`;
  return /^https?:\/\//.test(image) ? image : `${site}${image.startsWith('/') ? '' : '/'}${image}`;
};

const brandName = (product) => (typeof product.brand === 'object' ? product.brand?.name : product.brand) || '';

const isAvailable = (product) => product.inStock !== false && (product.stockQuantity ?? 1) > 0;

// schema.org data for a product page, with its place in the shop
const productJsonLd = (product, site) => {
  const url = `${site}/product/${product._id}`;
  const brand = brandName(product);
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
const storeJsonLd = (contact, site) => ({
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

const productMeta = (product, site) => ({
  title: product.seoTitle || product.name,
  description: summary(product.seoDescription || product.description) || DEFAULT_DESCRIPTION,
  path: `/product/${product._id}`,
  image: absoluteImage(product.image, site),
  type: 'product',
  price: product.price,
  jsonLd: productJsonLd(product, site)
});

// Everything above for one address of the shop
const pageMeta = async (pathname, query, site) => {
  const productMatch = pathname.match(/^\/product\/([^/]+)\/?$/);
  if (productMatch) {
    if (!mongoose.isValidObjectId(productMatch[1])) return { ...NOT_FOUND, title: 'Produit introuvable' };
    const product = await Product.findById(productMatch[1]).select('-reviews').lean();
    if (!product) return { ...NOT_FOUND, title: 'Produit introuvable' };
    const category = await Category.findOne({ slug: product.category }).select('name').lean();
    return productMeta({ ...product, categoryName: category?.name || product.category }, site);
  }

  if (pathname === '/shop' || pathname === '/boutique') {
    // Searches and filter combinations are not pages of their own
    if (query.search) return { ...PAGES['/shop'], title: `Résultats pour « ${summary(query.search, 60)} »`, noindex: true };
    if (typeof query.category === 'string' && query.category) {
      const category = await Category.findOne({ slug: query.category.toLowerCase(), isActive: true }).lean();
      if (category) {
        return {
          title: category.seoTitle || category.name,
          description: summary(category.seoDescription || category.description) || PAGES['/shop'].description,
          path: `/shop?category=${encodeURIComponent(category.slug)}`,
          image: category.image ? absoluteImage(category.image, site) : undefined
        };
      }
    }
    return { ...PAGES['/shop'], path: '/shop' };
  }

  const clean = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  if (PAGES[clean]) {
    const meta = { ...PAGES[clean], path: clean };
    if (clean === '/') meta.jsonLd = storeJsonLd((await getSettings()).contact, site);
    return meta;
  }
  const privatePage = PRIVATE_PAGES.find(([prefix]) => underPrefix(clean, prefix));
  if (privatePage) return { title: privatePage[1], noindex: true };
  return NOT_FOUND;
};

const escapeHtml = (text) => String(text)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

// JSON inside <script>: "</script>" in a product name must not end the tag
const scriptJson = (data) => JSON.stringify(data).replace(/</g, '\\u003c');

// The <head> tags for a page
const headTags = (meta, site) => {
  const title = fullTitle(meta.title);
  const description = meta.description || DEFAULT_DESCRIPTION;
  const image = meta.image || `${site}${DEFAULT_IMAGE}`;
  const url = meta.path ? `${site}${meta.path}` : null;
  const tags = [
    `<title>${escapeHtml(title)}</title>`,
    `<meta name="description" content="${escapeHtml(description)}" />`
  ];
  if (meta.noindex) tags.push('<meta name="robots" content="noindex" />');
  if (url && !meta.noindex) tags.push(`<link rel="canonical" href="${escapeHtml(url)}" />`);
  const og = [
    ['og:site_name', SITE_NAME],
    ['og:locale', 'fr_TN'],
    ['og:type', meta.type || 'website'],
    ['og:title', meta.title || SITE_NAME],
    ['og:description', description],
    ['og:image', image],
    ...(url ? [['og:url', url]] : []),
    ...(meta.price !== undefined ? [['product:price:amount', Number(meta.price).toFixed(3)], ['product:price:currency', 'TND']] : [])
  ];
  for (const [property, content] of og) tags.push(`<meta property="${property}" content="${escapeHtml(content)}" />`);
  tags.push('<meta name="twitter:card" content="summary_large_image" />');
  if (meta.jsonLd) tags.push(`<script type="application/ld+json" id="page-data">${scriptJson(meta.jsonLd)}</script>`);
  return tags;
};

// The built shop page (index.html) with this page's tags in place of the
// generic ones
const renderPage = (template, meta, site) => template
  .replace(/\s*<title>[\s\S]*?<\/title>/, '')
  .replace(/\s*<meta (?:name|property)="(?:description|robots|og:[^"]+|twitter:[^"]+|product:[^"]+)"[^>]*>/g, '')
  .replace(/\s*<link rel="canonical"[^>]*>/g, '')
  .replace(/\s*<script type="application\/ld\+json"[\s\S]*?<\/script>/g, '')
  .replace(/\n?[ \t]*<\/head>/, `\n    ${headTags(meta, site).join('\n    ')}\n  </head>`);

const xmlEscape = (text) => escapeHtml(text).replace(/'/g, '&apos;');

const day = (date) => (date ? new Date(date).toISOString().slice(0, 10) : null);

// sitemap.xml: every page search engines should know about, with product photos
const buildSitemap = async (site) => {
  const [products, categories] = await Promise.all([
    Product.find({}).select('image updatedAt').sort({ updatedAt: -1 }).lean(),
    Category.find({ isActive: true }).select('slug updatedAt').sort({ sortOrder: 1, name: 1 }).lean()
  ]);
  const newest = day(products[0]?.updatedAt);
  const entries = [
    ...Object.keys(PAGES).map(path => ({ loc: `${site}${path}`, lastmod: path === '/' || path === '/shop' ? newest : null })),
    ...categories.map(category => ({ loc: `${site}/shop?category=${encodeURIComponent(category.slug)}`, lastmod: day(category.updatedAt) })),
    ...products.map(product => ({
      loc: `${site}/product/${product._id}`,
      lastmod: day(product.updatedAt),
      image: product.image && !String(product.image).startsWith('/api/placeholder') ? absoluteImage(product.image, site) : null
    }))
  ];
  const urls = entries.map(({ loc, lastmod, image }) => [
    '  <url>',
    `    <loc>${xmlEscape(loc)}</loc>`,
    ...(lastmod ? [`    <lastmod>${lastmod}</lastmod>`] : []),
    ...(image ? [`    <image:image><image:loc>${xmlEscape(image)}</image:loc></image:image>`] : []),
    '  </url>'
  ].join('\n'));
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
    ...urls,
    '</urlset>',
    ''
  ].join('\n');
};

const robotsTxt = (site) => [
  'User-agent: *',
  ...PRIVATE_PAGES.map(([prefix]) => `Disallow: ${prefix}`),
  'Disallow: /api/',
  // Product photos may appear in image search
  'Allow: /api/uploads/',
  '',
  `Sitemap: ${site}/sitemap.xml`,
  ''
].join('\n');

module.exports = {
  SITE_NAME,
  pageMeta,
  renderPage,
  headTags,
  buildSitemap,
  robotsTxt,
  siteUrl,
  summary,
  productJsonLd
};
