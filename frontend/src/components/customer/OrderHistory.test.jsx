import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import axios from 'axios';
import OrderHistory from './OrderHistory';

const order = {
  _id: 'o1',
  orderNumber: 'ORD-1790436844686-EB6AF3',
  status: 'shipped',
  createdAt: '2026-09-20T10:00:00Z',
  totalAmount: 1016.5,
  items: [{ name: 'Filtre à sable', quantity: 1, price: 850 }],
  customer: {
    name: 'Fatma Trabelsi',
    email: 'fatma@example.tn',
    phone: '+21698765432',
    address: { street: '7 Rue de Monastir', city: 'Monastir', postalCode: '5000', country: 'Tunisie' }
  }
};

describe('customer order history', () => {
  it('opens the details of an order', async () => {
    vi.spyOn(axios, 'get').mockResolvedValue({
      data: { orders: [order], pagination: { currentPage: 1, totalPages: 1, totalOrders: 1 } }
    });

    render(<OrderHistory />);
    fireEvent.click(await screen.findByRole('button', { name: /Détails/ }));

    // The popup used status helpers that only existed inside the list, so
    // opening it crashed the page
    const details = (await screen.findByText('Détails de la commande')).closest('div.fixed') || document.body;
    expect(within(details).getAllByText('Expédiée').length).toBeGreaterThan(0);
    expect(within(details).getByText(/7 Rue de Monastir/)).toBeTruthy();
    expect(axios.get).toHaveBeenCalledWith('/api/customer-orders', expect.anything());
  });
});
