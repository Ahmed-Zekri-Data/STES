const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('./helpers');

describe('placeholder images', () => {
  let app;

  before(() => {
    app = createApp();
  });

  it('returns an SVG of the requested size', async () => {
    const res = await request(app).get('/api/placeholder/300/200').expect(200);

    assert.match(res.headers['content-type'], /^image\/svg\+xml/);
    assert.match(res.headers['cache-control'], /max-age=\d+/);
    const svg = res.text || res.body.toString();
    assert.match(svg, /<svg[^>]*width="300"[^>]*height="200"/);
  });

  it('rejects sizes that are not whole numbers in range', async () => {
    for (const path of ['0/100', '100/abc', '100/2001', '1.5/10']) {
      await request(app).get(`/api/placeholder/${path}`).expect(400);
    }
  });

  it('is not counted against the API rate limit', async () => {
    // The limit is 100 API requests per 15 minutes per IP
    for (let i = 0; i < 110; i++) {
      await request(app).get('/api/placeholder/80/80').expect(200);
    }
    await request(app).get('/api/health').expect(200);
  });
});
