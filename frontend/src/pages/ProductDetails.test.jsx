import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import axios from 'axios';
import { LanguageProvider } from '../context/LanguageContext';
import { CustomerProvider } from '../context/CustomerContext';
import { WishlistProvider } from '../context/WishlistContext';
import { CartProvider } from '../context/CartContext';
import { ShopSettingsContext, DEFAULT_SHOP_SETTINGS } from '../context/shopSettings';
import ProductDetails from './ProductDetails';

const pump = {
  _id: 'aaaaaaaaaaaaaaaaaaaaaaaa', name: 'Victoria Plus Silent', description: 'Pompe auto-amorçante', category: 'pumps', categoryName: 'Pompes',
  price: 865, stockQuantity: 3, inStock: true,
  variants: [
    { sku: '65557', label: '1/2 HP 230 V', price: 865, stockQuantity: 3 },
    { sku: '65562', label: '1 HP 230 V', price: 903, stockQuantity: 0 },
    { sku: '65569', label: '3 HP 230 V', price: null, stockQuantity: 0 }
  ]
};

const renderPage = (product) => {
  vi.spyOn(axios, 'get').mockImplementation((url) => Promise.resolve(url === `/api/products/${product._id}` ? { data: product } : { data: { products: [] } }));
  return render(
    <LanguageProvider>
      <ShopSettingsContext.Provider value={DEFAULT_SHOP_SETTINGS}>
        <CustomerProvider>
          <WishlistProvider>
            <CartProvider>
              <MemoryRouter initialEntries={[`/product/${product._id}`]}>
                <Routes><Route path="/product/:id" element={<ProductDetails />} /></Routes>
              </MemoryRouter>
            </CartProvider>
          </WishlistProvider>
        </CustomerProvider>
      </ShopSettingsContext.Provider>
    </LanguageProvider>
  );
};
const cart = () => JSON.parse(localStorage.getItem('cart') || '[]');

describe('product page', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it('sells the version chosen, at its price', async () => {
    renderPage(pump);
    // The first version that can be bought is chosen
    expect((await screen.findByRole('button', { name: /1\/2 HP 230 V/ })).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByText('865')).toBeTruthy();
    expect(screen.getByText('Réf. 65557')).toBeTruthy();

    fireEvent.click(screen.getAllByRole('button', { name: /Ajouter au panier/ })[0]);
    await waitFor(() => expect(cart()).toEqual([expect.objectContaining({ _id: pump._id, variant: '65557', name: 'Victoria Plus Silent – 1/2 HP 230 V', price: 865, quantity: 1 })]));

    // Out of stock: no add to cart
    fireEvent.click(screen.getByRole('button', { name: /1 HP 230 V/ }));
    expect(screen.getByText('903')).toBeTruthy();
    expect(screen.getByText('Rupture de stock')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Ajouter au panier/ })).toBeNull();
  });

  it('asks for a quote for a version on request', async () => {
    const post = vi.spyOn(axios, 'post').mockResolvedValue({ data: {} });
    renderPage(pump);
    fireEvent.click(await screen.findByRole('button', { name: /3 HP 230 V/ }));
    expect(screen.getAllByText('Prix sur demande').length).toBeGreaterThan(0);

    fireEvent.change(screen.getByLabelText('Nom'), { target: { value: 'Karim Ben Salah' } });
    fireEvent.change(screen.getByLabelText('Téléphone'), { target: { value: '98765432' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'karim@example.com' } });
    fireEvent.change(screen.getByLabelText('Ville'), { target: { value: 'Sousse' } });
    fireEvent.click(screen.getByRole('button', { name: /Demander le prix/ }));

    expect(await screen.findByText('Demande envoyée')).toBeTruthy();
    expect(post).toHaveBeenCalledWith('/api/forms/quote', {
      name: 'Karim Ben Salah', phone: '98765432', email: 'karim@example.com', city: 'Sousse',
      message: 'Demande de prix : Victoria Plus Silent – 3 HP 230 V (réf. 65569)'
    });
  });

  it('sells a product "sur commande" without stock', async () => {
    renderPage({ ...pump, backorder: true, variants: [{ sku: '65562', label: '1 HP 230 V', price: 903, stockQuantity: 0 }] });
    expect(await screen.findByText(/Sur commande : nous le commandons pour vous/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Augmenter la quantité' }));
    fireEvent.click(screen.getAllByRole('button', { name: /Ajouter au panier/ })[0]);
    await waitFor(() => expect(cart()).toEqual([expect.objectContaining({ variant: '65562', quantity: 2 })]));
  });
});
