import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, 
  X, 
  Package, 
  Truck, 
  CheckCircle, 
  AlertCircle,
  Gift,
  Mail,
  Clock,
  Eye
} from 'lucide-react';
import notificationService from '../../services/notificationService';

const InAppNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadNotifications();
    
    // Listen for notification clicks from service worker
    const handleNotificationClick = (event) => {
      const { url, data } = event.detail;
      console.log('Notification clicked:', { url, data });
      // Handle navigation or other actions
    };

    window.addEventListener('notificationClick', handleNotificationClick);
    return () => window.removeEventListener('notificationClick', handleNotificationClick);
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const response = await notificationService.getHistory({ 
        limit: 20,
        type: 'push' // Focus on push notifications for in-app display
      });
      
      setNotifications(response.notifications || []);
      
      // Count unread notifications
      const unread = response.notifications?.filter(n => n.status !== 'read').length || 0;
      setUnreadCount(unread);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      // Update local state immediately
      setNotifications(prev => 
        prev.map(n => 
          n._id === notificationId ? { ...n, status: 'read', readAt: new Date() } : n
        )
      );
      
      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      // TODO: Call API to mark as read on server
      // await api.patch(`/notifications/${notificationId}/read`);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const getNotificationIcon = (category) => {
    switch (category) {
      case 'order_update':
        return Package;
      case 'delivery':
        return Truck;
      case 'promotion':
        return Gift;
      case 'newsletter':
        return Mail;
      default:
        return Bell;
    }
  };

  const getNotificationColor = (category) => {
    switch (category) {
      case 'order_update':
        return 'text-blue-600 bg-blue-100';
      case 'delivery':
        return 'text-green-600 bg-green-100';
      case 'promotion':
        return 'text-purple-600 bg-purple-100';
      case 'newsletter':
        return 'text-orange-600 bg-orange-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const formatTime = (date) => {
    const now = new Date();
    const notificationDate = new Date(date);
    const diffInMinutes = Math.floor((now - notificationDate) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'À l\'instant';
    if (diffInMinutes < 60) return `Il y a ${diffInMinutes}m`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `Il y a ${diffInHours}h`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `Il y a ${diffInDays}j`;
    
    return notificationDate.toLocaleDateString('fr-FR');
  };

  return (
    <div className="relative">
      {/* Notification Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </button>

      {/* Notifications Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            
            {/* Dropdown Panel */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50"
            >
              {/* Header */}
              <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Notifications List */}
              <div className="max-h-96 overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>Aucune notification</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {notifications.map((notification) => {
                      const IconComponent = getNotificationIcon(notification.category);
                      const isUnread = notification.status !== 'read';
                      
                      return (
                        <motion.div
                          key={notification._id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                            isUnread ? 'bg-blue-50' : ''
                          }`}
                          onClick={() => {
                            if (isUnread) {
                              markAsRead(notification._id);
                            }
                            // Handle notification click action
                            if (notification.order) {
                              // Navigate to order details or tracking
                              window.location.href = `/track-order?order=${notification.order.orderNumber}`;
                            }
                          }}
                        >
                          <div className="flex items-start space-x-3">
                            {/* Icon */}
                            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${getNotificationColor(notification.category)}`}>
                              <IconComponent className="w-4 h-4" />
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <p className={`text-sm font-medium ${isUnread ? 'text-gray-900' : 'text-gray-700'}`}>
                                  {notification.title}
                                </p>
                                {isUnread && (
                                  <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0"></div>
                                )}
                              </div>
                              
                              <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                {notification.message}
                              </p>
                              
                              <div className="flex items-center justify-between mt-2">
                                <span className="text-xs text-gray-500">
                                  {formatTime(notification.createdAt)}
                                </span>
                                
                                {notification.order && (
                                  <span className="text-xs text-blue-600 font-medium">
                                    {notification.order.orderNumber}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer */}
              {notifications.length > 0 && (
                <div className="px-4 py-3 border-t border-gray-200">
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      // Navigate to full notifications page
                      window.location.href = '/account?tab=notifications';
                    }}
                    className="w-full text-center text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
                  >
                    Voir toutes les notifications
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default InAppNotifications;
