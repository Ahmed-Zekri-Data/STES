import React, { createContext, useContext, useState, useEffect } from 'react';
import adminApi, { ADMIN_SESSION_EXPIRED } from '../utils/adminApi';

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

  // Admin requests go through adminApi, which sends the admin token itself.
  // Nothing here touches the shared axios defaults: those carry the shop
  // customer's token, and one browser can be signed in to both.
  useEffect(() => {
    const onExpired = () => logout();
    window.addEventListener(ADMIN_SESSION_EXPIRED, onExpired);
    return () => window.removeEventListener(ADMIN_SESSION_EXPIRED, onExpired);
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
      const response = await adminApi.post('/auth/login', {
        username: credentials.username,
        password: credentials.password
      });

      const { token, admin } = response.data;

      // Store token and admin info
      localStorage.setItem('adminToken', token);
      localStorage.setItem('adminUser', JSON.stringify(admin));

      setAdmin(admin);
      setIsAuthenticated(true);

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
