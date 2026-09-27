import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import adminApi from '../../utils/adminApi';
import OrderManagement from './OrderManagement';

const order = {
  _id: 'o1',
  orderNumber: 'ORD-1',
  status: 'pending',
  paymentStatus: 'pending',
  totalAmount: 300,
  createdAt: '2026-09-01T10:00:00Z',
  customer: { name: 'Sami Ben Ali', email: 'sami@example.com', phone: '+21612345678', address: { street: '1 Rue', city: 'Tunis' } },
  items: [{ name: 'Pompe', quantity: 1, price: 300 }]
};

const renderPage = () => render(<MemoryRouter><OrderManagement /></MemoryRouter>);

describe('admin order status dialog', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(adminApi, 'get').mockResolvedValue({
      data: { orders: [order], pagination: { currentPage: 1, totalPages: 1, totalOrders: 1 } }
    });
  });

  const openDialog = async () => {
    fireEvent.click(await screen.findByRole('button', { name: 'Modifier le statut de ORD-1' }));
  };

  it('offers to email the customer for statuses they are told about, and sends the choice', async () => {
    const put = vi.spyOn(adminApi, 'put').mockResolvedValue({ data: { order: { ...order, status: 'shipped' } } });
    renderPage();
    await openDialog();

    fireEvent.change(screen.getByLabelText('Nouveau statut'), { target: { value: 'processing' } });
    expect(screen.queryByLabelText(/Prévenir le client/)).toBeNull();

    fireEvent.change(screen.getByLabelText('Nouveau statut'), { target: { value: 'shipped' } });
    const notify = screen.getByLabelText(/Prévenir le client par email \(sami@example.com\)/);
    expect(notify.checked).toBe(true);
    fireEvent.click(notify);
    fireEvent.change(screen.getByLabelText(/Message au client/), { target: { value: 'Demain matin' } });
    fireEvent.click(screen.getByRole('button', { name: /Mettre à jour/ }));

    await waitFor(() => expect(put).toHaveBeenCalledWith('/orders/o1/status', {
      status: 'shipped', trackingNumber: '', note: 'Demain matin', location: '', sendNotification: false
    }));
    await waitFor(() => expect(screen.queryByLabelText('Nouveau statut')).toBeNull());
  });

  it('keeps the dialog open and says why when the update fails', async () => {
    vi.spyOn(adminApi, 'put').mockRejectedValue({ response: { data: { message: 'Insufficient stock' } } });
    renderPage();
    await openDialog();

    fireEvent.change(screen.getByLabelText('Nouveau statut'), { target: { value: 'confirmed' } });
    fireEvent.click(screen.getByRole('button', { name: /Mettre à jour/ }));

    expect((await screen.findByRole('alert')).textContent).toMatch(/Insufficient stock/);
    expect(screen.getByLabelText('Nouveau statut')).toBeTruthy();
  });
});
