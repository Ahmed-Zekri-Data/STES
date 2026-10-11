const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');
const { startDatabase, stopDatabase, clearDatabase, createApp, adminToken } = require('./helpers');

// Admin → Settings → Marketing: measurement ids, social pages, Google review link
describe('marketing settings', () => {
  let app;
  let token;
  let distDir;

  before(async () => {
    await startDatabase();
    distDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stes-dist-'));
    fs.writeFileSync(path.join(distDir, 'index.html'), '<!doctype html><html><head><title>STES</title></head><body><div id="root"></div></body></html>');
  });
  after(async () => {
    fs.rmSync(distDir, { recursive: true, force: true });
    await stopDatabase();
  });
  beforeEach(async () => {
    await clearDatabase();
    app = createApp({ frontendDir: distDir });
    token = await adminToken(app);
  });

  const save = (marketing) => request(app).put('/api/admin/settings').set('Authorization', `Bearer ${token}`).send({ marketing });
  const policy = async () => (await request(app).get('/about').expect(200)).headers['content-security-policy'];

  it('is empty until the shop fills it in, and nothing else is allowed on the pages', async () => {
    const { marketing } = (await request(app).get('/api/settings').expect(200)).body;
    assert.deepEqual(marketing, { gaMeasurementId: '', metaPixelId: '', facebookUrl: '', instagramUrl: '', tiktokUrl: '', googleReviewUrl: '' });
    const csp = await policy();
    assert.ok(!csp.includes('googletagmanager'), csp);
    assert.ok(!csp.includes('facebook'), csp);
  });

  it('saves the ids and links, shows them to the shop, and allows only the services set up', async () => {
    const saved = (await save({
      gaMeasurementId: ' g-ab12cd34ef ',
      metaPixelId: '123456789012345',
      facebookUrl: 'https://www.facebook.com/stes.piscines',
      instagramUrl: 'https://www.instagram.com/stes.piscines/',
      tiktokUrl: '',
      googleReviewUrl: 'https://g.page/r/CabcDEF123/review'
    }).expect(200)).body.settings.marketing;
    assert.equal(saved.gaMeasurementId, 'G-AB12CD34EF');

    const { marketing } = (await request(app).get('/api/settings').expect(200)).body;
    assert.equal(marketing.metaPixelId, '123456789012345');
    assert.equal(marketing.googleReviewUrl, 'https://g.page/r/CabcDEF123/review');

    let csp = await policy();
    assert.match(csp, /script-src [^;]*https:\/\/www\.googletagmanager\.com/);
    assert.match(csp, /script-src [^;]*https:\/\/connect\.facebook\.net/);
    assert.match(csp, /connect-src [^;]*https:\/\/\*\.google-analytics\.com/);
    assert.match(csp, /connect-src [^;]*https:\/\/www\.facebook\.com/);

    // Google only: Meta's addresses are not allowed any more
    await save({ metaPixelId: '' }).expect(200);
    csp = await policy();
    assert.match(csp, /googletagmanager/);
    assert.ok(!csp.includes('facebook'), csp);
  });

  it('refuses ids and links that are not what each service gives', async () => {
    const refused = async (marketing, message) => assert.equal((await save(marketing).expect(400)).body.message, message);
    await refused({ gaMeasurementId: 'UA-1234-5' }, 'Enter the Google Analytics measurement ID, for example G-AB12CD34EF, or leave it empty');
    await refused({ metaPixelId: 'fb-123' }, 'Enter the Meta pixel ID (digits only, for example 123456789012345), or leave it empty');
    await refused({ facebookUrl: 'http://www.facebook.com/stes' }, 'Enter the address of the Facebook page (https://www.facebook.com/…), or leave it empty');
    await refused({ facebookUrl: 'https://facebook.com.evil.example/stes' }, 'Enter the address of the Facebook page (https://www.facebook.com/…), or leave it empty');
    await refused({ instagramUrl: 'https://www.facebook.com/stes' }, 'Enter the address of the Instagram account (https://www.instagram.com/…), or leave it empty');
    await refused({ googleReviewUrl: 'javascript:alert(1)' }, 'Enter the review link given by Google Business Profile (https://g.page/r/…), or leave it empty');
  });
});
