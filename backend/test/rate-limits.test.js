const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const {
  startDatabase, stopDatabase, clearDatabase, createApp, adminToken, registerCustomer
} = require('./helpers');

// Each test builds its own app, so rate limit counters start from zero
describe('rate limits', () => {
  before(startDatabase);
  after(stopDatabase);
  beforeEach(clearDatabase);

  const login = (app, password) => request(app)
    .post('/api/customers/login')
    .send({ email: 'sami@example.com', password });

  it('allows normal browsing well beyond 100 requests', async () => {
    const app = createApp();
    for (let i = 0; i < 150; i++) {
      await request(app).get('/api/health').expect(200);
    }
  });

  it('blocks a customer login after 10 failed attempts, even with the right password', async () => {
    const app = createApp();
    await registerCustomer(app);

    for (let i = 0; i < 10; i++) {
      await login(app, 'wrong-password').expect(401);
    }
    const blocked = await login(app, 'secret123').expect(429);
    assert.match(blocked.body.message, /Trop de tentatives/);
  });

  it('does not count successful logins', async () => {
    const app = createApp();
    await registerCustomer(app);

    for (let i = 0; i < 15; i++) {
      await login(app, 'secret123').expect(200);
    }
  });

  it('limits failed admin logins too', async () => {
    const app = createApp();
    await adminToken(app); // creates the admin (one successful login)

    for (let i = 0; i < 10; i++) {
      await request(app).post('/api/auth/login').send({ username: 'admin', password: 'nope' }).expect(401);
    }
    await request(app).post('/api/auth/login').send({ username: 'admin', password: 'admin-password' }).expect(429);
  });

  describe('client address', () => {
    const failFromIp = async (app, ip, times) => {
      for (let i = 0; i < times; i++) {
        await login(app, 'wrong-password').set('X-Forwarded-For', ip);
      }
    };

    it('ignores X-Forwarded-For by default, so it cannot be used to dodge limits', async () => {
      const app = createApp();
      await registerCustomer(app);
      await failFromIp(app, '203.0.113.1', 10);

      await login(app, 'secret123').set('X-Forwarded-For', '203.0.113.2').expect(429);
    });

    it('limits each visitor separately behind a trusted proxy (TRUST_PROXY)', async () => {
      process.env.TRUST_PROXY = '1';
      try {
        const app = createApp();
        await registerCustomer(app);
        await registerCustomer(app, { email: 'nour@example.com' });
        await failFromIp(app, '203.0.113.1', 10);

        await login(app, 'secret123').set('X-Forwarded-For', '203.0.113.1').expect(429);
        // A different visitor, on an account that isn't locked (accounts lock
        // after 5 wrong passwords, independently of these IP limits)
        await request(app)
          .post('/api/customers/login')
          .set('X-Forwarded-For', '203.0.113.2')
          .send({ email: 'nour@example.com', password: 'secret123' })
          .expect(200);
      } finally {
        delete process.env.TRUST_PROXY;
      }
    });
  });

  it('limits account creation to 20 per hour', async () => {
    const app = createApp();
    for (let i = 0; i < 20; i++) {
      await registerCustomer(app, { email: `customer${i}@example.com` });
    }
    await request(app)
      .post('/api/customers/register')
      .send({ email: 'one-more@example.com', password: 'secret123', firstName: 'A', lastName: 'B' })
      .expect(429);
  });
});
