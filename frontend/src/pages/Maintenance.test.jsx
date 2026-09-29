import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import axios from 'axios';
import { CartProvider } from '../context/CartContext';
import { CustomerProvider } from '../context/CustomerContext';
import Maintenance from './Maintenance';
import MaintenanceSubscription from './MaintenanceSubscription';

const shock = { _id: 'aaaaaaaaaaaaaaaaaaaaaaaa', name: 'Chlore choc 5 kg', price: 89, inStock: true };
const calendar = [
  { key: 'opening', month: 4, day: 1, title: 'Remise en route de votre piscine', message: 'Retirez la bâche.', products: [shock] },
  { key: 'winter', month: 11, day: 1, title: 'Préparez l’hivernage', message: 'Couvrez la piscine.', products: [] }
];

const renderPage = () => render(
  <CustomerProvider>
    <CartProvider>
      <MemoryRouter><Maintenance /></MemoryRouter>
    </CartProvider>
  </CustomerProvider>
);

describe('pool care calendar page', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2027, 3, 5));
    vi.spyOn(axios, 'get').mockImplementation((url) => Promise.resolve(url === '/api/maintenance/calendar' ? { data: { reminders: calendar } } : { data: {} }));
  });
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

  it('shows the year’s reminders, the one happening now, and their products', async () => {
    renderPage();
    expect(await screen.findByText('Remise en route de votre piscine')).toBeTruthy();
    expect(screen.getByText('1er avril')).toBeTruthy();
    expect(screen.getByText('En ce moment')).toBeTruthy();
    expect(screen.getByText('Prochain rappel')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Ajouter Chlore choc 5 kg au panier' }));
    await waitFor(() => expect(JSON.parse(localStorage.getItem('cart')).map(i => i._id)).toEqual([shock._id]));
  });

  it('signs up with the volume of the pool drawn in the builder, and WhatsApp when asked', async () => {
    localStorage.setItem('stes-pool-plan', JSON.stringify({ pool: { shape: 'rectangle', length: 8, width: 4, depth: 1.4, x: 1, y: 1 } }));
    const post = vi.spyOn(axios, 'post').mockResolvedValue({ data: { message: 'C’est noté ! Un email de confirmation vous attend.' } });
    renderPage();
    expect(screen.getByLabelText('Volume de votre piscine').value).toBe('44.8');

    fireEvent.change(screen.getByLabelText('Prénom'), { target: { value: 'Sami' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'sami@example.com' } });
    expect(screen.queryByLabelText('Numéro WhatsApp')).toBeNull();
    fireEvent.click(screen.getByLabelText(/Aussi sur WhatsApp/));
    fireEvent.change(screen.getByLabelText('Numéro WhatsApp'), { target: { value: '98 765 432' } });
    fireEvent.click(screen.getByLabelText(/J’accepte de recevoir/));
    fireEvent.click(screen.getByRole('button', { name: /Activer mes rappels/ }));

    expect(await screen.findByText('Vos rappels sont activés')).toBeTruthy();
    expect(post).toHaveBeenCalledWith('/api/maintenance/subscribe', {
      firstName: 'Sami', email: 'sami@example.com', phone: '98 765 432', whatsapp: true, consent: true, volume: 44.8, source: 'page'
    });
  });

  it('works out the volume from the pool’s size', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Calculer depuis les dimensions/ }));
    fireEvent.change(screen.getByLabelText('Longueur (m)'), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText('Largeur (m)'), { target: { value: '5' } });
    expect(screen.getByLabelText('Volume de votre piscine').value).toBe('70');
  });
});

describe('my reminders page', () => {
  const renderManage = (token = 'abc.def') => render(
    <MemoryRouter initialEntries={[`/entretien/mes-rappels?token=${token}`]}>
      <Routes><Route path="/entretien/mes-rappels" element={<MaintenanceSubscription />} /></Routes>
    </MemoryRouter>
  );
  const mine = { firstName: 'Sami', email: 'sami@example.com', phone: '', volume: 55, channels: { email: true, whatsapp: false } };
  afterEach(() => vi.restoreAllMocks());

  it('changes the volume and adds WhatsApp', async () => {
    vi.spyOn(axios, 'get').mockResolvedValue({ data: mine });
    const put = vi.spyOn(axios, 'put').mockResolvedValue({ data: { message: 'Vos rappels sont à jour' } });
    renderManage();
    expect((await screen.findByLabelText(/Volume de la piscine/)).value).toBe('55');
    fireEvent.change(screen.getByLabelText(/Volume de la piscine/), { target: { value: '60' } });
    fireEvent.click(screen.getByLabelText('Sur WhatsApp'));
    fireEvent.change(screen.getByLabelText('Numéro WhatsApp'), { target: { value: '98765432' } });
    fireEvent.click(screen.getByRole('button', { name: /Enregistrer/ }));
    expect((await screen.findByRole('status')).textContent).toMatch('Vos rappels sont à jour');
    expect(put).toHaveBeenCalledWith('/api/maintenance/subscription/abc.def', { volume: 60, phone: '98765432', channels: { email: true, whatsapp: true } });
  });

  it('stops the reminders after a confirmation', async () => {
    vi.spyOn(axios, 'get').mockResolvedValue({ data: mine });
    const del = vi.spyOn(axios, 'delete').mockResolvedValue({ data: {} });
    renderManage();
    fireEvent.click(await screen.findByRole('button', { name: /Arrêter mes rappels/ }));
    expect(del).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /Oui, arrêter/ }));
    expect(await screen.findByText('C’est fait')).toBeTruthy();
    expect(del).toHaveBeenCalledWith('/api/maintenance/subscription/abc.def');
  });

  it('says so when the link is no longer valid', async () => {
    vi.spyOn(axios, 'get').mockRejectedValue({ response: { status: 404 } });
    renderManage();
    expect(await screen.findByText(/Ce lien ne correspond à aucun rappel/)).toBeTruthy();
  });
});
