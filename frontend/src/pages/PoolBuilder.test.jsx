import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';
import { CartProvider } from '../context/CartContext';
import { CustomerProvider } from '../context/CustomerContext';
import { ShopSettingsContext, DEFAULT_SHOP_SETTINGS } from '../context/shopSettings';
import PoolBuilder from './PoolBuilder';
import { decodePlan } from '../components/builder/plan';

const pump = { _id: 'aaaaaaaaaaaaaaaaaaaaaaaa', name: 'Pompe Victoria Plus 1 CV', price: 690, category: 'pumps', inStock: true };
const light = { _id: 'bbbbbbbbbbbbbbbbbbbbbbbb', name: 'Projecteur LED', price: 249, category: 'lights', inStock: false };
const offer = { equipment: [{ kind: 'pump', product: pump }, { kind: 'light', product: light }], pricePerM2: { min: 900, max: 1400 } };

const renderBuilder = () => render(
  <ShopSettingsContext.Provider value={DEFAULT_SHOP_SETTINGS}>
    <CustomerProvider>
      <CartProvider>
        <MemoryRouter><PoolBuilder /></MemoryRouter>
      </CartProvider>
    </CustomerProvider>
  </ShopSettingsContext.Provider>
);

describe('pool builder page', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(axios, 'get').mockImplementation((url) => Promise.resolve(url === '/api/builder' ? { data: offer } : { data: {} }));
  });
  afterEach(() => vi.restoreAllMocks());

  it('shows the pool’s figures and the estimate, and follows the sizes typed', async () => {
    renderBuilder();
    expect(await screen.findByText('Pompe Victoria Plus 1 CV')).toBeTruthy();
    expect(screen.getByText('32 m²')).toBeTruthy();
    expect(screen.getByText('44,8 m³')).toBeTruthy();
    expect(screen.getByText('28 800 TND – 44 800 TND')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Longueur'), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ovale' }));
    expect(screen.getByText('31,4 m²')).toBeTruthy();
    // Kept in the browser
    expect(JSON.parse(localStorage.getItem('stes-pool-plan')).pool).toMatchObject({ shape: 'oval', length: 10 });
  });

  it('places equipment, prices it, and adds what is in stock to the cart', async () => {
    renderBuilder();
    fireEvent.click(await screen.findByRole('button', { name: 'Placer Pompe Victoria Plus 1 CV sur le plan' }));
    fireEvent.click(screen.getByRole('button', { name: 'Placer Projecteur LED sur le plan' }));
    fireEvent.click(screen.getByRole('button', { name: 'Placer Projecteur LED sur le plan' }));
    expect(screen.getByText('2 × Projecteur LED')).toBeTruthy();
    expect(screen.getByText('1 188 TND')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: /Flèches pour déplacer, Suppr pour retirer/ })).toHaveLength(3);

    fireEvent.click(screen.getByRole('button', { name: /Ajouter l’équipement au panier/ }));
    await waitFor(() => expect(JSON.parse(localStorage.getItem('cart')).map(i => [i._id, i.quantity])).toEqual([[pump._id, 1]]));
  });

  it('sends the plan with the quote request', async () => {
    const post = vi.spyOn(axios, 'post').mockResolvedValue({ data: {} });
    renderBuilder();
    fireEvent.click(await screen.findByRole('button', { name: 'Placer Pompe Victoria Plus 1 CV sur le plan' }));
    fireEvent.click(screen.getByRole('button', { name: /Recevoir mon devis gratuit/ }));
    fireEvent.change(screen.getByLabelText('Nom'), { target: { value: 'Leila Trabelsi' } });
    fireEvent.change(screen.getByLabelText('Téléphone'), { target: { value: '+216 98 765 432' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'leila@example.com' } });
    fireEvent.change(screen.getByLabelText('Ville'), { target: { value: 'Hammamet' } });
    fireEvent.click(screen.getByRole('button', { name: /Envoyer mon projet/ }));

    expect(await screen.findByText('Projet envoyé !')).toBeTruthy();
    const [url, body] = post.mock.calls[0];
    expect(url).toBe('/api/forms/quote');
    expect(body).toMatchObject({ name: 'Leila Trabelsi', city: 'Hammamet', message: undefined, plan: { shape: 'rectangle', length: 8, width: 4, depth: 1.4, items: [{ product: pump._id, quantity: 1 }] } });
    expect(decodePlan(body.plan.link.split('plan=')[1]).items).toHaveLength(1);
  });

  it('opens a plan shared by link', async () => {
    window.history.pushState({}, '', '/construire?plan=' + 'eyJnIjpbMjAsMTRdLCJwIjpbIm92YWwiLDIsMiwxMiw2LDEuOF0sImkiOltdfQ');
    renderBuilder();
    expect((await screen.findByLabelText('Longueur')).value).toBe('12');
    expect(screen.getByRole('button', { name: 'Ovale' }).getAttribute('aria-pressed')).toBe('true');
    window.history.pushState({}, '', '/');
  });
});
