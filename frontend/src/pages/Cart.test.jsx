import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';
import { LanguageProvider } from '../context/LanguageContext';
import { CartProvider } from '../context/CartContext';
import { ShopSettingsContext, DEFAULT_SHOP_SETTINGS } from '../context/shopSettings';
import Cart from './Cart';

const renderCart = (items, settings = DEFAULT_SHOP_SETTINGS) => {
  localStorage.setItem('cart', JSON.stringify(items));
  return render(
    <LanguageProvider>
      <ShopSettingsContext.Provider value={settings}>
        <CartProvider>
          <MemoryRouter>
            <Cart />
          </MemoryRouter>
        </CartProvider>
      </ShopSettingsContext.Provider>
    </LanguageProvider>
  );
};

// The summary box, whose lines are label + amount
const summary = () => screen.getByText('Résumé de la commande').parentElement.textContent;

describe('cart page totals', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('language', 'fr');
    vi.spyOn(axios, 'get').mockResolvedValue({ data: { products: [] } }); // suggestions
  });

  it('shows the delivery price from the shop settings, not a made-up one', () => {
    renderCart([{ _id: 'p1', name: 'Filtre Cartouche', price: 180, quantity: 1 }]);

    expect(summary()).toContain('Sous-total:180.000 TND');
    expect(summary()).toContain('Livraison:dès 7.000 TND');
    expect(summary()).toContain('dès 188.000 TND'); // with the 1 TND timbre fiscal
    expect(summary()).toContain('Prix TTC, timbre fiscal (1 TND) compris.');
    expect(summary()).toContain('Paiement à la livraison : +5 TND.');
    expect(summary()).not.toContain('10.00');
  });

  it('shows free delivery above the amount set in Admin → Settings', () => {
    renderCart([{ _id: 'p1', name: 'Pompe', price: 850, quantity: 1 }]);

    expect(summary()).toContain('Livraison:Gratuite');
    expect(summary()).toContain('Total:851.000 TND');
    expect(summary()).not.toContain('gouvernorat');
  });

  it('uses the saved delivery prices', () => {
    renderCart(
      [{ _id: 'p1', name: 'Pompe', price: 850, quantity: 1 }],
      { ...DEFAULT_SHOP_SETTINGS, delivery: { freeDeliveryOver: 1000, baseCost: 9, cashOnDeliveryFee: 0 }, stampDuty: 0 }
    );

    expect(summary()).toContain('dès 859.000 TND');
    expect(summary()).toContain('Prix TTC.');
    expect(summary()).not.toContain('Paiement à la livraison');
  });
});
