const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const {
  startDatabase, stopDatabase, clearDatabase, createApp, registerCustomer
} = require('./helpers');

describe('email confirmation', () => {
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
    // A new app each time: resend requests are rate limited per visitor
    app = createApp();
    sent = [];
    process.env.EMAIL_USER = 'shop@example.tn';
    process.env.EMAIL_PASS = 'smtp-password';
    emailService.transporter = {
      sendMail: async (message) => {
        sent.push(message);
        return { messageId: `test-${sent.length}` };
      }
    };
  });

  const waitForEmails = async (count) => {
    for (let i = 0; i < 50 && sent.length < count; i++) {
      await new Promise(resolve => setTimeout(resolve, 20));
    }
  };
  const linkToken = (email) => new URL(email.text.match(/https?:\/\/\S+/)[0]).searchParams.get('token');
  const verify = (token) => request(app).post('/api/customers/verify-email').send({ token });
  const me = async (token) => (await request(app).get('/api/customers/me').set('Authorization', `Bearer ${token}`).expect(200)).body.customer;
  const resend = (token) => request(app).post('/api/customers/resend-verification').set('Authorization', `Bearer ${token}`);

  it('sends a welcome email with a confirmation link on sign-up', async () => {
    await registerCustomer(app);
    await waitForEmails(1);

    assert.equal(sent.length, 1);
    assert.equal(sent[0].to, 'sami@example.com');
    assert.match(sent[0].subject, /Bienvenue chez STES Piscines/);
    assert.ok(sent[0].html.includes('Bonjour Sami'));
    assert.match(sent[0].text, /\/verify-email\?token=[0-9a-f]{64}/);
  });

  it('confirms the address with the link, once', async () => {
    const { token: session } = await registerCustomer(app);
    await waitForEmails(1);
    const token = linkToken(sent[0]);
    assert.equal((await me(session)).isEmailVerified, false);

    const res = await verify(token).expect(200);
    assert.equal(res.body.email, 'sami@example.com');
    assert.equal((await me(session)).isEmailVerified, true);
    await verify(token).expect(400);
  });

  it('keeps only a hash of the code, and never logs it', async () => {
    const logged = [];
    const originalLog = console.log;
    console.log = (...args) => logged.push(args.join(' '));
    try {
      await registerCustomer(app);
      await waitForEmails(1);
    } finally {
      console.log = originalLog;
    }
    const token = linkToken(sent[0]);
    const stored = await Customer.findOne({ email: 'sami@example.com' }).lean();
    assert.ok(stored.emailVerificationToken && stored.emailVerificationToken !== token);
    assert.ok(!logged.some(line => line.includes(token)));
  });

  it('refuses a link older than 7 days', async () => {
    await registerCustomer(app);
    await waitForEmails(1);
    await Customer.updateOne({ email: 'sami@example.com' }, { emailVerificationExpires: new Date(Date.now() - 1000) });
    await verify(linkToken(sent[0])).expect(400);
  });

  describe('sending the link again', () => {
    it('sends a new link that replaces the first one', async () => {
      const { token: session } = await registerCustomer(app);
      await waitForEmails(1);
      const first = linkToken(sent[0]);
      // As if the first email was sent a while ago
      await Customer.updateOne({ email: 'sami@example.com' }, { emailVerificationExpires: new Date(Date.now() + 6 * 24 * 3600 * 1000) });

      const res = await resend(session).expect(200);
      assert.match(res.body.message, /sami@example.com/);
      await waitForEmails(2);
      assert.equal(sent.length, 2);

      await verify(first).expect(400);
      await verify(linkToken(sent[1])).expect(200);
    });

    it('does not send another email within two minutes', async () => {
      const { token: session } = await registerCustomer(app);
      await waitForEmails(1);
      await resend(session).expect(200);
      await new Promise(resolve => setTimeout(resolve, 100));
      assert.equal(sent.length, 1);
    });

    it('is refused once the address is confirmed, and needs a login', async () => {
      const { token: session } = await registerCustomer(app);
      await waitForEmails(1);
      await verify(linkToken(sent[0])).expect(200);
      assert.match((await resend(session).expect(400)).body.message, /already verified/);
      await request(app).post('/api/customers/resend-verification').expect(401);
    });

    it('is limited to 5 an hour from one visitor', async () => {
      const { token: session } = await registerCustomer(app);
      for (let i = 0; i < 5; i++) await resend(session).expect(200);
      await resend(session).expect(429);
    });
  });

  it('still creates the account when email is not configured', async () => {
    process.env.EMAIL_PASS = 'your-app-password'; // .env.example placeholder
    await registerCustomer(app);
    await new Promise(resolve => setTimeout(resolve, 100));
    assert.equal(sent.length, 0);
  });
});
