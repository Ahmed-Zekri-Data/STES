import axios from 'axios';

// API client for all admin pages. It sends the admin token and nothing
// else: the shop sets the customer's token as the default for plain axios
// calls, and one browser can be signed in to both.
const adminApi = axios.create({ baseURL: '/api', timeout: 15000 });

export const ADMIN_SESSION_EXPIRED = 'admin-session-expired';

adminApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// A 401 means the admin token is missing, expired or revoked. AdminContext
// listens for this and ends the session (a wrong password at login is not a
// session ending).
adminApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && error.config?.url !== '/auth/login') {
      window.dispatchEvent(new Event(ADMIN_SESSION_EXPIRED));
    }
    return Promise.reject(error);
  }
);

// The reason the server gave for refusing a request: its message, or the
// first field that failed validation
export const errorMessage = (error) =>
  error.response?.data?.message || error.response?.data?.errors?.[0]?.msg || error.message;

export default adminApi;
