import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import adminApi from '../../utils/adminApi';
import { AdminProvider } from '../../context/AdminContext';
import AdminSettings from './AdminSettings';
import Reminders from './Reminders';

const account = { id: 'a1', username: 'mariem', email: 'mariem@stes.tn', firstName: 'Mariem', lastName: 'Jaziri', fullName: 'Mariem Jaziri', role: 'admin', permissions: ['settings', 'forms', 'products'] };
const products = [{ _id: 'p1', name: 'Chlore choc 5 kg', price: 89, stockQuantity: 5 }];
const calendar = [
  { key: 'opening', month: 4, day: 1, title: 'Remise en route de votre piscine', message: 'Retirez la bâche.', products: [], active: true },
  { key: 'winter', month: 11, day: 1, title: 'Préparez l’hivernage', message: 'Couvrez la piscine.', products: [], active: true }
];
const sami = { _id: 's1', firstName: 'Sami', email: 'sami@example.com', phone: '+21698765432', channels: { email: true, whatsapp: true }, volume: 55, source: 'builder', sent: [], confirmedAt: '2027-03-01T10:05:00Z', createdAt: '2027-03-01T10:00:00Z' };
const nour = { _id: 's2', firstName: 'Nour', email: 'nour@example.com', channels: { email: true, whatsapp: false }, source: 'page', sent: [], createdAt: '2027-03-02T10:00:00Z' };

// Types in a product search box and picks the option
const choose = (input, text, option) => {
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: text } });
  fireEvent.mouseDown(screen.getByRole('option', { name: option }));
};

const renderWith = (element, path) => render(<AdminProvider><MemoryRouter initialEntries={[path]}>{element}</MemoryRouter></AdminProvider>);

describe('admin reminders', () => {
  let queue;
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('adminToken', 'session');
    localStorage.setItem('adminUser', JSON.stringify(account));
    queue = [{ key: 'opening', year: 2027, title: 'Remise en route de votre piscine', people: [{ _id: 's1', firstName: 'Sami', phone: '+21698765432', volume: 55, link: 'https://wa.me/21698765432?text=Bonjour' }] }];
    vi.spyOn(adminApi, 'get').mockImplementation((url) => Promise.resolve(
      url === '/admin/settings' ? { data: { reminders: { calendar } } }
        : url === '/admin/products' ? { data: { products, pagination: { totalPages: 1 } } }
          : url === '/admin/maintenance' ? { data: { total: 2, subscribers: [nour, sami], whatsapp: queue, emailConfigured: false } }
            : { data: { admin: account } }
    ));
  });
  afterEach(() => vi.restoreAllMocks());

  it('lists the WhatsApp reminders to send, and marks them sent', async () => {
    const post = vi.spyOn(adminApi, 'post').mockImplementation(() => { queue = []; return Promise.resolve({ data: {} }); });
    renderWith(<Reminders />, '/admin/reminders');

    const open = await screen.findByRole('link', { name: /Open WhatsApp/ });
    expect(open.getAttribute('href')).toBe('https://wa.me/21698765432?text=Bonjour');
    expect(screen.getByText(/Emails are not set up yet/)).toBeTruthy();
    expect(screen.getByText('Subscribers (2)')).toBeTruthy();
    // Only the sign-up not confirmed yet says so
    expect(screen.getAllByText('awaiting confirmation')).toHaveLength(1);
    expect(screen.getByText('awaiting confirmation').closest('td').textContent).toMatch('Nour');

    fireEvent.click(screen.getByRole('button', { name: /Mark as sent/ }));
    await waitFor(() => expect(screen.getByText('Nothing to send today.')).toBeTruthy());
    expect(post).toHaveBeenCalledWith('/admin/maintenance/s1/sent', { key: 'opening', year: 2027 });
  });

  it('edits the calendar in Settings → Reminders', async () => {
    const put = vi.spyOn(adminApi, 'put').mockImplementation((url, body) => Promise.resolve({ data: { settings: { reminders: body.reminders } } }));
    renderWith(<AdminSettings />, '/admin/settings?tab=reminders');

    fireEvent.change(await screen.findByLabelText('Day', { selector: '#opening-day' }), { target: { value: '15' } });
    fireEvent.change(screen.getAllByLabelText('Month')[0], { target: { value: '3' } });
    choose(document.getElementById('opening-products'), 'chlore', /Chlore choc 5 kg/);
    fireEvent.click(screen.getAllByLabelText('Send this reminder')[1]);
    fireEvent.click(screen.getByRole('button', { name: /Save the reminders/ }));

    expect((await screen.findByRole('status')).textContent).toMatch('Reminders saved');
    expect(put.mock.calls[0][1].reminders.calendar).toEqual([
      { key: 'opening', month: 3, day: 15, title: 'Remise en route de votre piscine', message: 'Retirez la bâche.', products: ['p1'], active: true },
      { key: 'winter', month: 11, day: 1, title: 'Préparez l’hivernage', message: 'Couvrez la piscine.', products: [], active: false }
    ]);
  });
});
