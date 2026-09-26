const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const {
  startDatabase, stopDatabase, clearDatabase, createApp, adminToken
} = require('./helpers');

describe('admin users', () => {
  let app;
  let token; // super admin "admin"
  let Admin;

  before(async () => {
    await startDatabase();
    Admin = require('../models/Admin');
  });
  after(stopDatabase);
  beforeEach(async () => {
    await clearDatabase();
    // A new app each time: failed logins are rate limited per visitor
    app = createApp();
    token = await adminToken(app);
  });

  const as = (method, path, bearer = token) => request(app)[method](path).set('Authorization', `Bearer ${bearer}`);
  const login = (username, password) => request(app).post('/api/auth/login').send({ username, password });
  const newAdmin = (fields = {}) => as('post', '/api/admin/users').send({
    username: 'mariem', email: 'mariem@stes.tn', password: 'motdepasse-1',
    firstName: 'Mariem', lastName: 'Jaziri', permissions: ['orders', 'forms'], ...fields
  });
  const self = async () => (await as('get', '/api/auth/me').expect(200)).body.admin;

  describe('managing accounts', () => {
    it('adds an admin who can then log in with the given permissions', async () => {
      const res = await newAdmin().expect(201);
      assert.equal(res.body.admin.role, 'admin');
      assert.deepEqual(res.body.admin.permissions, ['orders', 'forms']);
      assert.equal(res.body.admin.password, undefined);

      const session = await login('mariem', 'motdepasse-1').expect(200);
      assert.deepEqual(session.body.admin.permissions, ['orders', 'forms']);
    });

    it('lists every admin without passwords', async () => {
      await newAdmin().expect(201);
      const res = await as('get', '/api/admin/users').expect(200);
      assert.deepEqual(res.body.admins.map(a => a.username).sort(), ['admin', 'mariem']);
      assert.ok(res.body.admins.every(a => a.password === undefined));
      assert.deepEqual(res.body.permissions, ['products', 'orders', 'forms', 'users', 'settings']);
    });

    it('refuses a taken username or email, a short password and unknown permissions', async () => {
      await newAdmin().expect(201);
      assert.match((await newAdmin({ email: 'other@stes.tn' }).expect(400)).body.message, /username is already taken/);
      assert.match((await newAdmin({ username: 'other', email: 'MARIEM@stes.tn' }).expect(400)).body.message, /email is already used/);
      assert.match((await newAdmin({ username: 'other2', email: 'o2@stes.tn', password: 'short' }).expect(400)).body.message, /at least 8/);
      await newAdmin({ username: 'other3', email: 'o3@stes.tn', permissions: ['everything'] }).expect(400);
    });

    it('accepts email addresses with longer endings like .info', async () => {
      await newAdmin({ email: 'gerant@piscines.info' }).expect(201);
    });

    it('changes role and permissions', async () => {
      const { admin } = (await newAdmin().expect(201)).body;
      const res = await as('put', `/api/admin/users/${admin.id}`).send({ permissions: ['products'] }).expect(200);
      assert.deepEqual(res.body.admin.permissions, ['products']);

      const promoted = await as('put', `/api/admin/users/${admin.id}`).send({ role: 'super_admin' }).expect(200);
      assert.equal(promoted.body.admin.role, 'super_admin');
      assert.equal(promoted.body.admin.permissions.length, 5);
    });

    it('is only for super admins', async () => {
      await newAdmin({ permissions: ['products', 'orders', 'forms', 'users', 'settings'] }).expect(201);
      const other = (await login('mariem', 'motdepasse-1').expect(200)).body.token;

      await as('get', '/api/admin/users', other).expect(403);
      await as('post', '/api/admin/users', other).send({}).expect(403);
    });
  });

  describe('deactivating', () => {
    it('signs the admin out and stops them logging in', async () => {
      const { admin } = (await newAdmin().expect(201)).body;
      const session = (await login('mariem', 'motdepasse-1').expect(200)).body.token;

      await as('put', `/api/admin/users/${admin.id}`).send({ isActive: false }).expect(200);
      await as('get', '/api/auth/me', session).expect(401);
      await login('mariem', 'motdepasse-1').expect(401);

      // Reactivated: logs in again, but the old session stays ended
      await as('put', `/api/admin/users/${admin.id}`).send({ isActive: true }).expect(200);
      await login('mariem', 'motdepasse-1').expect(200);
      await as('get', '/api/auth/me', session).expect(401);
    });

    it('does not let you deactivate yourself or change your own role', async () => {
      const me = await self();
      assert.match((await as('put', `/api/admin/users/${me.id}`).send({ isActive: false }).expect(400)).body.message, /own role or deactivate yourself/);
      await as('put', `/api/admin/users/${me.id}`).send({ role: 'admin' }).expect(400);
      // Your own name is fine
      await as('put', `/api/admin/users/${me.id}`).send({ firstName: 'Ahmed' }).expect(200);
    });

    it('lets a super admin demote or deactivate another super admin, never themselves', async () => {
      const me = await self();
      const { admin } = (await newAdmin({ role: 'super_admin' }).expect(201)).body;
      const other = (await login('mariem', 'motdepasse-1').expect(200)).body.token;

      // mariem demotes "admin"; "admin" can then no longer manage admins
      await as('put', `/api/admin/users/${me.id}`, other).send({ role: 'admin', permissions: ['products'] }).expect(200);
      await as('get', '/api/admin/users').expect(403);
      // mariem can't demote herself, so a super admin always remains
      await as('put', `/api/admin/users/${admin.id}`, other).send({ role: 'admin' }).expect(400);
    });
  });

  describe('passwords', () => {
    it('lets a super admin set a new password for another admin, signing them out and unlocking them', async () => {
      const { admin } = (await newAdmin().expect(201)).body;
      const session = (await login('mariem', 'motdepasse-1').expect(200)).body.token;
      await Admin.updateOne({ username: 'mariem' }, { loginAttempts: 5, lockUntil: new Date(Date.now() + 3600000) });

      await as('put', `/api/admin/users/${admin.id}/password`).send({ password: 'nouveau-mdp-2' }).expect(200);
      await as('get', '/api/auth/me', session).expect(401);
      await login('mariem', 'nouveau-mdp-2').expect(200);
    });

    it('sends you to My account for your own password', async () => {
      const me = await self();
      const res = await as('put', `/api/admin/users/${me.id}/password`).send({ password: 'nouveau-mdp-2' }).expect(400);
      assert.match(res.body.message, /My account/);
    });

    it('unlocks an admin locked by failed logins', async () => {
      const { admin } = (await newAdmin().expect(201)).body;
      await Admin.updateOne({ username: 'mariem' }, { loginAttempts: 5, lockUntil: new Date(Date.now() + 3600000) });
      assert.equal((await as('get', '/api/admin/users').expect(200)).body.admins.find(a => a.id === admin.id).isLocked, true);

      await as('put', `/api/admin/users/${admin.id}/unlock`).expect(200);
      await login('mariem', 'motdepasse-1').expect(200);
    });
  });

  describe('my account', () => {
    it('changes my password, keeps me logged in with a new token and ends my other sessions', async () => {
      const other = (await login('admin', 'admin-password').expect(200)).body.token;

      const res = await as('put', '/api/auth/password').send({ currentPassword: 'admin-password', newPassword: 'nouveau-mdp-2' }).expect(200);
      await as('get', '/api/auth/me', res.body.token).expect(200);
      await as('get', '/api/auth/me', other).expect(401);
      await as('get', '/api/auth/me').expect(401); // the token used for the change
      await login('admin', 'nouveau-mdp-2').expect(200);
    });

    it('needs the current password and at least 8 characters', async () => {
      await as('put', '/api/auth/password').send({ currentPassword: 'wrong', newPassword: 'nouveau-mdp-2' }).expect(400);
      await as('put', '/api/auth/password').send({ currentPassword: 'admin-password', newPassword: 'court' }).expect(400);
    });

    it('updates my name and email, keeping dots in the email', async () => {
      const res = await as('put', '/api/auth/profile').send({ firstName: 'Ahmed', lastName: 'Zekri', email: 'Ahmed.Zekri@gmail.com' }).expect(200);
      assert.equal(res.body.admin.fullName, 'Ahmed Zekri');
      assert.equal(res.body.admin.email, 'ahmed.zekri@gmail.com');
      assert.equal((await self()).firstName, 'Ahmed');
    });
  });
});
