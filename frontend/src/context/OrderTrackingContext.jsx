import React, { createContext, useContext, useState } from 'react';
import axios from 'axios';

const OrderTrackingContext = createContext();

export const useOrderTracking = () => {
  const context = useContext(OrderTrackingContext);
  if (!context) {
    throw new Error('useOrderTracking must be used within an OrderTrackingProvider');
  }
  return context;
};

export const OrderTrackingProvider = ({ children }) => {
  const [loading, setLoading] = useState(false);
  const [trackingData, setTrackingData] = useState(null);
  const [searchResults, setSearchResults] = useState(null);

  // Track order by order number or tracking code (public)
  const trackOrder = async (identifier) => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/tracking/${identifier}`);
      setTrackingData(response.data);
      return { success: true, data: response.data };
    } catch (error) {
      const message = error.response?.data?.message || 'Erreur lors du suivi de la commande';
      setTrackingData(null);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  // Search orders by email (for guest users)
  const searchOrdersByEmail = async (email, orderNumber = null) => {
    setLoading(true);
    try {
      const payload = { email };
      if (orderNumber) payload.orderNumber = orderNumber;
      
      const response = await axios.post('/api/tracking/search', payload);
      setSearchResults(response.data);
      return { success: true, data: response.data };
    } catch (error) {
      const message = error.response?.data?.message || 'Erreur lors de la recherche';
      setSearchResults(null);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  // Get customer orders with tracking (authenticated)
  const getCustomerOrdersWithTracking = async (page = 1, limit = 10, status = 'all') => {
    setLoading(true);
    try {
      const response = await axios.get('/api/tracking/customer/orders', {
        params: { page, limit, status }
      });
      return { success: true, data: response.data };
    } catch (error) {
      const message = error.response?.data?.message || 'Erreur lors de la récupération des commandes';
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  // Get customer tracking statistics (authenticated)
  const getCustomerTrackingStats = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/tracking/customer/stats');
      return { success: true, data: response.data };
    } catch (error) {
      const message = error.response?.data?.message || 'Erreur lors de la récupération des statistiques';
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  // Subscribe to order notifications (authenticated)
  const subscribeToOrderUpdates = async (orderId, notifications) => {
    setLoading(true);
    try {
      const response = await axios.post(`/api/tracking/${orderId}/subscribe`, {
        notifications
      });
      return { success: true, data: response.data };
    } catch (error) {
      const message = error.response?.data?.message || 'Erreur lors de la configuration des notifications';
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  // Clear tracking data
  const clearTrackingData = () => {
    setTrackingData(null);
    setSearchResults(null);
  };

  // Get status color for UI
  const getStatusColor = (status) => {
    const colors = {
      pending: 'yellow',
      confirmed: 'blue',
      processing: 'purple',
      shipped: 'indigo',
      delivered: 'green',
      cancelled: 'red'
    };
    return colors[status] || 'gray';
  };

  // Get status icon for UI
  const getStatusIcon = (status) => {
    const icons = {
      pending: '⏳',
      confirmed: '✅',
      processing: '🔄',
      shipped: '🚚',
      delivered: '📦',
      cancelled: '❌'
    };
    return icons[status] || '📋';
  };

  // Calculate delivery status
  const getDeliveryStatus = (order) => {
    if (!order) return null;

    const now = new Date();
    const estimated = new Date(order.estimatedDelivery);
    const actual = order.actualDelivery ? new Date(order.actualDelivery) : null;

    if (actual) {
      const wasOnTime = actual <= estimated;
      return {
        type: 'delivered',
        onTime: wasOnTime,
        message: wasOnTime ? 'Livré à temps' : 'Livré en retard'
      };
    }

    if (order.status === 'cancelled') {
      return {
        type: 'cancelled',
        message: 'Commande annulée'
      };
    }

    if (now > estimated && !['delivered', 'cancelled'].includes(order.status)) {
      const daysLate = Math.ceil((now - estimated) / (1000 * 60 * 60 * 24));
      return {
        type: 'delayed',
        daysLate,
        message: `En retard de ${daysLate} jour${daysLate > 1 ? 's' : ''}`
      };
    }

    const daysRemaining = Math.ceil((estimated - now) / (1000 * 60 * 60 * 24));
    if (daysRemaining <= 1) {
      return {
        type: 'arriving',
        message: 'Livraison prévue aujourd\'hui'
      };
    }

    return {
      type: 'on_track',
      daysRemaining,
      message: `Livraison prévue dans ${daysRemaining} jour${daysRemaining > 1 ? 's' : ''}`
    };
  };

  // Format tracking timeline for display
  const formatTimelineForDisplay = (timeline) => {
    if (!timeline) return [];

    return timeline.map((step, index) => ({
      ...step,
      isLast: index === timeline.length - 1,
      isFirst: index === 0,
      color: getStatusColor(step.status),
      icon: getStatusIcon(step.status),
      formattedDate: step.timestamp ? 
        new Date(step.timestamp).toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }) : null
    }));
  };

  const value = {
    loading,
    trackingData,
    searchResults,
    trackOrder,
    searchOrdersByEmail,
    getCustomerOrdersWithTracking,
    getCustomerTrackingStats,
    subscribeToOrderUpdates,
    clearTrackingData,
    getStatusColor,
    getStatusIcon,
    getDeliveryStatus,
    formatTimelineForDisplay
  };

  return (
    <OrderTrackingContext.Provider value={value}>
      {children}
    </OrderTrackingContext.Provider>
  );
};
