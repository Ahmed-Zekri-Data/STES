import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import adminApi from '../../utils/adminApi';
import { AdminProvider } from '../../context/AdminContext';
import AdminSettings from './AdminSettings';

const account = {
  id: 'a1', username: 'mariem', email: 'mariem@stes.tn', firstName: 'Mariem', lastName: 'Jaziri',
  fullName: 'Mariem Jaziri', role: 'admin', permissions: ['settings', 'products']
};
const products = [
  { _id: 'p1', name: 'Pompe Victoria Plus 1 CV', price: 690, stockQuantity: 5 },
  { _id: 'p2', name: 'Chlore choc 5 kg', price: 65, stockQuantity: 0 },
  { _id: 'p3', name: 'Pack ouverture de saison', price: 139, stockQuantity: 9 }
];
const saved = {
  hotspots: { pump: 'p1', filter: null, robot: null, lights: null, ring: null },
  problems: { green: ['p2'], cloudy: [], dirty: [], cold: [] },
  sizes: [], lights: null, options: [], packs: [], showMap: true, partnerBadge: ''
};

const renderPage = () => render(
  <AdminProvider>
    <MemoryRouter initialEntries={['/admin/settings?tab=home']}>
      <AdminSettings />
    </MemoryRouter>
  </AdminProvider>
);

describe('admin home page settings', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('adminToken', 'session');
    localStorage.setItem('adminUser', JSON.stringify(account));
    vi.spyOn(adminApi, 'get').mockImplementation((url) => Promise.resolve(
      url === '/admin/settings' ? { data: { showcase: saved } }
        : url === '/admin/products' ? { data: { products, pagination: { totalPages: 1 } } }
          : { data: { admin: account } }
    ));
  });

  it('shows what is chosen, and saves new choices', async () => {
    const put = vi.spyOn(adminApi, 'put').mockImplementation((url, body) => Promise.resolve({ data: { settings: { showcase: body.showcase } } }));
    renderPage();

    expect((await screen.findByLabelText('Pump')).value).toBe('p1');
    const green = screen.getByText('Green water').closest('div');
    expect(within(green).getByText('Chlore choc 5 kg · 65 TND (out of stock)')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Pump'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Cloudy water'), { target: { value: 'p2' } });
    fireEvent.click(within(green).getByRole('button', { name: 'Remove Chlore choc 5 kg' }));
    fireEvent.click(screen.getByRole('button', { name: /Add a pack/ }));
    fireEvent.change(screen.getByLabelText('Pack (the product sold)'), { target: { value: 'p3' } });
    fireEvent.change(screen.getByLabelText('What it contains (up to 8)'), { target: { value: 'p2' } });
    fireEvent.change(screen.getByLabelText('Partner badge'), { target: { value: 'Partenaire agréé AstralPool' } });
    fireEvent.click(screen.getByRole('button', { name: /Save the home page/ }));

    expect((await screen.findByRole('status')).textContent).toMatch('Home page saved');
    const { showcase } = put.mock.calls[0][1];
    expect(put.mock.calls[0][0]).toBe('/admin/settings');
    expect(showcase.hotspots.pump).toBeNull();
    expect(showcase.problems).toMatchObject({ green: [], cloudy: ['p2'] });
    expect(showcase.packs).toEqual([{ product: 'p3', season: '', includes: ['p2'] }]);
    expect(showcase.partnerBadge).toBe('Partenaire agréé AstralPool');
  });

  it('shows the server’s reason when saving fails', async () => {
    vi.spyOn(adminApi, 'put').mockRejectedValue({ response: { data: { message: 'Choose a product from the list' } } });
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /Save the home page/ }));
    expect((await screen.findByRole('alert')).textContent).toBe('Choose a product from the list');
  });
});
