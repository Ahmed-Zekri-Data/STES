const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const request = require('supertest');
const { startDatabase, stopDatabase, clearDatabase, createApp, createProduct, createCategory } = require('./helpers');

// A built shop like frontend/dist: generic tags, the theme script, one asset
const THEME_SCRIPT = '\n      document.documentElement.classList.add("dark");\n    ';
const TEMPLATE = `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="description" content="Generic description" />
    <meta property="og:image" content="/og-image.png" />
    <meta name="twitter:card" content="summary_large_image" />
    <title>Generic title</title>
    <script>${THEME_SCRIPT}</script>
    <script type="module" crossorigin src="/assets/index-abc123.js"></script>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
`;

const jsonLd = (html) => JSON.parse(html.match(/<script type="application\/ld\+json" id="page-data">([\s\S]*?)<\/script>/)[1]);
const count = (html, text) => html.split(text).length - 1;

describe('search engines and link previews', () => {
  let app;
  let distDir;
  const savedUrl = process.env.FRONTEND_URL;

  before(async () => {
    await startDatabase();
    process.env.FRONTEND_URL = 'https://stes.tn/';
    distDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stes-dist-'));
    fs.mkdirSync(path.join(distDir, 'assets'));
    fs.writeFileSync(path.join(distDir, 'index.html'), TEMPLATE);
    fs.writeFileSync(path.join(distDir, 'assets', 'index-abc123.js'), 'console.log("shop");');
    fs.writeFileSync(path.join(distDir, 'favicon.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>');
    app = createApp({ frontendDir: distDir });
  });
  after(async () => {
    process.env.FRONTEND_URL = savedUrl;
    fs.rmSync(distDir, { recursive: true, force: true });
    await stopDatabase();
  });
  beforeEach(clearDatabase);

  describe('robots.txt and sitemap.xml', () => {
    it('keeps private pages out of search engines and points to the sitemap', async () => {
      const res = await request(app).get('/robots.txt').expect(200).expect('Content-Type', /text\/plain/);
      for (const line of ['Disallow: /admin', 'Disallow: /checkout', 'Disallow: /account', 'Disallow: /api/', 'Allow: /api/uploads/']) {
        assert.ok(res.text.includes(line), line);
      }
      assert.match(res.text, /^Sitemap: https:\/\/stes\.tn\/sitemap\.xml$/m);
    });

    it('lists the public pages, active categories and every product with its photo', async () => {
      await createCategory();
      await createCategory({ name: 'Ancienne', nameEn: 'Old', slug: 'old', isActive: false });
      const photo = await createProduct({ name: 'Pompe', image: '/api/uploads/products/pompe.webp' });
      const soldOut = await createProduct({ name: 'Filtre', stockQuantity: 0 });

      const res = await request(app).get('/sitemap.xml').expect(200).expect('Content-Type', /xml/);
      const locs = [...res.text.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, loc]) => loc);
      for (const page of ['/', '/shop', '/services', '/about', '/contact', '/track-order', '/shop?category=filters',
        `/product/${photo._id}`, `/product/${soldOut._id}`]) {
        assert.ok(locs.includes(`https://stes.tn${page}`), page);
      }
      assert.ok(!locs.some(loc => loc.includes('category=old')), 'inactive category listed');
      assert.ok(!locs.some(loc => /admin|checkout|cart/.test(loc)), 'private page listed');
      assert.match(res.text, /<image:loc>https:\/\/stes\.tn\/api\/uploads\/products\/pompe\.webp<\/image:loc>/);
      // Placeholders are not photos
      assert.equal(count(res.text, '<image:image>'), 1);
      assert.match(res.text, /<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/);
    });
  });

  describe('shop pages', () => {
    it('sends a product page with its own title, description, picture and product data', async () => {
      await createCategory();
      const product = await createProduct({
        name: 'Pompe Hayward 1CV',
        description: 'Pompe de filtration silencieuse pour piscines jusqu’à 60 m³.',
        price: 649.5,
        image: '/api/uploads/products/pompe.webp',
        ratingStats: { averageRating: 4.333, totalReviews: 3 }
      });

      const res = await request(app).get(`/product/${product._id}`).expect(200).expect('Content-Type', /html/);
      const html = res.text;
      assert.match(html, /<title>Pompe Hayward 1CV \| STES\.tn<\/title>/);
      assert.match(html, /<meta name="description" content="Pompe de filtration silencieuse pour piscines jusqu’à 60 m³\." \/>/);
      assert.match(html, new RegExp(`<link rel="canonical" href="https://stes.tn/product/${product._id}" />`));
      assert.match(html, /<meta property="og:image" content="https:\/\/stes\.tn\/api\/uploads\/products\/pompe\.webp" \/>/);
      assert.match(html, /<meta property="og:type" content="product" \/>/);
      assert.match(html, /<meta property="product:price:amount" content="649\.500" \/>/);
      // The template's generic tags are replaced, not repeated
      assert.equal(count(html, '<title>'), 1);
      assert.equal(count(html, 'name="description"'), 1);
      assert.equal(count(html, 'property="og:image"'), 1);
      assert.equal(count(html, 'name="twitter:card"'), 1);
      assert.ok(!html.includes('noindex'));

      const [data, breadcrumb] = jsonLd(html)['@graph'];
      assert.equal(data['@type'], 'Product');
      assert.equal(data.offers.price, 649.5);
      assert.equal(data.offers.priceCurrency, 'TND');
      assert.equal(data.offers.availability, 'https://schema.org/InStock');
      assert.deepEqual(data.aggregateRating, { '@type': 'AggregateRating', ratingValue: 4.3, reviewCount: 3 });
      assert.deepEqual(breadcrumb.itemListElement.map(item => item.name), ['Accueil', 'Boutique', 'Filtration', 'Pompe Hayward 1CV']);
    });

    it('says when a product is sold out, and uses the shop picture when it has no photo', async () => {
      const product = await createProduct({ stockQuantity: 0 });
      const html = (await request(app).get(`/product/${product._id}`).expect(200)).text;
      assert.equal(jsonLd(html)['@graph'][0].offers.availability, 'https://schema.org/OutOfStock');
      assert.match(html, /<meta property="og:image" content="https:\/\/stes\.tn\/og-image\.png" \/>/);
      assert.ok(!('aggregateRating' in jsonLd(html)['@graph'][0]));
    });

    it('cannot be broken out of by a product name', async () => {
      const product = await createProduct({ name: 'Pompe "pro" </script><script>alert(1)</script>' });
      const html = (await request(app).get(`/product/${product._id}`).expect(200)).text;
      assert.ok(!html.includes('<script>alert(1)'));
      assert.match(html, /<title>Pompe &quot;pro&quot; &lt;\/script&gt;/);
      assert.equal(jsonLd(html)['@graph'][0].name, 'Pompe "pro" </script><script>alert(1)</script>');
    });

    it('answers 404 for products and pages that do not exist, still opening the shop', async () => {
      for (const address of ['/product/000000000000000000000000', '/product/not-an-id', '/no-such-page']) {
        const res = await request(app).get(address).expect(404).expect('Content-Type', /html/);
        assert.match(res.text, /<meta name="robots" content="noindex" \/>/, address);
        assert.match(res.text, /<div id="root"><\/div>/);
      }
      // API addresses still answer in JSON
      const api = await request(app).get('/api/no-such-route').expect(404);
      assert.equal(api.body.message, 'Route not found');
    });

    it('gives category pages their own title and keeps searches and private pages out of results', async () => {
      await createCategory({ description: 'Filtres à sable, à cartouche et à diatomée.' });
      const category = (await request(app).get('/shop?category=filters&sortBy=price').expect(200)).text;
      assert.match(category, /<title>Filtration \| STES\.tn<\/title>/);
      assert.match(category, /<link rel="canonical" href="https:\/\/stes\.tn\/shop\?category=filters" \/>/);
      assert.match(category, /content="Filtres à sable, à cartouche et à diatomée\."/);

      const search = (await request(app).get('/shop?search=pompe').expect(200)).text;
      assert.match(search, /<meta name="robots" content="noindex" \/>/);
      assert.ok(!search.includes('rel="canonical"'));

      for (const address of ['/checkout', '/admin/orders', '/payment/success']) {
        const html = (await request(app).get(address).expect(200)).text;
        assert.match(html, /<meta name="robots" content="noindex" \/>/, address);
      }
    });

    it('describes the shop on the home page with the contact details from the settings', async () => {
      const Settings = require('../models/Settings');
      await Settings.create({ key: 'shop', contact: { phone: '+216 71 000 000', email: 'contact@stes.tn', address: '12 Rue de Marseille, Tunis' } });
      const html = (await request(app).get('/').expect(200)).text;
      assert.match(html, /<title>STES\.tn – Équipements et installation de piscines en Tunisie<\/title>/);
      const [store, site] = jsonLd(html)['@graph'];
      assert.equal(store['@type'], 'Store');
      assert.equal(store.telephone, '+216 71 000 000');
      assert.equal(store.address.streetAddress, '12 Rue de Marseille, Tunis');
      assert.equal(site['@type'], 'WebSite');
    });

    it('allows only its own inline theme script, and caches built files for good', async () => {
      const page = await request(app).get('/about').expect(200);
      const hash = crypto.createHash('sha256').update(THEME_SCRIPT).digest('base64');
      const policy = page.headers['content-security-policy'];
      assert.match(policy, new RegExp(`script-src 'self' 'sha256-${hash.replace(/[+/]/g, '\\$&')}'`));
      const scriptSrc = policy.split('; ').find(directive => directive.startsWith('script-src'));
      assert.ok(!scriptSrc.includes('unsafe-inline'));
      // The fonts are the site's own: no other server to reach before the text shows
      assert.ok(policy.includes("font-src 'self' data:;"), policy);
      assert.ok(!/fonts\.g(oogleapis|static)\.com/.test(policy), policy);
      assert.equal(page.headers['cache-control'], 'no-cache');

      const asset = await request(app).get('/assets/index-abc123.js').expect(200);
      assert.match(asset.headers['cache-control'], /max-age=31536000, immutable/);
      await request(app).get('/assets/missing.js').expect(404);
      await request(app).get('/favicon.svg').expect(200);
    });

    it('hashes the theme script as browsers read it, whatever the line endings of the build', () => {
      const { pagePolicy } = require('../routes/shopPages');
      const hash = crypto.createHash('sha256').update(THEME_SCRIPT).digest('base64');
      assert.ok(pagePolicy(TEMPLATE.replace(/\n/g, '\r\n')).includes(`'sha256-${hash}'`));
    });
  });
});
