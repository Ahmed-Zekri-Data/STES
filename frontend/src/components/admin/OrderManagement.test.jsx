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

describe('admin order payment', () => {
  const transfer = { ...order, paymentMethod: 'bank_transfer' };
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(adminApi, 'get').mockResolvedValue({
      data: { orders: [transfer], pagination: { currentPage: 1, totalPages: 1, totalOrders: 1 } }
    });
  });

  const openOrder = async () => {
    fireEvent.click(await screen.findByRole('button', { name: 'Voir la commande ORD-1' }));
  };

  it('records a bank transfer as received, with a note, and shows it in the list', async () => {
    const put = vi.spyOn(adminApi, 'put')
      .mockResolvedValueOnce({ data: { order: { ...transfer, paymentStatus: 'paid', paidAt: '2026-10-01T09:00:00Z' } } })
      .mockResolvedValueOnce({ data: { order: { ...transfer, paymentStatus: 'pending', paidAt: undefined } } });
    renderPage();
    expect((await screen.findAllByText('Non payé')).length).toBe(1);
    await openOrder();
    expect(screen.getByText('Virement bancaire')).toBeTruthy();
    expect(screen.getByText(/Le client reçoit un email de confirmation/)).toBeTruthy();

    fireEvent.change(screen.getByLabelText(/Remarque/), { target: { value: 'Réf. 4471' } });
    fireEvent.click(screen.getByRole('button', { name: /Marquer comme payé/ }));
    await waitFor(() => expect(put).toHaveBeenCalledWith('/orders/o1/payment', { received: true, note: 'Réf. 4471' }));
    expect(await screen.findByText('Payé le 1 octobre 2026')).toBeTruthy();
    expect(screen.getAllByText('Payé').length).toBe(1);

    // Undoing asks first
    fireEvent.click(screen.getByRole('button', { name: /Annuler l’enregistrement du paiement/ }));
    expect(put).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Oui, annuler' }));
    await waitFor(() => expect(put).toHaveBeenLastCalledWith('/orders/o1/payment', { received: false }));
    expect(await screen.findByRole('button', { name: /Marquer comme payé/ })).toBeTruthy();
  });

  it('says why when recording fails', async () => {
    vi.spyOn(adminApi, 'put').mockRejectedValue({ response: { data: { message: 'This order is cancelled' } } });
    renderPage();
    await openOrder();
    fireEvent.click(screen.getByRole('button', { name: /Marquer comme payé/ }));
    expect((await screen.findByRole('alert')).textContent).toMatch('This order is cancelled');
  });

  it('has no button for an online payment', async () => {
    adminApi.get.mockResolvedValue({ data: { orders: [{ ...order, paymentMethod: 'konnect' }], pagination: { currentPage: 1, totalPages: 1, totalOrders: 1 } } });
    renderPage();
    await openOrder();
    expect(screen.getByText(/confirmé automatiquement par la passerelle/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Marquer comme payé/ })).toBeNull();
  });
});
