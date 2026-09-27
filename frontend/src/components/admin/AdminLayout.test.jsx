import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import adminApi from '../../utils/adminApi';
import { AdminProvider } from '../../context/AdminContext';
import { ThemeProvider } from '../../context/ThemeContext';
import AdminLayout from './AdminLayout';

const catalogueAdmin = {
  id: 'a1', username: 'sonia', email: 'sonia@stes.tn', firstName: 'Sonia', lastName: 'M',
  fullName: 'Sonia M', role: 'admin', permissions: ['products']
};

const renderAt = (url) => render(
  <ThemeProvider>
  <AdminProvider>
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/admin" element={<AdminLayout />}>
          <Route path="products" element={<p>Products page</p>} />
          <Route path="orders" element={<p>Orders page</p>} />
        </Route>
      </Routes>
    </MemoryRouter>
  </AdminProvider>
  </ThemeProvider>
);

describe('admin menu and permissions', () => {
  const originalMatchMedia = window.matchMedia;
  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('adminToken', 'session');
    localStorage.setItem('adminUser', JSON.stringify(catalogueAdmin));
    vi.restoreAllMocks();
    // A desktop screen: the menu is always shown
    window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
    vi.spyOn(adminApi, 'get').mockImplementation(async (url) => (url === '/auth/me' ? { data: { admin: catalogueAdmin } } : { data: {} }));
  });

  it('lists only the pages the admin may open', async () => {
    renderAt('/admin/products');
    expect(await screen.findByText('Products page')).toBeTruthy();

    const links = screen.getAllByRole('link').map(link => link.getAttribute('href'));
    for (const allowed of ['/admin/dashboard', '/admin/products', '/admin/categories', '/admin/reviews', '/admin/settings']) {
      expect(links).toContain(allowed);
    }
    for (const hidden of ['/admin/orders', '/admin/reports', '/admin/customers', '/admin/forms', '/admin/pages', '/admin/users']) {
      expect(links).not.toContain(hidden);
    }
  });

  it('explains instead of opening a page the admin has no permission for', async () => {
    renderAt('/admin/orders');
    expect((await screen.findByRole('alert')).textContent).toMatch(/don't have access to this page/);
    expect(screen.queryByText('Orders page')).toBeNull();
  });
});
