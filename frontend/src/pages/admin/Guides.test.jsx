import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import adminApi from '../../utils/adminApi';
import { AdminProvider } from '../../context/AdminContext';
import Guides from './Guides';

const account = { id: 'a1', username: 'mariem', email: 'mariem@stes.tn', firstName: 'Mariem', lastName: 'Jaziri', fullName: 'Mariem Jaziri', role: 'admin', permissions: ['settings'] };
const draft = {
  _id: 'g1', slug: 'eau-verte-piscine', title: 'Eau verte dans la piscine', theme: 'problemes',
  summary: 'Une eau verte vient presque toujours d’un manque de chlore et d’un pH trop haut.',
  body: '<h2>La méthode</h2><p>Brossez les parois.</p>', products: [], published: false, updatedAt: '2026-10-01T10:00:00Z'
};

const renderPage = () => render(
  <AdminProvider>
    <MemoryRouter initialEntries={['/admin/guides']}><Guides /></MemoryRouter>
  </AdminProvider>
);

describe('admin guides', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    localStorage.setItem('adminToken', 'session');
    localStorage.setItem('adminUser', JSON.stringify(account));
    vi.spyOn(adminApi, 'get').mockImplementation((url) => Promise.resolve(
      url === '/admin/guides' ? { data: { guides: [draft] } } : { data: { admin: account, products: [], pagination: { totalPages: 1 } } }
    ));
  });

  it('lists the drafts waiting for a technician, and publishes one after reading it', async () => {
    const put = vi.spyOn(adminApi, 'put').mockImplementation((url, body) => Promise.resolve({ data: { guide: { ...draft, ...body, publishedAt: '2026-10-11T10:00:00Z' } } }));
    renderPage();
    expect(await screen.findByText('1 draft waits', { exact: false })).toBeTruthy();
    expect(screen.getByText('draft')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Edit Eau verte dans la piscine' }));
    fireEvent.click(screen.getByRole('button', { name: /Preview/ }));
    expect(screen.getByRole('heading', { name: 'La méthode' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Write/ }));
    fireEvent.change(screen.getByLabelText('Text of the guide'), { target: { value: '<h2>La méthode</h2><p>Brossez les parois et le fond.</p>' } });
    fireEvent.click(screen.getByLabelText(/Published: visible on \/conseils/));
    fireEvent.click(screen.getByRole('button', { name: /Save the guide/ }));

    expect((await screen.findByRole('status')).textContent).toMatch('Guide saved and on the site');
    expect(put).toHaveBeenCalledWith('/admin/guides/g1', {
      title: draft.title, slug: draft.slug, theme: 'problemes', summary: draft.summary, image: '',
      body: '<h2>La méthode</h2><p>Brossez les parois et le fond.</p>', products: [], published: true
    });
    expect(screen.getByRole('link', { name: /View on the site/ }).getAttribute('href')).toBe('/conseils/eau-verte-piscine');
  });

  it('writes a new guide, and says what the server refused', async () => {
    const post = vi.spyOn(adminApi, 'post').mockRejectedValue({ response: { data: { message: 'The summary is 30 to 160 characters (Google shows about 155)' } } });
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /New guide/ }));
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Hivernage de la piscine' } });
    fireEvent.change(screen.getByLabelText('Theme'), { target: { value: 'saison' } });
    fireEvent.change(screen.getByLabelText(/^Summary/), { target: { value: 'Trop court' } });
    fireEvent.change(screen.getByLabelText('Text of the guide'), { target: { value: '<p>Texte</p>' } });
    fireEvent.click(screen.getByRole('button', { name: /Save the guide/ }));
    expect((await screen.findByRole('alert')).textContent).toMatch('The summary is 30 to 160 characters');
    expect(post).toHaveBeenCalledWith('/admin/guides', expect.objectContaining({ title: 'Hivernage de la piscine', theme: 'saison', published: false }));
  });

  it('deletes a guide only after a confirmation', async () => {
    const remove = vi.spyOn(adminApi, 'delete').mockResolvedValue({ data: {} });
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Edit Eau verte dans la piscine' }));
    fireEvent.click(screen.getByRole('button', { name: /Delete/ }));
    expect(remove).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Yes, delete' }));
    expect(await screen.findByText(/No guide yet/)).toBeTruthy();
    expect(remove).toHaveBeenCalledWith('/admin/guides/g1');
  });
});
