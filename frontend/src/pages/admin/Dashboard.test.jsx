import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import adminApi from '../../utils/adminApi';
import { AdminProvider } from '../../context/AdminContext';
import Dashboard from './Dashboard';

const figures = {
  period: { days: 30 },
  sales: { revenue: 1500, orders: 3, averageOrder: 500, previous: { revenue: 1000, orders: 4 } },
  orderStatus: { pending: 2, inProgress: 1, delivered: 5, cancelled: 1 },
  recentOrders: [{ id: 'o1', orderNumber: 'ORD-1', customerName: 'Fatma Trabelsi', totalAmount: 1016.5, status: 'shipped', createdAt: '2026-09-20T10:00:00Z' }],
  topProducts: [
    { id: 'p1', name: 'Filtre à sable', quantity: 4, revenue: 3400, stillInCatalog: true },
    { id: 'p2', name: 'Ancienne pompe', quantity: 2, revenue: 900, stillInCatalog: false }
  ]
};

const renderPage = () => render(
  <AdminProvider>
    <MemoryRouter><Dashboard /></MemoryRouter>
  </AdminProvider>
);

describe('admin dashboard', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('adminToken', 'session');
    localStorage.setItem('adminUser', JSON.stringify({ firstName: 'Mariem', role: 'admin', permissions: ['orders'] }));
  });

  it('shows real best sellers and the change against the previous period', async () => {
    vi.spyOn(adminApi, 'get').mockImplementation(async (url) => (
      url === '/auth/me' ? { data: { admin: { firstName: 'Mariem', role: 'admin', permissions: ['orders'] } } } : { data: figures }
    ));
    renderPage();

    expect(await screen.findByText('1. Filtre à sable')).toBeTruthy();
    expect(screen.getByText(/4 sold/)).toBeTruthy();
    expect(screen.getByText(/no longer in the catalog/)).toBeTruthy();
    expect(screen.getByText('+50%')).toBeTruthy(); // sales 1000 → 1500
    expect(screen.getByText('-25%')).toBeTruthy(); // orders 4 → 3
    expect(screen.getByText('Fatma Trabelsi')).toBeTruthy();
    expect(screen.getByText(/Welcome back, Mariem/)).toBeTruthy();
    // No product or customer figures without those permissions
    expect(screen.queryByText('Products')).toBeNull();
    expect(screen.queryByText('Customer accounts')).toBeNull();
  });

  it('asks the server again for another period', async () => {
    const get = vi.spyOn(adminApi, 'get').mockResolvedValue({ data: figures });
    renderPage();
    await screen.findByText('1. Filtre à sable');

    fireEvent.change(screen.getByLabelText('Period'), { target: { value: '90' } });
    await waitFor(() => expect(get).toHaveBeenCalledWith('/admin/dashboard', { params: { days: 90 } }));
  });
});
