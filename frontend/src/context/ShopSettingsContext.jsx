import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { DEFAULT_SHOP_SETTINGS, ShopSettingsContext } from './shopSettings';

// Loads the shop settings once for every page (see shopSettings.js)
export const ShopSettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(DEFAULT_SHOP_SETTINGS);

  useEffect(() => {
    let cancelled = false;
    axios.get('/api/settings')
      .then(response => {
        if (!cancelled && response.data?.contact) setSettings(response.data);
      })
      .catch(error => console.error('Error loading shop settings:', error));
    return () => { cancelled = true; };
  }, []);

  return (
    <ShopSettingsContext.Provider value={settings}>
      {children}
    </ShopSettingsContext.Provider>
  );
};
