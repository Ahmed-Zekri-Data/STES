import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';
import { CartProvider } from '../context/CartContext';
import { CustomerProvider } from '../context/CustomerContext';
import EnhancedShop from './EnhancedShop';

const renderShop = (address) => render(
  <CustomerProvider>
    <CartProvider>
      <MemoryRouter initialEntries={[address]}><EnhancedShop /></MemoryRouter>
    </CartProvider>
  </CustomerProvider>
);

// The order asked of the server on the last products request
const lastOrder = () => {
  const calls = axios.get.mock.calls.filter(([url]) => url === '/api/products');
  const { params } = calls[calls.length - 1][1];
  return [params.sortBy, params.sortOrder];
};

describe('shop sort order', () => {
  beforeEach(() => {
    vi.spyOn(axios, 'get').mockImplementation(() => Promise.resolve({ data: { products: [], categories: {}, suggestions: [] } }));
  });
  afterEach(() => vi.restoreAllMocks());

  it('lists a search by relevance, and lets the customer choose another order', async () => {
    renderShop('/shop?search=echelle');
    const sort = await screen.findByLabelText('Trier par');
    expect(sort.value).toBe('relevance_desc');
    expect(sort.selectedOptions[0].textContent).toBe('Pertinence');
    // No order sent: the server lists a search by relevance
    await waitFor(() => expect(lastOrder()).toEqual([undefined, undefined]));

    fireEvent.change(sort, { target: { value: 'price_asc' } });
    await waitFor(() => expect(lastOrder()).toEqual(['price', 'asc']));
  });

  it('offers no relevance order without a search', async () => {
    renderShop('/shop');
    const sort = await screen.findByLabelText('Trier par');
    expect(sort.value).toBe('createdAt_desc');
    expect([...sort.options].map(o => o.textContent)).not.toContain('Pertinence');
  });
});
