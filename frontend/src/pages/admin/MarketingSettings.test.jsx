import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import adminApi from '../../utils/adminApi';
import { AdminProvider } from '../../context/AdminContext';
import AdminSettings from './AdminSettings';

const account = {
  id: 'a1', username: 'mariem', email: 'mariem@stes.tn', firstName: 'Mariem', lastName: 'Jaziri',
  fullName: 'Mariem Jaziri', role: 'admin', permissions: ['settings']
};
const marketing = { gaMeasurementId: '', metaPixelId: '', facebookUrl: 'https://www.facebook.com/stes', instagramUrl: '', tiktokUrl: '', googleReviewUrl: '' };

const renderTab = () => render(
  <AdminProvider>
    <MemoryRouter initialEntries={['/admin/settings?tab=marketing']}>
      <AdminSettings />
    </MemoryRouter>
  </AdminProvider>
);

describe('admin marketing settings', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    localStorage.setItem('adminToken', 'session');
    localStorage.setItem('adminUser', JSON.stringify(account));
    vi.spyOn(adminApi, 'get').mockImplementation((url) => Promise.resolve(
      url === '/admin/settings' ? { data: { marketing } } : { data: { admin: account } }
    ));
  });

  it('saves the measurement ids and social pages', async () => {
    const put = vi.spyOn(adminApi, 'put').mockResolvedValue({ data: { settings: { marketing: { ...marketing, gaMeasurementId: 'G-AB12CD34EF', instagramUrl: 'https://www.instagram.com/stes' } } } });
    renderTab();
    expect((await screen.findByLabelText('Facebook page')).value).toBe('https://www.facebook.com/stes');

    fireEvent.change(screen.getByLabelText('Google Analytics measurement ID'), { target: { value: 'g-ab12cd34ef' } });
    fireEvent.change(screen.getByLabelText('Instagram account'), { target: { value: 'https://www.instagram.com/stes' } });
    fireEvent.click(screen.getByRole('button', { name: /Save marketing settings/ }));

    expect((await screen.findByRole('status')).textContent).toMatch('Marketing settings saved');
    expect(put).toHaveBeenCalledWith('/admin/settings', { marketing: { ...marketing, gaMeasurementId: 'g-ab12cd34ef', instagramUrl: 'https://www.instagram.com/stes' } });
    // As the server saved it
    expect(screen.getByLabelText('Google Analytics measurement ID').value).toBe('G-AB12CD34EF');
  });

  it('says what is wrong when the server refuses a value', async () => {
    vi.spyOn(adminApi, 'put').mockRejectedValue({ response: { data: { message: 'Enter the Meta pixel ID (digits only, for example 123456789012345), or leave it empty' } } });
    renderTab();
    fireEvent.change(await screen.findByLabelText(/Meta pixel ID/), { target: { value: 'abc' } });
    fireEvent.click(screen.getByRole('button', { name: /Save marketing settings/ }));
    expect((await screen.findByRole('alert')).textContent).toMatch('Meta pixel ID (digits only');
  });
});
