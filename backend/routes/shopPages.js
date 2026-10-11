const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const compression = require('compression');
const { pageMeta, renderPage, siteUrl } = require('../services/seoService');
const { getSettings } = require('../services/settingsService');

// Serves the built shop (frontend/dist) from this server, so the shop and
// its API share one address. Each page is sent with its own title,
// description and picture already in place: link previews (WhatsApp,
// Facebook) do not run the shop's JavaScript, and search engines see the
// right page at once.

// The inline scripts in index.html (the theme script) by their hash, so
// the page may run them and no other inline script. Browsers hash the
// script as they read it, with Windows line endings turned into "\n".
const inlineScriptHashes = (html) => [...html.matchAll(/<script(?![^>]*\bsrc=)(?![^>]*application\/ld\+json)[^>]*>([\s\S]*?)<\/script>/g)]
  .map(([, code]) => `'sha256-${crypto.createHash('sha256').update(code.replace(/\r\n?/g, '\n')).digest('base64')}'`);

// The audience measurement services a page may load, once set up in Admin →
// Settings → Marketing (and accepted by the visitor, see the shop's
// utils/analytics.js): only then are their addresses allowed
const SERVICES = {
  ga: {
    script: ['https://www.googletagmanager.com'],
    connect: ['https://*.google-analytics.com', 'https://*.analytics.google.com', 'https://*.googletagmanager.com']
  },
  meta: {
    script: ['https://connect.facebook.net'],
    connect: ['https://www.facebook.com', 'https://connect.facebook.net']
  }
};

// helmet's default policy is for the API; pages use the site's own fonts and
// show product photos from any https address
const pagePolicy = (html, services = {}) => {
  const enabled = Object.keys(SERVICES).filter(name => services[name]).map(name => SERVICES[name]);
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'self'",
    "form-action 'self'",
    ["script-src 'self'", ...inlineScriptHashes(html), ...enabled.flatMap(s => s.script)].join(' '),
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    "img-src 'self' data: blob: https:",
    ["connect-src 'self'", ...enabled.flatMap(s => s.connect)].join(' '),
    "worker-src 'self'",
    "manifest-src 'self'"
  ].join('; ');
};

// Which measurement services are set up (none when the database is down)
const measurement = async () => {
  try {
    const { marketing } = await getSettings();
    return { ga: Boolean(marketing.gaMeasurementId), meta: Boolean(marketing.metaPixelId) };
  } catch {
    return {};
  }
};

const shopPages = (distDir) => {
  const router = express.Router();
  const template = fs.readFileSync(path.join(distDir, 'index.html'), 'utf8');

  router.use(compression());

  // Built files have a content hash in their name, so they never change
  router.use('/assets', express.static(path.join(distDir, 'assets'), {
    immutable: true,
    maxAge: '365d',
    index: false
  }), (req, res) => res.status(404).type('text/plain').send('Not found'));
  // favicon, service worker, social picture...
  router.use(express.static(distDir, { index: false }));

  router.get('*', async (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    const site = siteUrl(req);
    let meta;
    try {
      meta = await pageMeta(req.path, req.query, site);
    } catch (error) {
      // Without the database the page still opens, with the shop's generic tags
      console.error('Error preparing page tags:', error.message);
      meta = { title: null };
    }
    res.status(meta.status || 200)
      .set({ 'Content-Security-Policy': pagePolicy(template, await measurement()), 'Cache-Control': 'no-cache' })
      .type('html')
      .send(renderPage(template, meta, site));
  });

  return router;
};

module.exports = { shopPages, pagePolicy };
