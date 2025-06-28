import axios from 'axios';

// Create axios instance for customer API calls
const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

// Request interceptor to add customer auth token
api.interceptors.request.use(
  (config) => {
    // Try to get customer token first, then admin token as fallback
    const customerToken = localStorage.getItem('customerToken');
    const adminToken = localStorage.getItem('adminToken');
    
    const token = customerToken || adminToken;
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      const customerToken = localStorage.getItem('customerToken');
      const adminToken = localStorage.getItem('adminToken');
      
      if (customerToken) {
        // Customer token is invalid
        localStorage.removeItem('customerToken');
        // Don't redirect automatically for customer, let the component handle it
        console.warn('Customer token expired');
      } else if (adminToken) {
        // Admin token is invalid
        localStorage.removeItem('adminToken');
        window.location.href = '/admin/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
