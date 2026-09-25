const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { spawnSync } = require('child_process');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const {
  startDatabase, stopDatabase, clearDatabase, createApp, adminToken, registerCustomer
} = require('./helpers');

describe('authentication', () => {
  let app;

  before(async () => {
    await startDatabase();
    app = createApp();
  });
  after(stopDatabase);
  beforeEach(clearDatabase);

  it('reports a connected database on the health check', async () => {
    const res = await request(app).get('/api/health').expect(200);
    assert.equal(res.body.database, 'connected');
  });

  it('registers a customer whose token loads their profile', async () => {
    const { token, customer } = await registerCustomer(app);

    const res = await request(app)
      .get('/api/customers/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    assert.equal(res.body.customer.id, customer.id);
    assert.equal(res.body.customer.email, 'sami@example.com');
  });

  it('logs a customer in', async () => {
    const { customer } = await registerCustomer(app);

    const login = await request(app)
      .post('/api/customers/login')
      .send({ email: 'sami@example.com', password: 'secret123' })
      .expect(200);

    const me = await request(app)
      .get('/api/customers/me')
      .set('Authorization', `Bearer ${login.body.token}`)
      .expect(200);
    assert.equal(me.body.customer.id, customer.id);
  });

  it('rejects a wrong password', async () => {
    await registerCustomer(app);
    await request(app)
      .post('/api/customers/login')
      .send({ email: 'sami@example.com', password: 'wrong-password' })
      .expect(401);
  });

  it('rejects missing, malformed and wrongly shaped tokens', async () => {
    const { customer } = await registerCustomer(app);
    const withoutCustomerId = jwt.sign({ id: customer.id }, process.env.JWT_SECRET);

    await request(app).get('/api/customers/me').expect(401);
    for (const token of ['not-a-token', withoutCustomerId]) {
      await request(app)
        .get('/api/customers/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);
    }
  });

  it('keeps admin and customer tokens separate', async () => {
    const admin = await adminToken(app);
    const { token: customer } = await registerCustomer(app);

    await request(app).get('/api/auth/me').set('Authorization', `Bearer ${admin}`).expect(200);
    await request(app).get('/api/auth/me').set('Authorization', `Bearer ${customer}`).expect(401);
    await request(app).get('/api/customers/me').set('Authorization', `Bearer ${admin}`).expect(401);
  });

  it('refuses to start without JWT_SECRET', () => {
    const result = spawnSync(process.execPath, [path.join(__dirname, '..', 'server.js')], {
      env: { ...process.env, JWT_SECRET: '' },
      encoding: 'utf8',
      timeout: 10000
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /JWT_SECRET is not set/);
  });
});
