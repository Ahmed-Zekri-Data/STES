const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const {
  startDatabase, stopDatabase, clearDatabase, createApp, createProduct, orderPayload
} = require('./helpers');

describe('order confirmation email', () => {
  let app;
  let emailService;
  let sent;

  before(async () => {
    await startDatabase();
    app = createApp();
    emailService = require('../services/emailNotificationService');
  });
  after(stopDatabase);
  beforeEach(async () => {
    await clearDatabase();
    sent = [];
    process.env.EMAIL_USER = 'shop@example.tn';
    process.env.EMAIL_PASS = 'smtp-password';
    // Capture emails instead of talking to an SMTP server
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

  const placeOrder = async (customerOverrides = {}) => {
    const product = await createProduct({ name: 'Filtre à sable', price: 250 });
    const payload = orderPayload([{ productId: product._id, quantity: 2 }], {
      shipping: { address: '12 Avenue Habib Bourguiba', city: 'Sousse', governorate: 'Sousse' }
    });
    Object.assign(payload.customer, customerOverrides);
    return request(app).post('/api/orders').send(payload).expect(201);
  };

  it('emails the customer the order summary after checkout', async () => {
    const res = await placeOrder();
    const { orderNumber, trackingCode } = res.body.order;
    await waitForEmails(1);

    assert.equal(sent.length, 1);
    const [email] = sent;
    assert.equal(email.to, 'guest@example.com');
    assert.match(email.from, /shop@example\.tn/);
    assert.equal(email.subject, `Confirmation de votre commande ${orderNumber}`);
    // Prices include VAT: 500 + 5 cash-on-delivery fee, VAT shown but not added
    for (const expected of [orderNumber, trackingCode, 'Filtre à sable', '500.000 TND', 'Gratuite', '505.000 TND', 'dont TVA (19%) : 79.832 TND', 'Paiement à la livraison', 'Sousse']) {
      assert.ok(email.html.includes(expected), `html should include ${expected}`);
    }
    assert.ok(email.text.includes(`/track-order?code=${trackingCode}`));
    assert.ok(email.text.includes('Total : 505.000 TND\ndont TVA (19%) : 79.832 TND'));
  });

  it('still shows VAT as added on orders placed before prices included it', () => {
    const { text } = emailService.generateOrderConfirmationEmail({
      orderNumber: 'ORD-1', trackingCode: 'TRK-1', paymentMethod: 'cash_on_delivery',
      customer: { name: 'Sami', address: { city: 'Tunis' } },
      items: [{ name: 'Filtre', quantity: 1, price: 100 }],
      pricing: { subtotal: 100, shippingCost: 7, taxAmount: 19, taxRate: 0.19, totalAmount: 126 }
    });

    assert.ok(text.includes('TVA (19%) : 19.000 TND\nTotal : 126.000 TND'));
    assert.ok(!text.includes('dont TVA'));
  });

  it('escapes what the customer typed', async () => {
    await placeOrder({ firstName: '<script>alert(1)</script>', lastName: 'Ben Ali' });
    await waitForEmails(1);

    assert.ok(!sent[0].html.includes('<script>alert(1)</script>'));
    assert.ok(sent[0].html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  });

  it('does not try to send when email is not configured', async () => {
    process.env.EMAIL_PASS = 'your-app-password'; // .env.example placeholder
    await placeOrder();
    await new Promise(resolve => setTimeout(resolve, 100));
    assert.equal(sent.length, 0);
  });

  it('still completes checkout when the mail server fails or hangs', async () => {
    emailService.transporter = { sendMail: async () => { throw new Error('SMTP down'); } };
    await placeOrder();

    emailService.transporter = { sendMail: () => new Promise(() => {}) }; // never answers
    const started = Date.now();
    await placeOrder();
    assert.ok(Date.now() - started < 2000, 'checkout must not wait for the mail server');
  });
});
