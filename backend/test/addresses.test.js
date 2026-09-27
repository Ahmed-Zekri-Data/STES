const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const {
  startDatabase, stopDatabase, clearDatabase, createApp, registerCustomer
} = require('./helpers');

describe('customer addresses', () => {
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
  const home = {
    firstName: 'Sami', lastName: 'Ben Ali', address1: '12 Rue de Marseille', city: 'Tunis', state: 'Tunis', postalCode: '1000', phone: '+216 98 765 432'
  };
  const work = { ...home, type: 'work', address1: '5 Avenue Habib Bourguiba', city: 'Sousse', state: 'Sousse', postalCode: '' };
  const add = (address) => as('post', '/api/addresses').send(address).expect(201).then(res => res.body.addresses);

  it('adds addresses; the first one is the default', async () => {
    await add(home);
    const addresses = await add(work);
    assert.equal(addresses.length, 2);
    assert.deepEqual(addresses.map(a => [a.city, a.isDefault]), [['Tunis', true], ['Sousse', false]]);
    assert.equal(addresses[0].phone, '+21698765432');
    assert.equal(addresses[1].type, 'work');
  });

  it('makes another address the default', async () => {
    await add(home);
    const [, second] = await add(work);
    const res = await as('put', `/api/addresses/${second._id}/default`).expect(200);
    assert.deepEqual(res.body.addresses.map(a => a.isDefault), [false, true]);
  });

  it('edits only the address fields', async () => {
    const [address] = await add(home);
    const res = await as('put', `/api/addresses/${address._id}`)
      .send({ address1: '14 Rue de Marseille', postalCode: '', _id: '000000000000000000000000', country: 'France' })
      .expect(200);
    const [updated] = res.body.addresses;
    assert.equal(updated._id, address._id);
    assert.equal(updated.address1, '14 Rue de Marseille');
    assert.equal(updated.postalCode, '');
    assert.equal(updated.country, 'Tunisia');
  });

  it('deletes an address, and another one becomes the default', async () => {
    const [first] = await add(home);
    await add(work);
    const res = await as('delete', `/api/addresses/${first._id}`).expect(200);
    assert.deepEqual(res.body.addresses.map(a => [a.city, a.isDefault]), [['Sousse', true]]);
  });

  it('refuses missing or invalid fields', async () => {
    const res = await as('post', '/api/addresses').send({ ...home, city: '' }).expect(400);
    assert.match(res.body.message, /ville/);
    await as('post', '/api/addresses').send({ ...home, postalCode: '10000' }).expect(400);
    await as('post', '/api/addresses').send({ ...home, phone: '123' }).expect(400);
  });

  it("does not reach another customer's addresses", async () => {
    const [address] = await add(home);
    const { token: other } = await registerCustomer(app, { email: 'leila@example.com' });
    await as('put', `/api/addresses/${address._id}`, other).send({ city: 'Sfax' }).expect(404);
    await as('delete', `/api/addresses/${address._id}`, other).expect(404);
    await as('delete', '/api/addresses/not-an-id').expect(400);
    await request(app).get('/api/addresses').expect(401);
  });

  it('keeps at most 10 addresses', async () => {
    for (let i = 0; i < 10; i++) await add({ ...home, address1: `${i} Rue de Marseille` });
    const res = await as('post', '/api/addresses').send(home).expect(400);
    assert.match(res.body.message, /10 adresses/);
  });
});
