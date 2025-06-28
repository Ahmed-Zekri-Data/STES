import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AdminContext = createContext();

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};

export const AdminProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Set up axios interceptor for admin token
  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }

    // Add response interceptor to handle token expiration
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          logout();
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, []);

  // Check if admin is logged in on app start
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const adminData = localStorage.getItem('adminUser');

      if (token && adminData) {
        // For now, use stored data (can be enhanced to verify with backend)
        const parsedAdmin = JSON.parse(adminData);
        setAdmin(parsedAdmin);
        setIsAuthenticated(true);
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Auth check error:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials) => {
    try {
      // Make API call to backend
      const response = await axios.post('/api/auth/login', {
        username: credentials.username,
        password: credentials.password
      });

      const { token, admin } = response.data;

      // Store token and admin info
      localStorage.setItem('adminToken', token);
      localStorage.setItem('adminUser', JSON.stringify(admin));

      setAdmin(admin);
      setIsAuthenticated(true);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      return { success: true, admin };
    } catch (error) {
      console.error('Login error:', error);
      const message = error.response?.data?.message || 'Login failed';
      throw new Error(message);
    }
  };

  const logout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    delete axios.defaults.headers.common['Authorization'];
    setAdmin(null);
    setIsAuthenticated(false);
  };

  const updateProfile = async (profileData) => {
    try {
      // Mock profile update
      const updatedAdmin = { ...admin, ...profileData };
      localStorage.setItem('adminUser', JSON.stringify(updatedAdmin));
      setAdmin(updatedAdmin);
      return { success: true, admin: updatedAdmin };
    } catch (error) {
      console.error('Profile update error:', error);
      throw error;
    }
  };

  const hasPermission = (permission) => {
    if (!admin) return false;
    if (admin.role === 'super_admin') return true;
    return admin.permissions?.includes(permission) || false;
  };

  const value = {
    admin,
    isAuthenticated,
    loading,
    login,
    logout,
    updateProfile,
    hasPermission,
    checkAuthStatus
  };

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  );
};
