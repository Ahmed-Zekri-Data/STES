const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const {
  startDatabase, stopDatabase, clearDatabase, createApp, createProduct, adminToken, registerCustomer, orderPayload
} = require('./helpers');

// Makes supertest collect a binary body (PDF) into res.body as a Buffer
const binary = (res, done) => {
  const chunks = [];
  res.on('data', chunk => chunks.push(chunk));
  res.on('end', () => done(null, Buffer.concat(chunks)));
};

describe('invoices', () => {
  let app;
  let token;
  const year = new Date().getFullYear();

  before(async () => {
    await startDatabase();
    app = createApp();
  });
  after(stopDatabase);
  beforeEach(async () => {
    await clearDatabase();
    token = await adminToken(app);
  });

  const admin = (method, path, bearer = token) => request(app)[method](path).set('Authorization', `Bearer ${bearer}`);
  const placeOrder = async (extra = {}, customerToken) => {
    const product = await createProduct({ price: 100 });
    const req = request(app).post('/api/orders');
    if (customerToken) req.set('Authorization', `Bearer ${customerToken}`);
    return (await req.send(orderPayload([{ productId: product._id, quantity: 2 }], extra)).expect(201)).body.order;
  };
  const setStatus = (order, status) => admin('put', `/api/orders/${order.id}/status`).send({ status, sendNotification: false }).expect(200);
  const invoiceOf = async (order) => (await admin('get', `/api/orders/${order.id}`).expect(200)).body.invoice;

  describe('numbers', () => {
    it('are given when an order is delivered, one after the other, and never change', async () => {
      const first = await placeOrder();
      const second = await placeOrder();
      const cancelled = await placeOrder();

      assert.equal((await invoiceOf(first))?.number, undefined);
      const delivered = await setStatus(first, 'delivered');
      assert.equal(delivered.body.order.invoice.number, `F${year}-00001`);
      await setStatus(cancelled, 'cancelled');
      await setStatus(second, 'delivered');
      assert.equal((await invoiceOf(second)).number, `F${year}-00002`);
      assert.equal((await invoiceOf(cancelled))?.number, undefined);

      // Back to shipped and delivered again: same number
      await setStatus(first, 'shipped');
      await setStatus(first, 'delivered');
      assert.equal((await invoiceOf(first)).number, `F${year}-00001`);
      assert.equal((await require('../models/Counter').findById(`invoice-${year}`)).seq, 2);
    });

    it('are not given twice when two requests number the same order', async () => {
      const { issueInvoice } = require('../services/invoiceService');
      const Order = require('../models/Order');
      const order = await Order.findById((await placeOrder()).id);
      const results = await Promise.all([issueInvoice(order), issueInvoice(order), issueInvoice(order)]);
      assert.ok(results.every(result => result.issuedAt));
      assert.equal((await Order.findById(order._id)).invoice.number, `F${year}-00001`);
      assert.equal((await require('../models/Counter').findById(`invoice-${year}`)).seq, 1);
    });
  });

  describe('downloads', () => {
    it('gives admins a bon de commande before delivery and the invoice after', async () => {
      const order = await placeOrder();
      const before = await admin('get', `/api/orders/${order.id}/invoice`).buffer().parse(binary).expect(200);
      assert.equal(before.headers['content-type'], 'application/pdf');
      assert.match(before.headers['content-disposition'], new RegExp(`bon-de-commande-${order.orderNumber}\\.pdf`));
      assert.equal(before.body.subarray(0, 5).toString(), '%PDF-');

      await setStatus(order, 'delivered');
      const after = await admin('get', `/api/orders/${order.id}/invoice`).buffer().parse(binary).expect(200);
      assert.match(after.headers['content-disposition'], new RegExp(`facture-F${year}-00001\\.pdf`));
    });

    it('keeps invoices to admins who manage orders', async () => {
      const Admin = require('../models/Admin');
      await Admin.create({
        username: 'catalogue', email: 'catalogue@example.com', password: 'admin-password',
        firstName: 'A', lastName: 'B', role: 'admin', permissions: ['products'], isActive: true
      });
      const catalogue = (await request(app).post('/api/auth/login').send({ username: 'catalogue', password: 'admin-password' })).body.token;
      const order = await placeOrder();
      await admin('get', `/api/orders/${order.id}/invoice`, catalogue).expect(403);
      await request(app).get(`/api/orders/${order.id}/invoice`).expect(401);
    });

    it('lets customers download their own invoices only', async () => {
      const sami = await registerCustomer(app);
      const leila = await registerCustomer(app, { email: 'leila@example.com' });
      const order = await placeOrder({}, sami.token);

      const own = await request(app).get(`/api/customer-orders/${order.id}/invoice`)
        .set('Authorization', `Bearer ${sami.token}`).buffer().parse(binary).expect(200);
      assert.equal(own.headers['content-type'], 'application/pdf');
      await request(app).get(`/api/customer-orders/${order.id}/invoice`).set('Authorization', `Bearer ${leila.token}`).expect(404);
      await request(app).get(`/api/customer-orders/not-an-id/invoice`).set('Authorization', `Bearer ${sami.token}`).expect(404);
    });

    it('lets guests download with their tracking code and email together', async () => {
      const order = await placeOrder();
      const res = await request(app).post('/api/tracking/invoice')
        .send({ trackingCode: order.trackingCode.toLowerCase(), email: 'GUEST@example.com' })
        .buffer().parse(binary).expect(200);
      assert.equal(res.headers['content-type'], 'application/pdf');

      await request(app).post('/api/tracking/invoice').send({ trackingCode: order.trackingCode, email: 'someone@example.com' }).expect(404);
      await request(app).post('/api/tracking/invoice').send({ trackingCode: order.trackingCode }).expect(400);
    });
  });

  describe('contents', () => {
    it('shows amounts before VAT, the VAT on everything but the stamp, and the stamp', async () => {
      const { invoiceFigures } = require('../services/invoiceService');
      const figures = invoiceFigures({
        items: [{ name: 'Filtre', quantity: 2, price: 119 }],
        pricing: { subtotal: 238, discountAmount: 23.8, discountCode: 'DIX', shippingCost: 7, paymentFee: 5, stampDuty: 1, taxRate: 0.19, taxIncluded: true, totalAmount: 227.2 }
      });
      assert.deepEqual(figures.lines.map(line => [line.label, line.quantity, line.unit, line.total]), [
        ['Filtre', 2, 100, 200],
        ['Remise (code DIX)', 1, -20, -20],
        ['Livraison', 1, 5.882, 5.882],
        ['Frais de paiement à la livraison', 1, 4.202, 4.202]
      ]);
      assert.equal(figures.totalTtc, 226.2);
      assert.equal(figures.vat, 36.116);
      assert.equal(figures.totalHt, 190.084);
      assert.equal(figures.stampDuty, 1);
      assert.equal(figures.netToPay, 227.2);
    });

    it('keeps VAT as it was charged on orders from before prices included it', () => {
      const { invoiceFigures } = require('../services/invoiceService');
      const figures = invoiceFigures({
        items: [{ name: 'Filtre', quantity: 1, price: 100 }],
        // As stored: the taxIncluded default (false) is filled in on load
        pricing: { subtotal: 100, shippingCost: 7, taxAmount: 19, taxRate: 0.19, taxIncluded: false, totalAmount: 126 }
      });
      assert.equal(figures.lines[0].unit, 100);
      assert.equal(figures.vat, 19);
      assert.equal(figures.totalHt, 107);
      assert.equal(figures.netToPay, 126);
    });

    it('writes the amount in words', () => {
      const { dinarsInWords } = require('../utils/frenchNumbers');
      assert.equal(dinarsInWords(227.2), 'deux cent vingt-sept dinars et deux cents millimes');
      assert.equal(dinarsInWords(1), 'un dinar');
      assert.equal(dinarsInWords(1080), 'mille quatre-vingts dinars');
      assert.equal(dinarsInWords(71.001), 'soixante et onze dinars et un millime');
    });

    it('prints a business customer\'s company and matricule fiscal, which must be valid', async () => {
      const order = await placeOrder({ customer: { firstName: 'Sami', lastName: 'Ben Ali', email: 'pro@example.com', phone: '+21612345678', company: 'Piscines du Sahel', taxId: '1234567a/a/m/000' } });
      const saved = (await admin('get', `/api/orders/${order.id}`).expect(200)).body.customer;
      assert.equal(saved.company, 'Piscines du Sahel');
      assert.equal(saved.taxId, '1234567A/A/M/000');

      const product = await createProduct();
      const res = await request(app).post('/api/orders').send(orderPayload([{ productId: product._id, quantity: 1 }], {
        customer: { firstName: 'Sami', lastName: 'B', email: 'pro@example.com', phone: '+21612345678', taxId: '12AB' }
      })).expect(400);
      assert.match(res.body.errors[0].msg, /Matricule fiscal invalide/);
    });

    it('takes the shop\'s legal details from Settings, checking the matricule fiscal', async () => {
      const bad = await admin('put', '/api/admin/settings').send({ invoice: { taxId: 'ABC' } }).expect(400);
      assert.match(bad.body.message, /matricule fiscal/);
      const res = await admin('put', '/api/admin/settings').send({
        invoice: { companyName: 'STES SARL', taxId: '7654321 b / a / m / 000', tradeRegister: 'B0123452026', stampDuty: 0 }
      }).expect(200);
      assert.deepEqual(res.body.settings.invoice, {
        companyName: 'STES SARL', taxId: '7654321B/A/M/000', tradeRegister: 'B0123452026', address: '', stampDuty: 0
      });

      // No stamp duty: none added to orders
      const order = await placeOrder();
      assert.equal(order.pricing.stampDuty, 0);
      assert.equal(order.totalAmount, 212);
    });
  });

  it('attaches the invoice to the "delivered" email', async () => {
    const emailService = require('../services/emailNotificationService');
    const sent = [];
    process.env.EMAIL_USER = 'shop@example.tn';
    process.env.EMAIL_PASS = 'smtp-password';
    emailService.transporter = { sendMail: async (message) => { sent.push(message); return { messageId: 'x' }; } };
    try {
      const order = await placeOrder();
      await admin('put', `/api/orders/${order.id}/status`).send({ status: 'delivered' }).expect(200);
      for (let i = 0; i < 50 && !sent.some(m => m.attachments); i++) await new Promise(r => setTimeout(r, 20));

      const email = sent.find(m => m.attachments);
      assert.ok(email, 'the delivered email has an attachment');
      assert.equal(email.attachments[0].filename, `facture-F${year}-00001.pdf`);
      assert.equal(email.attachments[0].content.subarray(0, 5).toString(), '%PDF-');
      assert.match(email.text, /Votre facture est jointe à cet email/);
    } finally {
      delete process.env.EMAIL_USER;
      delete process.env.EMAIL_PASS;
    }
  });
});
