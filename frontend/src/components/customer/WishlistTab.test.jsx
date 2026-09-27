import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';
import { CustomerProvider } from '../../context/CustomerContext';
import { WishlistProvider } from '../../context/WishlistContext';
import { CartProvider } from '../../context/CartContext';
import WishlistTab from './WishlistTab';

const pump = { _id: 'p1', name: 'Pompe 1.5HP', price: 850, image: '/img/pompe.jpg', inStock: true, stockQuantity: 4 };
const heater = { _id: 'p2', name: 'Pompe à chaleur', price: 3200, image: '', inStock: false, stockQuantity: 0 };

const renderTab = (items) => {
  vi.spyOn(axios, 'get').mockImplementation(async (url) => (
    url === '/api/customers/me'
      ? { data: { customer: { id: 'c1', email: 'sami@example.com', firstName: 'Sami' } } }
      : { data: { wishlist: { items, itemsCount: items.length } } }
  ));
  return render(
    <CustomerProvider>
      <WishlistProvider>
        <CartProvider>
          <MemoryRouter><WishlistTab /></MemoryRouter>
        </CartProvider>
      </WishlistProvider>
    </CustomerProvider>
  );
};

describe('account wishlist tab', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('customerToken', 'session');
  });

  it('lists the saved products and adds one to the cart', async () => {
    renderTab([{ product: pump, addedAt: '2026-09-20T10:00:00Z' }, { product: heater }]);

    const row = (await screen.findByText('Pompe 1.5HP')).closest('div.bg-surface');
    expect(screen.getByText(/2 produits gardés/)).toBeTruthy();
    fireEvent.click(within(row).getByRole('button', { name: /Ajouter au panier/ }));
    expect(await screen.findByText(/a été ajouté au panier/)).toBeTruthy();
    expect(JSON.parse(localStorage.getItem('cart'))).toEqual([expect.objectContaining({ _id: 'p1', quantity: 1 })]);

    // Out of stock: can't be added
    const heaterRow = screen.getByText('Pompe à chaleur').closest('div.bg-surface');
    expect(within(heaterRow).getByRole('button', { name: /Ajouter au panier/ }).disabled).toBe(true);
    expect(within(heaterRow).getByText(/Rupture de stock/)).toBeTruthy();
  });

  it('removes a product', async () => {
    renderTab([{ product: pump }]);
    await screen.findByText('Pompe 1.5HP');
    const del = vi.spyOn(axios, 'delete').mockResolvedValue({ data: { wishlist: { items: [], itemsCount: 0 } } });

    fireEvent.click(screen.getByRole('button', { name: 'Retirer Pompe 1.5HP de la liste' }));
    expect(await screen.findByText(/a été retiré de votre liste/)).toBeTruthy();
    expect(del).toHaveBeenCalledWith('/api/wishlist/items/p1');
    expect(screen.getByText('Votre liste de souhaits est vide.')).toBeTruthy();
  });
});
