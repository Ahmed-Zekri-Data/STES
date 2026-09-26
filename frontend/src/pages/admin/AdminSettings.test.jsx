import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import adminApi from '../../utils/adminApi';
import { AdminProvider } from '../../context/AdminContext';
import AdminSettings from './AdminSettings';

const account = {
  id: 'a1', username: 'mariem', email: 'mariem@stes.tn', firstName: 'Mariem', lastName: 'Jaziri',
  fullName: 'Mariem Jaziri', role: 'admin', permissions: ['orders']
};

const renderPage = (url = '/admin/settings') => render(
  <AdminProvider>
    <MemoryRouter initialEntries={[url]}>
      <AdminSettings />
    </MemoryRouter>
  </AdminProvider>
);

describe('admin settings', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('adminToken', 'old-session');
    localStorage.setItem('adminUser', JSON.stringify(account));
    vi.spyOn(adminApi, 'get').mockResolvedValue({ data: { admin: account } });
  });

  it('changes the password and keeps the new session', async () => {
    const put = vi.spyOn(adminApi, 'put').mockResolvedValue({ data: { token: 'new-session' } });
    renderPage();

    fireEvent.change(await screen.findByLabelText('Current password'), { target: { value: 'ancien-mdp' } });
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'nouveau-mdp-2' } });
    fireEvent.change(screen.getByLabelText('New password again'), { target: { value: 'nouveau-mdp-2' } });
    fireEvent.click(screen.getByRole('button', { name: /Change password/ }));

    expect((await screen.findByRole('status')).textContent).toMatch(/other devices were signed out/);
    expect(put).toHaveBeenCalledWith('/auth/password', { currentPassword: 'ancien-mdp', newPassword: 'nouveau-mdp-2' });
    expect(localStorage.getItem('adminToken')).toBe('new-session');
  });

  it('checks the new password before sending it', async () => {
    const put = vi.spyOn(adminApi, 'put');
    renderPage();

    fireEvent.change(await screen.findByLabelText('Current password'), { target: { value: 'ancien-mdp' } });
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'court' } });
    fireEvent.change(screen.getByLabelText('New password again'), { target: { value: 'court' } });
    fireEvent.click(screen.getByRole('button', { name: /Change password/ }));
    expect(screen.getByRole('alert').textContent).toMatch(/at least 8/);

    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'nouveau-mdp-2' } });
    fireEvent.change(screen.getByLabelText('New password again'), { target: { value: 'nouveau-mdp-3' } });
    fireEvent.click(screen.getByRole('button', { name: /Change password/ }));
    expect(screen.getByRole('alert').textContent).toMatch(/not the same/);
    expect(put).not.toHaveBeenCalled();
  });

  it('shows the Shop tab only to admins with the settings permission', async () => {
    renderPage('/admin/settings?tab=shop');
    expect(await screen.findByText('Profile')).toBeTruthy();
    expect(screen.queryByRole('tab', { name: /Shop/ })).toBeNull();
  });
});
