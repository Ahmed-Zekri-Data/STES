import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import notificationService from '../../services/notificationService';
import InAppNotifications from './InAppNotifications';

const list = [
  { _id: 'n1', title: 'Commande expédiée', message: 'En route', category: 'delivery', status: 'sent', createdAt: new Date().toISOString() },
  { _id: 'n2', title: 'Commande confirmée', message: 'Merci', category: 'order_update', status: 'sent', createdAt: new Date().toISOString() }
];

const openBell = async () => {
  render(<InAppNotifications />);
  await screen.findByText('2');
  fireEvent.click(screen.getByText('2').closest('button'));
  await screen.findByText('Commande expédiée');
};

describe('customer notification bell', () => {
  beforeEach(() => {
    vi.spyOn(notificationService, 'getHistory').mockResolvedValue({ notifications: list });
  });

  it('saves a notification as read on the server', async () => {
    const save = vi.spyOn(notificationService, 'markAsRead').mockResolvedValue();
    await openBell();

    fireEvent.click(screen.getByText('Commande expédiée'));
    await waitFor(() => expect(save).toHaveBeenCalledWith('n1'));
    expect(screen.getByText('1')).toBeTruthy();
  });

  it('puts it back as unread when saving fails', async () => {
    vi.spyOn(notificationService, 'markAsRead').mockRejectedValue(new Error('offline'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await openBell();

    fireEvent.click(screen.getByText('Commande expédiée'));
    await waitFor(() => expect(screen.getByText('2')).toBeTruthy());
  });

  it('marks everything as read', async () => {
    const saveAll = vi.spyOn(notificationService, 'markAllAsRead').mockResolvedValue();
    await openBell();

    fireEvent.click(screen.getByText('Tout marquer comme lu'));
    await waitFor(() => expect(saveAll).toHaveBeenCalled());
    expect(screen.queryByText('Tout marquer comme lu')).toBeNull();
  });
});
