const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const {
  startDatabase, stopDatabase, clearDatabase, createApp, registerCustomer
} = require('./helpers');

describe('customer account settings', () => {
  let app;
  let session;

  before(async () => {
    await startDatabase();
    app = createApp();
  });
  after(stopDatabase);
  beforeEach(async () => {
    await clearDatabase();
    ({ token: session } = await registerCustomer(app));
  });

  const as = (method, path, token = session) => request(app)[method](path).set('Authorization', `Bearer ${token}`);
  const login = (password) => request(app).post('/api/customers/login').send({ email: 'sami@example.com', password });

  describe('profile', () => {
    it('saves name, phone and date of birth, and answers with the whole account', async () => {
      const res = await as('put', '/api/customers/profile')
        .send({ firstName: 'Samir', lastName: 'Ben Ali', phone: '+216 98 765 432', dateOfBirth: '1990-05-14' })
        .expect(200);

      const { customer } = res.body;
      assert.equal(customer.fullName, 'Samir Ben Ali');
      assert.equal(customer.phone, '+21698765432');
      assert.equal(customer.dateOfBirth.slice(0, 10), '1990-05-14');
      // The account page keeps showing these after a save
      assert.equal(customer.isEmailVerified, false);
      assert.equal(customer.loyaltyPoints, 0);
      assert.equal(customer.email, 'sami@example.com');
    });

    it('clears the phone and date of birth when sent empty', async () => {
      await as('put', '/api/customers/profile').send({ phone: '98765432', dateOfBirth: '1990-05-14' }).expect(200);
      const { customer } = (await as('put', '/api/customers/profile').send({ phone: '', dateOfBirth: '' }).expect(200)).body;
      assert.equal(customer.phone, undefined);
      assert.equal(customer.dateOfBirth, undefined);
    });

    it('refuses an invalid phone, a future birth date and an empty name', async () => {
      await as('put', '/api/customers/profile').send({ phone: '12345' }).expect(400);
      await as('put', '/api/customers/profile').send({ dateOfBirth: '2999-01-01' }).expect(400);
      await as('put', '/api/customers/profile').send({ firstName: '' }).expect(400);
    });

    it('accepts a phone with spaces at sign-up too', async () => {
      const res = await request(app).post('/api/customers/register').send({
        email: 'leila@example.com', password: 'secret123', firstName: 'Leila', lastName: 'M', phone: '+216 12 345 678'
      }).expect(201);
      assert.equal(res.body.customer.phone, '+21612345678');
    });
  });

  describe('password', () => {
    it('changes it, keeps this device logged in and signs out the others', async () => {
      const other = (await login('secret123').expect(200)).body.token;

      const res = await as('put', '/api/customers/change-password')
        .send({ currentPassword: 'secret123', newPassword: 'nouveau-mdp' })
        .expect(200);

      await as('get', '/api/customers/me', res.body.token).expect(200);
      await as('get', '/api/customers/me', other).expect(401);
      await login('nouveau-mdp').expect(200);
      await login('secret123').expect(401);
    });

    it('needs the current password', async () => {
      const res = await as('put', '/api/customers/change-password')
        .send({ currentPassword: 'wrong', newPassword: 'nouveau-mdp' })
        .expect(400);
      assert.match(res.body.message, /Current password is incorrect/);
    });
  });
});
