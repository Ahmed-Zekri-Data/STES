const { describe, it, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const {
  startDatabase, stopDatabase, clearDatabase, createApp, adminToken
} = require('./helpers');

describe('admin emails for new contact and quote requests', () => {
  let app;
  let emailService;
  let sent;

  before(async () => {
    await startDatabase();
    emailService = require('../services/emailNotificationService');
  });
  after(stopDatabase);
  beforeEach(async () => {
    await clearDatabase();
    // A new app each time: form submissions are rate limited per visitor
    app = createApp();
    await adminToken(app); // super admin admin@example.com
    sent = [];
    process.env.EMAIL_USER = 'shop@example.tn';
    process.env.EMAIL_PASS = 'smtp-password';
    delete process.env.ADMIN_NOTIFICATION_EMAIL;
    emailService.transporter = {
      sendMail: async (message) => {
        sent.push(message);
        return { messageId: `test-${sent.length}` };
      }
    };
  });
  afterEach(() => delete process.env.ADMIN_NOTIFICATION_EMAIL);

  const waitForEmails = async (count) => {
    for (let i = 0; i < 50 && sent.length < count; i++) {
      await new Promise(resolve => setTimeout(resolve, 20));
    }
  };

  const contact = (overrides = {}) => request(app).post('/api/forms/contact').send({
    name: 'Leila Mansouri',
    email: 'leila@example.com',
    phone: '+21695456789',
    subject: 'Pompe bruyante',
    message: 'Ma pompe fait un bruit étrange.\nPouvez-vous passer ?',
    ...overrides
  });

  const addAdmin = (fields) => {
    const Admin = require('../models/Admin');
    return Admin.create({
      password: 'some-password', firstName: 'A', lastName: 'B', role: 'admin', isActive: true, ...fields
    });
  };

  it('emails the admins about a contact message, with Reply going to the customer', async () => {
    await contact().expect(201);
    await waitForEmails(1);

    assert.equal(sent.length, 1);
    const [email] = sent;
    assert.equal(email.to, 'admin@example.com');
    assert.deepEqual(email.replyTo, { name: 'Leila Mansouri', address: 'leila@example.com' });
    assert.match(email.from, /shop@example\.tn/);
    assert.equal(email.subject, 'Nouveau message : Pompe bruyante');
    for (const expected of ['Leila Mansouri', 'leila@example.com', '+21695456789', 'Pompe bruyante', 'Pouvez-vous passer ?']) {
      assert.ok(email.html.includes(expected), `html should include ${expected}`);
    }
    assert.ok(email.text.includes('/admin/forms?search=leila%40example.com'));
  });

  it('emails the admins about a quote request, naming the city', async () => {
    await request(app).post('/api/forms/quote').send({
      name: 'Karim Gharbi', email: 'karim@example.com', phone: '+21694567890', city: 'Sousse', message: 'Piscine 8x4'
    }).expect(201);
    await waitForEmails(1);

    assert.equal(sent[0].subject, 'Nouvelle demande de devis : Karim Gharbi (Sousse)');
    assert.ok(sent[0].html.includes('Sousse') && sent[0].html.includes('Piscine 8x4'));
  });

  it('does not email about newsletter sign-ups', async () => {
    await request(app).post('/api/forms/newsletter').send({ email: 'news@example.com' }).expect(201);
    await new Promise(resolve => setTimeout(resolve, 100));
    assert.equal(sent.length, 0);
  });

  it('escapes what the customer typed and keeps the subject on one line', async () => {
    await contact({ name: '<b>Leila</b>', subject: 'Urgent\nBcc: someone@evil.test', message: '<script>alert(1)</script>' }).expect(201);
    await waitForEmails(1);

    assert.ok(!sent[0].html.includes('<script>') && sent[0].html.includes('&lt;script&gt;'));
    assert.ok(!sent[0].html.includes('<b>Leila</b>'));
    assert.equal(sent[0].subject, 'Nouveau message : Urgent Bcc: someone@evil.test');
  });

  it('shows when the request arrived in Tunisian time', () => {
    const { html } = emailService.generateNewRequestEmail({
      type: 'contact', name: 'Leila', email: 'leila@example.com', message: 'Bonjour',
      createdAt: new Date('2026-01-15T09:30:00Z')
    });
    assert.ok(html.includes('15 janvier 2026 à 10:30'));
  });

  describe('recipients', () => {
    it('are the active admins who manage forms, by default', async () => {
      await addAdmin({ username: 'forms', email: 'forms@example.com', permissions: ['forms'] });
      await addAdmin({ username: 'catalog', email: 'catalog@example.com', permissions: ['products'] });
      await addAdmin({ username: 'gone', email: 'gone@example.com', permissions: ['forms'], isActive: false });

      await contact().expect(201);
      await waitForEmails(1);

      assert.deepEqual(sent[0].to.split(', ').sort(), ['admin@example.com', 'forms@example.com']);
    });

    it('can be set with ADMIN_NOTIFICATION_EMAIL', async () => {
      process.env.ADMIN_NOTIFICATION_EMAIL = 'contact@stes.tn, gerant@stes.tn';

      await contact().expect(201);
      await waitForEmails(1);

      assert.equal(sent[0].to, 'contact@stes.tn, gerant@stes.tn');
    });
  });

  it('does not try to send when email is not configured', async () => {
    process.env.EMAIL_PASS = 'your-app-password'; // .env.example placeholder
    await contact().expect(201);
    await new Promise(resolve => setTimeout(resolve, 100));
    assert.equal(sent.length, 0);
  });

  it('still accepts the request when the mail server fails or hangs', async () => {
    emailService.transporter = { sendMail: async () => { throw new Error('SMTP down'); } };
    await contact().expect(201);

    emailService.transporter = { sendMail: () => new Promise(() => {}) }; // never answers
    const started = Date.now();
    await contact().expect(201);
    assert.ok(Date.now() - started < 2000, 'the visitor must not wait for the mail server');
  });
});
