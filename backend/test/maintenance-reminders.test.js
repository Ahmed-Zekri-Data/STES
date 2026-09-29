const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { startDatabase, stopDatabase, clearDatabase, createApp, adminToken, createProduct } = require('./helpers');
const MaintenanceSubscriber = require('../models/MaintenanceSubscriber');
const { DEFAULT_CALENDAR } = require('../config/maintenanceCalendar');

describe('pool care reminders', () => {
  let app;
  let token;
  let emailService;
  let maintenance;
  let sent;

  before(async () => {
    await startDatabase();
    emailService = require('../services/emailNotificationService');
    maintenance = require('../services/maintenanceService');
  });
  after(stopDatabase);
  beforeEach(async () => {
    await clearDatabase();
    // A new app each time: sign-ups are rate limited per visitor
    app = createApp();
    token = await adminToken(app);
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
  const signUp = (body = {}) => request(app).post('/api/maintenance/subscribe').send({
    firstName: 'Sami', email: 'sami@example.com', volume: 55, consent: true, ...body
  });
  const saveCalendar = (calendar) => request(app).put('/api/admin/settings').set('Authorization', `Bearer ${token}`).send({ reminders: { calendar } });
  const tokenFrom = (message) => message.text.match(/token=([\w.]+)/)[1];
  // Noon in Tunis on the given day
  const on = (date) => new Date(`${date}T11:00:00Z`);

  it('finds the reminders due on a day, for 30 days after their date', () => {
    const calendar = DEFAULT_CALENDAR;
    assert.deepEqual(maintenance.dueReminders(calendar, on('2027-04-01')).map(r => [r.key, r.year]), [['opening', 2027]]);
    assert.deepEqual(maintenance.dueReminders(calendar, on('2027-04-30')).map(r => r.key), ['opening']);
    assert.deepEqual(maintenance.dueReminders(calendar, on('2027-05-01')).map(r => r.key), []);
    assert.deepEqual(maintenance.dueReminders(calendar, on('2027-03-31')).map(r => r.key), []);
    // A reminder late in December is still due in January, for last year
    const december = [{ ...calendar[0], key: 'check', month: 12, day: 20 }];
    assert.deepEqual(maintenance.dueReminders(december, on('2028-01-05')).map(r => [r.key, r.year]), [['check', 2027]]);
    // Turned off: never due
    assert.deepEqual(maintenance.dueReminders([{ ...calendar[1], active: false }], on('2027-04-02')), []);
    assert.equal(maintenance.nextReminder(calendar, on('2027-04-01')).reminder.key, 'season');
    assert.equal(maintenance.nextReminder(calendar, on('2027-12-01')).date.toISOString().slice(0, 10), '2028-02-15');
  });

  it('shows the calendar, with the products and dates the shop chooses', async () => {
    let body = (await request(app).get('/api/maintenance/calendar').expect(200)).body;
    assert.deepEqual(body.reminders.map(r => r.key), ['check', 'opening', 'season', 'summer', 'heat', 'autumn', 'winter']);

    const shock = await createProduct({ name: 'Chlore choc 5 kg', price: 89 });
    const calendar = DEFAULT_CALENDAR.map(r => (r.key === 'opening'
      ? { ...r, month: 3, day: 20, products: [String(shock._id)] }
      : r.key === 'check' ? { ...r, active: false } : r));
    await saveCalendar(calendar).expect(200);

    body = (await request(app).get('/api/maintenance/calendar').expect(200)).body;
    assert.equal(body.reminders[0].key, 'opening');
    assert.deepEqual([body.reminders[0].month, body.reminders[0].day], [3, 20]);
    assert.deepEqual(body.reminders[0].products.map(p => [p.name, p.price]), [['Chlore choc 5 kg', 89]]);
    assert.ok(!body.reminders.some(r => r.key === 'check'));

    assert.equal((await saveCalendar([{ ...DEFAULT_CALENDAR[0], day: 30 }]).expect(400)).body.message, 'The day of each reminder must be between 1 and 28');
    assert.equal((await saveCalendar([{ ...DEFAULT_CALENDAR[0], key: 'party' }]).expect(400)).body.message, 'Unknown reminder');
  });

  it('signs people up with their consent, and a WhatsApp number when they want WhatsApp', async () => {
    assert.equal((await signUp({ consent: false }).expect(400)).body.message, 'Cochez la case pour accepter de recevoir les rappels');
    assert.equal((await signUp({ whatsapp: true }).expect(400)).body.message, 'Indiquez votre numéro WhatsApp');
    assert.equal((await signUp({ whatsapp: true, phone: '12' }).expect(400)).body.message, 'Indiquez un numéro WhatsApp valide, par exemple 98 765 432');

    await signUp({ whatsapp: true, phone: '98 765 432' }).expect(201);
    const subscriber = await MaintenanceSubscriber.findOne({ email: 'sami@example.com' }).lean();
    assert.equal(subscriber.phone, '+21698765432');
    assert.deepEqual(subscriber.channels, { email: true, whatsapp: true });
    assert.equal(subscriber.volume, 55);

    await waitForEmails(1);
    assert.equal(sent[0].to, 'sami@example.com');
    assert.equal(sent[0].subject, 'Vos rappels d’entretien sont activés');
    assert.match(sent[0].text, /Votre piscine : 55 m³/);
    assert.match(sent[0].headers['List-Unsubscribe'], /\/entretien\/mes-rappels\?token=/);

    // Signing up again changes nothing, and says so by email only
    await signUp({ whatsapp: true, phone: '22 111 333', volume: 10 }).expect(201);
    await waitForEmails(2);
    assert.equal(sent[1].subject, 'Vos rappels d’entretien STES Piscines');
    const again = await MaintenanceSubscriber.findOne({ email: 'sami@example.com' }).lean();
    assert.equal(again.phone, '+21698765432');
    assert.equal(again.volume, 55);
  });

  it('lets the link in the emails change or stop the reminders, and nothing else', async () => {
    await signUp().expect(201);
    await waitForEmails(1);
    const link = `/api/maintenance/subscription/${tokenFrom(sent[0])}`;

    const mine = (await request(app).get(link).expect(200)).body;
    assert.deepEqual(mine, { firstName: 'Sami', email: 'sami@example.com', phone: '', volume: 55, channels: { email: true, whatsapp: false } });

    const forged = link.replace(/.$/, c => (c === '0' ? '1' : '0'));
    await request(app).get(forged).expect(404);

    await request(app).put(link).send({ channels: { email: false } }).expect(400);
    const updated = (await request(app).put(link).send({ volume: 42, phone: '98765432', channels: { whatsapp: true } }).expect(200)).body.subscription;
    assert.deepEqual([updated.volume, updated.phone, updated.channels.whatsapp], [42, '+21698765432', true]);

    await request(app).delete(link).expect(200);
    assert.equal(await MaintenanceSubscriber.countDocuments(), 0);
    await request(app).get(link).expect(404);
  });

  it('emails each due reminder once, with its products, and tries again after a failure', async () => {
    const shock = await createProduct({ name: 'Chlore choc 5 kg', price: 89 });
    await saveCalendar(DEFAULT_CALENDAR.map(r => (r.key === 'opening' ? { ...r, products: [String(shock._id)] } : r))).expect(200);
    await signUp().expect(201);
    await signUp({ firstName: 'Nour', email: 'nour@example.com', volume: undefined }).expect(201);
    await waitForEmails(2);
    sent = [];

    assert.deepEqual(await maintenance.sendDueEmails(on('2027-03-25')), { sent: 0, failed: 0 });
    assert.deepEqual(await maintenance.sendDueEmails(on('2027-04-03')), { sent: 2, failed: 0 });
    const sami = sent.find(m => m.to === 'sami@example.com');
    assert.equal(sami.subject, 'Remise en route de votre piscine · STES Piscines');
    assert.match(sami.text, /Pour vos 55 m³ d’eau/);
    assert.match(sami.text, new RegExp(`Chlore choc 5 kg \\(89\\.000 TND\\) : .*/product/${shock._id}`));
    assert.doesNotMatch(sent.find(m => m.to === 'nour@example.com').text, /m³/);

    // Already sent this year
    assert.deepEqual(await maintenance.sendDueEmails(on('2027-04-10')), { sent: 0, failed: 0 });

    // A failed email is tried again the next day
    emailService.transporter = { sendMail: async () => { throw new Error('SMTP down'); } };
    assert.deepEqual(await maintenance.sendDueEmails(on('2027-05-15')), { sent: 0, failed: 2 });
    emailService.transporter = { sendMail: async (message) => { sent.push(message); return { messageId: 'x' }; } };
    assert.deepEqual(await maintenance.sendDueEmails(on('2027-05-16')), { sent: 2, failed: 0 });

    // Emails turned off: nothing is sent and nothing is marked
    delete process.env.EMAIL_PASS;
    assert.equal((await maintenance.sendDueEmails(on('2027-07-02'))).reason, 'email_not_configured');
    const marks = (await MaintenanceSubscriber.findOne({ email: 'sami@example.com' }).lean()).sent.map(s => `${s.key}/${s.year}/${s.channel}`);
    assert.deepEqual(marks, ['opening/2027/email', 'season/2027/email']);
  });

  it('lists the WhatsApp reminders for an admin to send, until they are marked sent', async () => {
    await signUp({ whatsapp: true, phone: '98765432' }).expect(201);
    await signUp({ firstName: 'Nour', email: 'nour@example.com' }).expect(201);
    const now = on('2027-07-05');

    const queue = await maintenance.whatsappQueue(now);
    assert.deepEqual(queue.map(q => [q.key, q.year, q.people.map(p => p.firstName)]), [['summer', 2027, ['Sami']]]);
    const link = new URL(queue[0].people[0].link);
    assert.equal(`${link.origin}${link.pathname}`, 'https://wa.me/21698765432');
    const text = link.searchParams.get('text');
    assert.match(text, /^Bonjour Sami, ici STES Piscines\./);
    assert.match(text, /\*Plein été : filtre et ligne d’eau\*/);
    assert.match(text, /mes-rappels\?token=/);

    const id = queue[0].people[0]._id;
    await request(app).post(`/api/admin/maintenance/${id}/sent`).set('Authorization', `Bearer ${token}`).send({ key: 'summer', year: 2027 }).expect(200);
    assert.deepEqual(await maintenance.whatsappQueue(now), []);

    const list = (await request(app).get('/api/admin/maintenance').set('Authorization', `Bearer ${token}`).expect(200)).body;
    assert.equal(list.total, 2);
    assert.deepEqual(list.subscribers.map(s => s.firstName).sort(), ['Nour', 'Sami']);
    await request(app).get('/api/admin/maintenance').expect(401);

    await request(app).delete(`/api/admin/maintenance/${id}`).set('Authorization', `Bearer ${token}`).expect(200);
    assert.equal(await MaintenanceSubscriber.countDocuments(), 1);
  });

  it('tells the admin when emails are not set up yet', async () => {
    delete process.env.EMAIL_PASS;
    const res = await request(app).post('/api/admin/maintenance/send-now').set('Authorization', `Bearer ${token}`).expect(409);
    assert.equal(res.body.message, 'Emails are not set up yet (EMAIL_USER / EMAIL_PASS in .env)');
  });
});
