import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import axios from 'axios';
import { CartProvider } from '../context/CartContext';
import { CustomerProvider } from '../context/CustomerContext';
import { WishlistProvider } from '../context/WishlistContext';
import { LanguageProvider } from '../context/LanguageContext';
import { ShopSettingsContext, DEFAULT_SHOP_SETTINGS } from '../context/shopSettings';
import Guides from './Guides';
import Guide from './Guide';

const verte = { slug: 'eau-verte-piscine', title: 'Eau verte : la rattraper en 48 heures', summary: 'Une eau verte vient d’un manque de chlore.', theme: 'problemes', image: null, readingMinutes: 3, updatedAt: '2026-10-01T10:00:00Z' };
const pompe = { slug: 'choisir-pompe', title: 'Bien choisir sa pompe', summary: 'Débit, puissance, vitesse variable.', theme: 'equipement', image: null, readingMinutes: 2, updatedAt: '2026-10-02T10:00:00Z' };
const trouble = { slug: 'eau-trouble', title: 'Eau trouble : les causes', summary: 'Filtre, pH, floculant.', theme: 'problemes', image: null, readingMinutes: 2, updatedAt: '2026-10-03T10:00:00Z' };
const shock = { _id: 'p1', name: 'Chlore choc 5 kg', price: 89, inStock: true, stockQuantity: 4, category: 'chemicals' };

const renderAt = (url) => render(
  <LanguageProvider>
    <ShopSettingsContext.Provider value={DEFAULT_SHOP_SETTINGS}>
      <CustomerProvider>
        <CartProvider>
          <WishlistProvider>
            <MemoryRouter initialEntries={[url]}>
              <Routes>
                <Route path="/conseils" element={<Guides />} />
                <Route path="/conseils/:slug" element={<Guide />} />
              </Routes>
            </MemoryRouter>
          </WishlistProvider>
        </CartProvider>
      </CustomerProvider>
    </ShopSettingsContext.Provider>
  </LanguageProvider>
);

describe('Conseils', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('lists the guides and filters them by theme', async () => {
    const get = vi.spyOn(axios, 'get').mockImplementation((url, config) => Promise.resolve({
      data: { guides: config?.params?.theme === 'equipement' ? [pompe] : [verte, pompe] }
    }));
    renderAt('/conseils');
    expect(await screen.findByRole('link', { name: /Eau verte : la rattraper en 48 heures/ })).toBeTruthy();
    expect(screen.getByRole('link', { name: /Eau verte/ }).getAttribute('href')).toBe('/conseils/eau-verte-piscine');
    expect(screen.getAllByText('3 min de lecture')).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: 'Équipement' }));
    await waitFor(() => expect(screen.queryByText('Eau verte : la rattraper en 48 heures')).toBeNull());
    expect(get).toHaveBeenLastCalledWith('/api/guides', { params: { theme: 'equipement' } });
    expect(screen.getByRole('button', { name: 'Équipement' }).getAttribute('aria-pressed')).toBe('true');
  });

  it('shows a guide with its text, its products and more of its theme', async () => {
    vi.spyOn(axios, 'get').mockImplementation((url) => Promise.resolve(url === '/api/guides/eau-verte-piscine'
      ? { data: { guide: { ...verte, body: '<h2>La méthode</h2><p>Brossez les parois.</p>' }, products: [shock], related: [trouble] } }
      : { data: {} }));
    renderAt('/conseils/eau-verte-piscine');
    expect(await screen.findByRole('heading', { level: 1, name: 'Eau verte : la rattraper en 48 heures' })).toBeTruthy();
    expect(screen.getByRole('heading', { level: 2, name: 'La méthode' })).toBeTruthy();
    expect(screen.getByText('Brossez les parois.')).toBeTruthy();
    expect(screen.getByText('Chlore choc 5 kg')).toBeTruthy();
    expect(screen.getByRole('link', { name: /Eau trouble : les causes/ }).getAttribute('href')).toBe('/conseils/eau-trouble');
    expect(screen.getByRole('link', { name: /WhatsApp/ }).getAttribute('href')).toBe('https://wa.me/21612345678');
    expect(document.title).toMatch('Eau verte : la rattraper en 48 heures');
  });

  it('says when a guide is not online', async () => {
    vi.spyOn(axios, 'get').mockRejectedValue({ response: { status: 404 } });
    renderAt('/conseils/brouillon');
    expect(await screen.findByRole('heading', { name: 'Conseil introuvable' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Voir tous les conseils' }).getAttribute('href')).toBe('/conseils');
  });
});
