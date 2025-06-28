import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const CustomerContext = createContext();

export const useCustomer = () => {
  const context = useContext(CustomerContext);
  if (!context) {
    throw new Error('useCustomer must be used within a CustomerProvider');
  }
  return context;
};

export const CustomerProvider = ({ children }) => {
  const [customer, setCustomer] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Set up axios interceptor for customer token
  useEffect(() => {
    const token = localStorage.getItem('customerToken');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }

    // Add response interceptor to handle token expiration
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401 && error.config?.url?.includes('/api/customers')) {
          logout();
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, []);

  // Check if customer is logged in on app start
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('customerToken');
      
      if (token) {
        // Verify token with backend
        const response = await axios.get('/api/customers/me');
        setCustomer(response.data.customer);
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

  const register = async (userData) => {
    try {
      const response = await axios.post('/api/customers/register', userData);
      
      const { token, customer: customerData } = response.data;
      
      localStorage.setItem('customerToken', token);
      setCustomer(customerData);
      setIsAuthenticated(true);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      return { success: true, customer: customerData, message: response.data.message };
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  const login = async (credentials) => {
    try {
      const response = await axios.post('/api/customers/login', credentials);
      
      const { token, customer: customerData } = response.data;
      
      localStorage.setItem('customerToken', token);
      setCustomer(customerData);
      setIsAuthenticated(true);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      return { success: true, customer: customerData };
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('customerToken');
    delete axios.defaults.headers.common['Authorization'];
    setCustomer(null);
    setIsAuthenticated(false);
  };

  const updateProfile = async (profileData) => {
    try {
      const response = await axios.put('/api/customers/profile', profileData);
      setCustomer(response.data.customer);
      return { success: true, customer: response.data.customer };
    } catch (error) {
      console.error('Profile update error:', error);
      throw error;
    }
  };

  const changePassword = async (passwordData) => {
    try {
      const response = await axios.put('/api/customers/change-password', passwordData);
      return { success: true, message: response.data.message };
    } catch (error) {
      console.error('Change password error:', error);
      throw error;
    }
  };

  const forgotPassword = async (email) => {
    try {
      const response = await axios.post('/api/customers/forgot-password', { email });
      return { success: true, message: response.data.message };
    } catch (error) {
      console.error('Forgot password error:', error);
      throw error;
    }
  };

  const resetPassword = async (token, password) => {
    try {
      const response = await axios.post('/api/customers/reset-password', { token, password });
      return { success: true, message: response.data.message };
    } catch (error) {
      console.error('Reset password error:', error);
      throw error;
    }
  };

  const verifyEmail = async (token) => {
    try {
      const response = await axios.post('/api/customers/verify-email', { token });
      // Refresh customer data
      await checkAuthStatus();
      return { success: true, message: response.data.message };
    } catch (error) {
      console.error('Email verification error:', error);
      throw error;
    }
  };

  // Address management
  const getAddresses = async () => {
    try {
      const response = await axios.get('/api/addresses');
      return response.data.addresses;
    } catch (error) {
      console.error('Error fetching addresses:', error);
      throw error;
    }
  };

  const addAddress = async (addressData) => {
    try {
      const response = await axios.post('/api/addresses', addressData);
      // Update customer data with new addresses
      if (customer) {
        setCustomer({ ...customer, addresses: response.data.addresses });
      }
      return { success: true, addresses: response.data.addresses };
    } catch (error) {
      console.error('Error adding address:', error);
      throw error;
    }
  };

  const updateAddress = async (addressId, addressData) => {
    try {
      const response = await axios.put(`/api/addresses/${addressId}`, addressData);
      // Update customer data with updated addresses
      if (customer) {
        setCustomer({ ...customer, addresses: response.data.addresses });
      }
      return { success: true, addresses: response.data.addresses };
    } catch (error) {
      console.error('Error updating address:', error);
      throw error;
    }
  };

  const deleteAddress = async (addressId) => {
    try {
      const response = await axios.delete(`/api/addresses/${addressId}`);
      // Update customer data with remaining addresses
      if (customer) {
        setCustomer({ ...customer, addresses: response.data.addresses });
      }
      return { success: true, addresses: response.data.addresses };
    } catch (error) {
      console.error('Error deleting address:', error);
      throw error;
    }
  };

  const setDefaultAddress = async (addressId) => {
    try {
      const response = await axios.put(`/api/addresses/${addressId}/default`);
      // Update customer data with updated addresses
      if (customer) {
        setCustomer({ ...customer, addresses: response.data.addresses });
      }
      return { success: true, addresses: response.data.addresses };
    } catch (error) {
      console.error('Error setting default address:', error);
      throw error;
    }
  };

  const value = {
    customer,
    isAuthenticated,
    loading,
    register,
    login,
    logout,
    updateProfile,
    changePassword,
    forgotPassword,
    resetPassword,
    verifyEmail,
    checkAuthStatus,
    // Address management
    getAddresses,
    addAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress
  };

  return (
    <CustomerContext.Provider value={value}>
      {children}
    </CustomerContext.Provider>
  );
};
