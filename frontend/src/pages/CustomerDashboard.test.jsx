import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import axios from 'axios';
import { CustomerProvider } from '../context/CustomerContext';
import CustomerDashboard from './CustomerDashboard';

const ShowLocation = () => <p data-testid="location">{useLocation().search}</p>;

const renderAt = (url) => render(
  <CustomerProvider>
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/account" element={<><CustomerDashboard /><ShowLocation /></>} />
      </Routes>
    </MemoryRouter>
  </CustomerProvider>
);

describe('customer account page', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('customerToken', 'session');
    vi.spyOn(axios, 'get').mockImplementation(async (url) => {
      if (url === '/api/customers/me') {
        return { data: { customer: { firstName: 'Fatma', fullName: 'Fatma Trabelsi', email: 'fatma@example.tn' } } };
      }
      return { data: { orders: [], pagination: { currentPage: 1, totalPages: 1, totalOrders: 0 } } };
    });
  });

  // The account menu links to /account?tab=settings and /account?tab=orders
  it('opens the tab named in the address', async () => {
    renderAt('/account?tab=settings');
    expect(await screen.findByText('Paramètres du compte')).toBeTruthy();
  });

  it('puts the chosen tab in the address', async () => {
    renderAt('/account');
    fireEvent.click(await screen.findByRole('button', { name: 'Paramètres' }));

    expect(await screen.findByText('Paramètres du compte')).toBeTruthy();
    expect(screen.getByTestId('location').textContent).toBe('?tab=settings');
  });
});
