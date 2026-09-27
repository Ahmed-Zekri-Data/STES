import { createContext, useContext } from 'react';

// Contact details, bank account and delivery prices set in Admin → Settings → Shop.
// Until they load (or if they can't), the shop shows the same defaults as
// the server. The provider is in ShopSettingsContext.jsx.
export const DEFAULT_SHOP_SETTINGS = {
  contact: {
    phone: '+216 12 345 678',
    whatsapp: '+216 12 345 678',
    email: 'info@stes.tn',
    address: 'Tunis, Tunisie'
  },
  // The account for bank transfers, or null when the shop has none
  bank: null,
  delivery: {
    freeDeliveryOver: 200,
    baseCost: 7,
    cashOnDeliveryFee: 5
  }
};

export const ShopSettingsContext = createContext(DEFAULT_SHOP_SETTINGS);

export const useShopSettings = () => useContext(ShopSettingsContext);

// What the cart can say about delivery before the customer picks a
// governorate. Mirrors the server (deliveryCost in backend/services/
// orderService.js): free above the free-delivery amount, otherwise the base
// cost times the governorate's factor, the lowest being 1 (Grand Tunis).
export const deliveryEstimate = (subtotal, delivery) => (
  subtotal > delivery.freeDeliveryOver
    ? { free: true, from: 0 }
    : { free: false, from: Math.round(delivery.baseCost) }
);

// "+216 98 765 432" → "https://wa.me/21698765432"; empty when there is no number
export const whatsappLink = (number) => {
  const digits = String(number || '').replace(/\D/g, '');
  return digits ? `https://wa.me/${digits}` : '';
};

// "+216 71 234 567" → "tel:+21671234567"
export const phoneLink = (number) => `tel:${String(number || '').replace(/[^\d+]/g, '')}`;
