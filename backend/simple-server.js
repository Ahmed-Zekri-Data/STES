const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    message: 'Backend server is running (without MongoDB)'
  });
});

// Mock customer registration endpoint
app.post('/api/customers/register', (req, res) => {
  console.log('Registration attempt:', req.body);
  res.status(201).json({
    message: 'Registration successful (mock response)',
    customer: {
      id: 'mock-id-123',
      email: req.body.email,
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      fullName: `${req.body.firstName} ${req.body.lastName}`
    },
    token: 'mock-jwt-token'
  });
});

// Mock customer login endpoint
app.post('/api/customers/login', (req, res) => {
  console.log('Login attempt:', req.body);
  res.json({
    message: 'Login successful (mock response)',
    customer: {
      id: 'mock-id-123',
      email: req.body.email,
      firstName: 'Test',
      lastName: 'User',
      fullName: 'Test User'
    },
    token: 'mock-jwt-token'
  });
});

// Mock customer profile endpoint
app.get('/api/customers/me', (req, res) => {
  res.json({
    customer: {
      id: 'mock-id-123',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      fullName: 'Test User'
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Simple backend server running on port ${PORT}`);
  console.log(`📝 This is a simplified server for testing without MongoDB`);
  console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
});
