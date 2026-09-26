import axios from 'axios';

// API client for admin pages. It always sends the admin token: the shared
// client in utils/axios.js prefers a customer token when someone is also
// signed in to the shop in the same browser.
const adminApi = axios.create({ baseURL: '/api', timeout: 15000 });

adminApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default adminApi;
