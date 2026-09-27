const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const {
  startDatabase, stopDatabase, clearDatabase, createApp, registerCustomer
} = require('./helpers');

describe('marking notifications as read', () => {
  let app;
  let NotificationLog;
  let sami;
  let leila;

  before(async () => {
    await startDatabase();
    app = createApp();
    ({ NotificationLog } = require('../models/Notification'));
  });
  after(stopDatabase);
  beforeEach(async () => {
    await clearDatabase();
    sami = await registerCustomer(app);
    leila = await registerCustomer(app, { email: 'leila@example.com', firstName: 'Leila' });
  });

  const notify = (customer, title) => NotificationLog.create({
    customer: customer.customer.id, type: 'push', category: 'order_update', title, message: 'Votre commande avance', status: 'sent'
  });
  const as = (customer, method, path) => request(app)[method](path).set('Authorization', `Bearer ${customer.token}`);
  const statuses = async (customer) => (await as(customer, 'get', '/api/notifications/history').expect(200))
    .body.notifications.map(n => [n.title, n.status]).sort();

  it('marks one notification as read, and it stays read', async () => {
    const shipped = await notify(sami, 'Expédiée');
    await notify(sami, 'Confirmée');

    const res = await as(sami, 'put', `/api/notifications/${shipped._id}/read`).expect(200);
    assert.equal(res.body.notification.status, 'read');
    assert.ok(res.body.notification.readAt);
    assert.deepEqual(await statuses(sami), [['Confirmée', 'sent'], ['Expédiée', 'read']]);

    // Marking again keeps the first read time
    const again = await as(sami, 'put', `/api/notifications/${shipped._id}/read`).expect(200);
    assert.equal(again.body.notification.readAt, res.body.notification.readAt);
  });

  it("does not touch another customer's notification", async () => {
    const hers = await notify(leila, 'Livrée');
    await as(sami, 'put', `/api/notifications/${hers._id}/read`).expect(404);
    assert.deepEqual(await statuses(leila), [['Livrée', 'sent']]);
    await as(sami, 'put', '/api/notifications/not-an-id/read').expect(400);
    await request(app).put(`/api/notifications/${hers._id}/read`).expect(401);
  });

  it("marks all of the customer's notifications as read, and only theirs", async () => {
    await notify(sami, 'Expédiée');
    await notify(sami, 'Confirmée');
    await notify(leila, 'Livrée');

    const res = await as(sami, 'put', '/api/notifications/read-all').expect(200);
    assert.equal(res.body.updated, 2);
    assert.deepEqual(await statuses(sami), [['Confirmée', 'read'], ['Expédiée', 'read']]);
    assert.deepEqual(await statuses(leila), [['Livrée', 'sent']]);
  });
});
