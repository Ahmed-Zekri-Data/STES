import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { useCustomer } from './CustomerContext';

const WishlistContext = createContext();

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};

export const WishlistProvider = ({ children }) => {
  const { isAuthenticated, customer } = useCustomer();
  const [wishlist, setWishlist] = useState(null);
  const [loading, setLoading] = useState(false);

  // Load wishlist when customer is authenticated
  useEffect(() => {
    if (isAuthenticated && customer) {
      loadWishlist();
    } else {
      setWishlist(null);
    }
  }, [isAuthenticated, customer]);

  const loadWishlist = async () => {
    if (!isAuthenticated) return;
    
    setLoading(true);
    try {
      const response = await axios.get('/api/wishlist');
      setWishlist(response.data.wishlist);
    } catch (error) {
      console.error('Error loading wishlist:', error);
      setWishlist({ items: [], itemsCount: 0 });
    } finally {
      setLoading(false);
    }
  };

  const addToWishlist = async (productId) => {
    if (!isAuthenticated) {
      throw new Error('Please login to add items to wishlist');
    }

    try {
      const response = await axios.post('/api/wishlist/items', { productId });
      setWishlist(response.data.wishlist);
      return { success: true, message: 'Product added to wishlist' };
    } catch (error) {
      const message = error.response?.data?.message || 'Error adding to wishlist';
      throw new Error(message);
    }
  };

  const removeFromWishlist = async (productId) => {
    if (!isAuthenticated) {
      throw new Error('Please login to manage wishlist');
    }

    try {
      const response = await axios.delete(`/api/wishlist/items/${productId}`);
      setWishlist(response.data.wishlist);
      return { success: true, message: 'Product removed from wishlist' };
    } catch (error) {
      const message = error.response?.data?.message || 'Error removing from wishlist';
      throw new Error(message);
    }
  };

  const isInWishlist = (productId) => {
    if (!wishlist || !wishlist.items) return false;
    return wishlist.items.some(item => item.product._id === productId || item.product === productId);
  };

  const toggleWishlist = async (productId) => {
    if (isInWishlist(productId)) {
      return await removeFromWishlist(productId);
    } else {
      return await addToWishlist(productId);
    }
  };

  const clearWishlist = async () => {
    if (!isAuthenticated) {
      throw new Error('Please login to manage wishlist');
    }

    try {
      const response = await axios.delete('/api/wishlist');
      setWishlist(response.data.wishlist);
      return { success: true, message: 'Wishlist cleared successfully' };
    } catch (error) {
      const message = error.response?.data?.message || 'Error clearing wishlist';
      throw new Error(message);
    }
  };

  const updateWishlistSettings = async (settings) => {
    if (!isAuthenticated) {
      throw new Error('Please login to manage wishlist');
    }

    try {
      const response = await axios.put('/api/wishlist/settings', settings);
      setWishlist(prev => ({
        ...prev,
        ...response.data.wishlist
      }));
      return { success: true, message: 'Wishlist settings updated' };
    } catch (error) {
      const message = error.response?.data?.message || 'Error updating wishlist settings';
      throw new Error(message);
    }
  };

  const getWishlistItemsCount = () => {
    return wishlist?.itemsCount || 0;
  };

  const getWishlistItems = () => {
    return wishlist?.items || [];
  };

  const checkProductInWishlist = async (productId) => {
    if (!isAuthenticated) return false;

    try {
      const response = await axios.post('/api/wishlist/check', { productId });
      return response.data.isInWishlist;
    } catch (error) {
      console.error('Error checking wishlist:', error);
      return false;
    }
  };

  const getPublicWishlist = async (customerId) => {
    try {
      const response = await axios.get(`/api/wishlist/public/${customerId}`);
      return response.data.wishlist;
    } catch (error) {
      const message = error.response?.data?.message || 'Error fetching public wishlist';
      throw new Error(message);
    }
  };

  const value = {
    wishlist,
    loading,
    addToWishlist,
    removeFromWishlist,
    isInWishlist,
    toggleWishlist,
    clearWishlist,
    updateWishlistSettings,
    getWishlistItemsCount,
    getWishlistItems,
    checkProductInWishlist,
    getPublicWishlist,
    loadWishlist
  };

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
};
