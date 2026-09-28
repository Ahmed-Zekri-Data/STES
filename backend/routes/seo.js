const express = require('express');
const router = express.Router();
const { buildSitemap, robotsTxt, siteUrl } = require('../services/seoService');

// Served at the site's root. When the shop is hosted apart from this
// server, its host must pass /sitemap.xml and /robots.txt on to it.

// GET /sitemap.xml - The pages search engines should list
router.get('/sitemap.xml', async (req, res) => {
  try {
    res.type('application/xml')
      .set('Cache-Control', 'public, max-age=3600')
      .send(await buildSitemap(siteUrl(req)));
  } catch (error) {
    console.error('Error building sitemap:', error);
    res.status(500).type('text/plain').send('Sitemap unavailable');
  }
});

// GET /robots.txt - What search engines may visit
router.get('/robots.txt', (req, res) => {
  res.type('text/plain')
    .set('Cache-Control', 'public, max-age=86400')
    .send(robotsTxt(siteUrl(req)));
});

module.exports = router;
