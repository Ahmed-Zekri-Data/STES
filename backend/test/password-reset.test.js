const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const {
  startDatabase, stopDatabase, clearDatabase, createApp, registerCustomer
} = require('./helpers');

describe('forgot password', () => {
  let app;
  let emailService;
  let Customer;
  let sent;

  before(async () => {
    await startDatabase();
    emailService = require('../services/emailNotificationService');
    Customer = require('../models/Customer');
  });
  after(stopDatabase);
  beforeEach(async () => {
    await clearDatabase();
    // A new app each time: reset requests are rate limited per visitor
    app = createApp();
    sent = [];
    process.env.EMAIL_USER = 'shop@example.tn';
    process.env.EMAIL_PASS = 'smtp-password';
    emailService.transporter = {
      // Only reset emails: signing up also sends a welcome email
      sendMail: async (message) => {
        if (/mot de passe/.test(message.subject)) sent.push(message);
        return { messageId: `test-${sent.length}` };
      }
    };
  });

  const waitForEmails = async (count) => {
    for (let i = 0; i < 50 && sent.length < count; i++) {
      await new Promise(resolve => setTimeout(resolve, 20));
    }
  };
  const forgot = (email = 'sami@example.com') => request(app)
    .post('/api/customers/forgot-password').send({ email }).expect(200);
  const linkToken = (email) => new URL(email.text.match(/https?:\/\/\S+/)[0]).searchParams.get('token');
  const requestLink = async () => {
    await forgot();
    await waitForEmails(1);
    return linkToken(sent[0]);
  };
  const login = (password) => request(app).post('/api/customers/login').send({ email: 'sami@example.com', password });
  const reset = (token, password = 'nouveau-mdp') => request(app)
    .post('/api/customers/reset-password').send({ token, password });

  it('emails the customer a link to choose a new password', async () => {
    await registerCustomer(app);
    const res = await forgot();
    assert.match(res.body.message, /reset link has been sent/);
    await waitForEmails(1);

    assert.equal(sent.length, 1);
    assert.equal(sent[0].to, 'sami@example.com');
    assert.equal(sent[0].subject, 'Réinitialisation de votre mot de passe STES');
    assert.ok(sent[0].html.includes('Bonjour Sami'));
    assert.match(sent[0].text, /\/reset-password\?token=[0-9a-f]{64}/);
  });

  it('keeps only a hash of the link code in the database', async () => {
    await registerCustomer(app);
    const token = await requestLink();

    const stored = await Customer.findOne({ email: 'sami@example.com' }).lean();
    assert.ok(stored.passwordResetToken);
    assert.notEqual(stored.passwordResetToken, token);
  });

  it('answers the same for an unknown or deactivated account, without sending anything', async () => {
    await registerCustomer(app);
    await Customer.updateOne({ email: 'sami@example.com' }, { isActive: false });

    const unknown = await forgot('nobody@example.com');
    const inactive = await forgot('sami@example.com');
    await new Promise(resolve => setTimeout(resolve, 100));

    assert.equal(unknown.body.message, inactive.body.message);
    assert.equal(sent.length, 0);
  });

  it('does not send a second email within two minutes; the first link still works', async () => {
    await registerCustomer(app);
    const token = await requestLink();
    await forgot();
    await new Promise(resolve => setTimeout(resolve, 100));

    assert.equal(sent.length, 1);
    await reset(token).expect(200);
  });

  it('never writes the link to the server log', async () => {
    await registerCustomer(app);
    const logged = [];
    const originalLog = console.log;
    console.log = (...args) => logged.push(args.join(' '));
    try {
      await forgot();
      await waitForEmails(1);
    } finally {
      console.log = originalLog;
    }
    const token = linkToken(sent[0]);
    assert.ok(!logged.some(line => line.includes(token)));
  });

  it('accepts the request but sends nothing while email is not configured', async () => {
    process.env.EMAIL_PASS = 'your-app-password'; // .env.example placeholder
    await registerCustomer(app);
    await forgot();
    await new Promise(resolve => setTimeout(resolve, 100));
    assert.equal(sent.length, 0);
  });

  it('limits reset requests to 5 an hour from one visitor, sent or not', async () => {
    for (let i = 0; i < 5; i++) {
      await forgot(`someone${i}@example.com`);
    }
    const blocked = await request(app).post('/api/customers/forgot-password')
      .send({ email: 'someone@example.com' }).expect(429);
    assert.match(blocked.body.message, /Trop de demandes/);
  });

  describe('using the link', () => {
    it('sets the new password and logs the customer in', async () => {
      await registerCustomer(app);
      const token = await requestLink();

      const res = await reset(token).expect(200);
      assert.equal(res.body.customer.email, 'sami@example.com');
      await request(app).get('/api/customers/me')
        .set('Authorization', `Bearer ${res.body.token}`).expect(200);

      await login('nouveau-mdp').expect(200);
      await login('secret123').expect(401);
    });

    it('works only once', async () => {
      await registerCustomer(app);
      const token = await requestLink();
      await reset(token).expect(200);

      const again = await reset(token, 'autre-mdp').expect(400);
      assert.match(again.body.message, /Invalid or expired/);
    });

    it('expires after an hour', async () => {
      await registerCustomer(app);
      const token = await requestLink();
      await Customer.updateOne({ email: 'sami@example.com' }, { passwordResetExpires: new Date(Date.now() - 1000) });

      await reset(token).expect(400);
      await login('secret123').expect(200);
    });

    it('rejects a new password shorter than 6 characters', async () => {
      await registerCustomer(app);
      const token = await requestLink();
      await reset(token, '12345').expect(400);
    });

    it('signs out sessions started before the reset', async () => {
      const { token: oldSession } = await registerCustomer(app);
      const token = await requestLink();
      await reset(token).expect(200);

      const res = await request(app).get('/api/customers/me')
        .set('Authorization', `Bearer ${oldSession}`).expect(401);
      assert.match(res.body.message, /Password changed/);
    });

    it('unlocks an account locked by failed logins', async () => {
      await registerCustomer(app);
      for (let i = 0; i < 5; i++) {
        await login('wrong-password').expect(401);
      }
      await login('secret123').expect(401); // locked
      const token = await requestLink();

      await reset(token).expect(200);
      await login('nouveau-mdp').expect(200);
    });

    it('can be checked before the customer types a password', async () => {
      await registerCustomer(app);
      const token = await requestLink();

      const valid = await request(app).post('/api/customers/reset-password/check').send({ token }).expect(200);
      assert.equal(valid.body.email, 'sami@example.com');
      await request(app).post('/api/customers/reset-password/check').send({ token: 'not-a-real-code' }).expect(400);
    });
  });
});
