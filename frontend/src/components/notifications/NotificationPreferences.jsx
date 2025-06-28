import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Bell,
  Mail,
  MessageSquare,
  Smartphone,
  Clock,
  Settings,
  Check,
  X,
  AlertCircle
} from 'lucide-react';
import notificationService from '../../services/notificationService';

const NotificationPreferences = () => {
  const [preferences, setPreferences] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [pushStatus, setPushStatus] = useState({ supported: false, subscribed: false });

  useEffect(() => {
    loadPreferences();
    checkPushStatus();
  }, []);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      const data = await notificationService.getPreferences();
      setPreferences(data);
    } catch (error) {
      console.error('Error loading preferences:', error);
      setError('Erreur lors du chargement des préférences');
    } finally {
      setLoading(false);
    }
  };

  const checkPushStatus = async () => {
    const status = await notificationService.getSubscriptionStatus();
    setPushStatus(status);
  };

  const handlePreferenceChange = (category, field, value) => {
    setPreferences(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value
      }
    }));
  };

  const handleQuietHoursChange = (field, value) => {
    setPreferences(prev => ({
      ...prev,
      quietHours: {
        ...prev.quietHours,
        [field]: value
      }
    }));
  };

  const savePreferences = async () => {
    try {
      setSaving(true);
      setError(null);
      await notificationService.updatePreferences(preferences);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving preferences:', error);
      setError('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handlePushSubscription = async () => {
    try {
      if (pushStatus.subscribed) {
        await notificationService.unsubscribe();
        setPushStatus(prev => ({ ...prev, subscribed: false }));
        handlePreferenceChange('push', 'enabled', false);
      } else {
        await notificationService.subscribe();
        setPushStatus(prev => ({ ...prev, subscribed: true }));
        handlePreferenceChange('push', 'enabled', true);
      }
    } catch (error) {
      console.error('Error managing push subscription:', error);
      setError(error.message);
    }
  };

  const testNotifications = async () => {
    try {
      setSaving(true);
      await notificationService.testNotifications();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Error testing notifications:', error);
      setError('Erreur lors du test des notifications');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!preferences) {
    return (
      <div className="text-center p-8">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-gray-600">Impossible de charger les préférences</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
          <div className="flex items-center">
            <Bell className="w-6 h-6 text-white mr-3" />
            <h2 className="text-xl font-semibold text-white">Préférences de Notifications</h2>
          </div>
        </div>

        <div className="p-6 space-y-8">
          {/* Success/Error Messages */}
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center"
            >
              <Check className="w-5 h-5 text-green-600 mr-3" />
              <span className="text-green-800">Préférences sauvegardées avec succès</span>
            </motion.div>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center"
            >
              <X className="w-5 h-5 text-red-600 mr-3" />
              <span className="text-red-800">{error}</span>
            </motion.div>
          )}

          {/* Email Notifications */}
          <div className="border border-gray-200 rounded-lg p-6">
            <div className="flex items-center mb-4">
              <Mail className="w-5 h-5 text-blue-600 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">Notifications Email</h3>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Activer les emails</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.email?.enabled || false}
                    onChange={(e) => handlePreferenceChange('email', 'enabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {preferences.email?.enabled && (
                <div className="ml-4 space-y-3 border-l-2 border-blue-200 pl-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Mises à jour de commandes</span>
                    <input
                      type="checkbox"
                      checked={preferences.email?.orderUpdates || false}
                      onChange={(e) => handlePreferenceChange('email', 'orderUpdates', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Confirmations de livraison</span>
                    <input
                      type="checkbox"
                      checked={preferences.email?.deliveryUpdates || false}
                      onChange={(e) => handlePreferenceChange('email', 'deliveryUpdates', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Promotions et offres</span>
                    <input
                      type="checkbox"
                      checked={preferences.email?.promotions || false}
                      onChange={(e) => handlePreferenceChange('email', 'promotions', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Newsletter</span>
                    <input
                      type="checkbox"
                      checked={preferences.email?.newsletter || false}
                      onChange={(e) => handlePreferenceChange('email', 'newsletter', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* SMS Notifications */}
          <div className="border border-gray-200 rounded-lg p-6">
            <div className="flex items-center mb-4">
              <MessageSquare className="w-5 h-5 text-green-600 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">Notifications SMS</h3>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Activer les SMS</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.sms?.enabled || false}
                    onChange={(e) => handlePreferenceChange('sms', 'enabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                </label>
              </div>

              {preferences.sms?.enabled && (
                <div className="ml-4 space-y-3 border-l-2 border-green-200 pl-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Mises à jour de commandes</span>
                    <input
                      type="checkbox"
                      checked={preferences.sms?.orderUpdates || false}
                      onChange={(e) => handlePreferenceChange('sms', 'orderUpdates', e.target.checked)}
                      className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Confirmations de livraison</span>
                    <input
                      type="checkbox"
                      checked={preferences.sms?.deliveryUpdates || false}
                      onChange={(e) => handlePreferenceChange('sms', 'deliveryUpdates', e.target.checked)}
                      className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Notifications urgentes uniquement</span>
                    <input
                      type="checkbox"
                      checked={preferences.sms?.urgentOnly || false}
                      onChange={(e) => handlePreferenceChange('sms', 'urgentOnly', e.target.checked)}
                      className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Push Notifications */}
          <div className="border border-gray-200 rounded-lg p-6">
            <div className="flex items-center mb-4">
              <Smartphone className="w-5 h-5 text-purple-600 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">Notifications Push</h3>
              {!pushStatus.supported && (
                <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                  Non supporté
                </span>
              )}
            </div>
            
            {pushStatus.supported ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Activer les notifications push</span>
                  <button
                    onClick={handlePushSubscription}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      pushStatus.subscribed
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                    }`}
                  >
                    {pushStatus.subscribed ? 'Se désabonner' : 'S\'abonner'}
                  </button>
                </div>

                {preferences.push?.enabled && (
                  <div className="ml-4 space-y-3 border-l-2 border-purple-200 pl-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Mises à jour de commandes</span>
                      <input
                        type="checkbox"
                        checked={preferences.push?.orderUpdates || false}
                        onChange={(e) => handlePreferenceChange('push', 'orderUpdates', e.target.checked)}
                        className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Confirmations de livraison</span>
                      <input
                        type="checkbox"
                        checked={preferences.push?.deliveryUpdates || false}
                        onChange={(e) => handlePreferenceChange('push', 'deliveryUpdates', e.target.checked)}
                        className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Promotions et offres</span>
                      <input
                        type="checkbox"
                        checked={preferences.push?.promotions || false}
                        onChange={(e) => handlePreferenceChange('push', 'promotions', e.target.checked)}
                        className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">
                Les notifications push ne sont pas supportées par votre navigateur.
              </p>
            )}
          </div>

          {/* Quiet Hours */}
          <div className="border border-gray-200 rounded-lg p-6">
            <div className="flex items-center mb-4">
              <Clock className="w-5 h-5 text-orange-600 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">Heures de Silence</h3>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Activer les heures de silence</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.quietHours?.enabled || false}
                    onChange={(e) => handleQuietHoursChange('enabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                </label>
              </div>

              {preferences.quietHours?.enabled && (
                <div className="ml-4 space-y-3 border-l-2 border-orange-200 pl-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Début</label>
                      <input
                        type="time"
                        value={preferences.quietHours?.start || '22:00'}
                        onChange={(e) => handleQuietHoursChange('start', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Fin</label>
                      <input
                        type="time"
                        value={preferences.quietHours?.end || '08:00'}
                        onChange={(e) => handleQuietHoursChange('end', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    Aucune notification non-urgente ne sera envoyée pendant ces heures.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-200">
            <button
              onClick={savePreferences}
              disabled={saving}
              className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Sauvegarde...
                </>
              ) : (
                <>
                  <Settings className="w-4 h-4 mr-2" />
                  Sauvegarder les Préférences
                </>
              )}
            </button>

            <button
              onClick={testNotifications}
              disabled={saving}
              className="flex-1 bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            >
              <Bell className="w-4 h-4 mr-2" />
              Tester les Notifications
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationPreferences;
