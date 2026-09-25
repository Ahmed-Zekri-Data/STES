// Shared setup for the API tests. Environment variables are set before the
// app is required, because some modules read them at load time.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.CUSTOMER_JWT_SECRET = '';

const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server-core');

let mongod;

const startDatabase = async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
};

const stopDatabase = async () => {
  await mongoose.disconnect();
  await mongod.stop();
};

const clearDatabase = async () => {
  const collections = await mongoose.connection.db.collections();
  await Promise.all(collections.map(collection => collection.deleteMany({})));
};

const createApp = () => require('../app')();

const createProduct = (overrides = {}) => {
  const Product = require('../models/Product');
  const stockQuantity = overrides.stockQuantity ?? 10;
  return Product.create({
    name: 'Filtre à sable',
    description: 'Test product',
    price: 100,
    category: 'filters',
    inStock: stockQuantity > 0,
    stockQuantity,
    ...overrides
  });
};

const productStock = async (productId) => {
  const Product = require('../models/Product');
  return (await Product.findById(productId).lean()).stockQuantity;
};

// Creates an admin and returns a token for it.
const adminToken = async (app) => {
  const Admin = require('../models/Admin');
  await Admin.create({
    username: 'admin',
    email: 'admin@example.com',
    password: 'admin-password',
    firstName: 'Admin',
    lastName: 'Test',
    role: 'super_admin',
    isActive: true
  });
  const res = await request(app)
    .post('/api/auth/login')
    .send({ username: 'admin', password: 'admin-password' })
    .expect(200);
  return res.body.token;
};

// Registers a customer and returns { token, customer }.
const registerCustomer = async (app, overrides = {}) => {
  const res = await request(app)
    .post('/api/customers/register')
    .send({
      email: 'sami@example.com',
      password: 'secret123',
      firstName: 'Sami',
      lastName: 'Ben Ali',
      ...overrides
    })
    .expect(201);
  return res.body;
};

const orderPayload = (items, extra = {}) => ({
  customer: {
    firstName: 'Sami',
    lastName: 'Ben Ali',
    email: 'guest@example.com',
    phone: '+21612345678'
  },
  shipping: { address: '1 Rue de Carthage', city: 'Tunis' },
  items,
  payment: { method: 'cash_on_delivery' },
  ...extra
});

module.exports = {
  startDatabase,
  stopDatabase,
  clearDatabase,
  createApp,
  createProduct,
  productStock,
  adminToken,
  registerCustomer,
  orderPayload
};
