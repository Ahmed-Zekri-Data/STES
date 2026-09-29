import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import adminApi from '../../utils/adminApi';
import { AdminProvider } from '../../context/AdminContext';
import AdminSettings from './AdminSettings';

const account = { id: 'a1', username: 'mariem', email: 'mariem@stes.tn', firstName: 'Mariem', lastName: 'Jaziri', fullName: 'Mariem Jaziri', role: 'admin', permissions: ['settings', 'products'] };
const products = [{ _id: 'p1', name: 'Pompe Victoria Plus 1 CV', price: 690, stockQuantity: 5 }, { _id: 'p2', name: 'Échelle inox', price: 320, stockQuantity: 2 }];

describe('admin pool builder settings', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('adminToken', 'session');
    localStorage.setItem('adminUser', JSON.stringify(account));
    vi.spyOn(adminApi, 'get').mockImplementation((url) => Promise.resolve(
      url === '/admin/settings' ? { data: { builder: { equipment: [{ product: 'p1', kind: 'pump' }], pricePerM2Min: 0, pricePerM2Max: 0 } } }
        : url === '/admin/products' ? { data: { products, pagination: { totalPages: 1 } } }
          : { data: { admin: account } }
    ));
  });

  it('chooses the equipment, how it is drawn, and the price per m²', async () => {
    const put = vi.spyOn(adminApi, 'put').mockImplementation((url, body) => Promise.resolve({ data: { settings: { builder: body.builder } } }));
    render(<AdminProvider><MemoryRouter initialEntries={['/admin/settings?tab=builder']}><AdminSettings /></MemoryRouter></AdminProvider>);

    expect((await screen.findByLabelText('Product')).value).toBe('p1');
    fireEvent.click(screen.getByRole('button', { name: /Add a product/ }));
    // A row left empty is not saved
    fireEvent.click(screen.getByRole('button', { name: /Add a product/ }));
    fireEvent.change(screen.getAllByLabelText('Product')[1], { target: { value: 'p2' } });
    fireEvent.change(screen.getAllByLabelText('Drawn as')[1], { target: { value: 'ladder' } });
    fireEvent.change(screen.getByLabelText('From (TND per m²)'), { target: { value: '900' } });
    fireEvent.change(screen.getByLabelText('To (TND per m²)'), { target: { value: '1400' } });
    fireEvent.click(screen.getByRole('button', { name: /Save the pool builder/ }));

    expect((await screen.findByRole('status')).textContent).toMatch('Pool builder saved');
    expect(put.mock.calls[0][1].builder).toEqual({ equipment: [{ product: 'p1', kind: 'pump' }, { product: 'p2', kind: 'ladder' }], pricePerM2Min: 900, pricePerM2Max: 1400 });
  });
});
