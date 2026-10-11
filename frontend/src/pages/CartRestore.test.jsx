import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';
import { LanguageProvider } from '../context/LanguageContext';
import { CartProvider } from '../context/CartContext';
import { ShopSettingsContext, DEFAULT_SHOP_SETTINGS } from '../context/shopSettings';
import Cart from './Cart';

const TOKEN = 'a'.repeat(48);
const pump = { _id: 'p1', name: 'Pompe Victoria', price: 865, inStock: true, stockQuantity: 3, variants: [{ sku: '65557', label: '1/2 CV', price: 865, stockQuantity: 3 }] };
const chlore = { _id: 'p2', name: 'Chlore Granulé 5kg', price: 65, inStock: true, stockQuantity: 20, variants: [] };

const renderLink = (cart = []) => {
  localStorage.setItem('cart', JSON.stringify(cart));
  return render(
    <LanguageProvider>
      <ShopSettingsContext.Provider value={DEFAULT_SHOP_SETTINGS}>
        <CartProvider>
          <MemoryRouter initialEntries={[`/cart?reprendre=${TOKEN}&utm_source=email`]}>
            <Cart />
          </MemoryRouter>
        </CartProvider>
      </ShopSettingsContext.Provider>
    </LanguageProvider>
  );
};
const cartLines = () => JSON.parse(localStorage.getItem('cart')).map(item => `${item.name} x${item.quantity}`);
const draftAnswer = (answer) => vi.spyOn(axios, 'get').mockImplementation((url) => (url.startsWith('/api/checkout/draft/')
  ? answer()
  : Promise.resolve({ data: { products: [] } })));

describe('cart link from an email', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('language', 'fr');
    vi.restoreAllMocks();
  });

  it('puts the products back in the cart, with their version and quantity', async () => {
    const get = draftAnswer(() => Promise.resolve({ data: { items: [{ product: pump, variant: '65557', quantity: 1 }, { product: chlore, variant: null, quantity: 2 }] } }));
    renderLink();
    expect((await screen.findByRole('status')).textContent).toMatch('Votre panier est prêt');
    expect(get).toHaveBeenCalledWith(`/api/checkout/draft/${TOKEN}`);
    expect(cartLines()).toEqual(['Pompe Victoria – 1/2 CV x1', 'Chlore Granulé 5kg x2']);
  });

  it('leaves products already in the cart as they are', async () => {
    draftAnswer(() => Promise.resolve({ data: { items: [{ product: chlore, variant: null, quantity: 2 }] } }));
    renderLink([{ ...chlore, quantity: 5 }]);
    expect((await screen.findByRole('status')).textContent).toMatch('Ces produits sont déjà dans votre panier');
    expect(cartLines()).toEqual(['Chlore Granulé 5kg x5']);
  });

  it('says when the link has expired', async () => {
    draftAnswer(() => Promise.reject({ response: { status: 404, data: { message: 'Ce lien a expiré : votre panier n’est plus disponible.' } } }));
    renderLink();
    expect((await screen.findByRole('alert')).textContent).toMatch('Ce lien a expiré');
  });
});
