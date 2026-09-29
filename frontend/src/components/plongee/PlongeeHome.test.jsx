import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';
import { ThemeProvider } from '../../context/ThemeContext';
import { LanguageProvider } from '../../context/LanguageContext';
import { CartProvider } from '../../context/CartContext';
import { ShopSettingsContext, DEFAULT_SHOP_SETTINGS } from '../../context/shopSettings';
import PlongeeHome from './PlongeeHome';

// The 3D scene and the sounds need a graphics card and speakers
const scene = { measure: vi.fn(), impact: vi.fn(), skipIntro: vi.fn(), dispose: vi.fn(), setWater: vi.fn(), setPreview: vi.fn() };
vi.mock('./PlongeeScene', () => ({
  createPlongeeScene: vi.fn(async ({ onFirstFrame }) => { onFirstFrame(); return scene; })
}));
vi.mock('./audio', () => ({ createSoundscape: () => ({ toggle: () => true, update() {}, bloop() {}, splash() {}, close() {} }) }));

const products = [
  { _id: 'p1', name: 'Filtre à Sable Premium', price: 450, category: 'filtration', categoryName: 'Filtration', stockQuantity: 5, inStock: true },
  { _id: 'p2', name: 'Chlore Granulé 5kg', price: 65, category: 'chemicals', categoryName: 'Produits Chimiques', stockQuantity: 9, inStock: true }
];

const card = (p) => ({ ...p, inStock: true });
const pack = { _id: 'k1', name: 'Pack ouverture de saison', price: 139, inStock: true };
const showcase = {
  hotspots: { pump: null, filter: null, robot: null, lights: null, ring: null },
  problems: {
    green: { products: [card(products[1]), { _id: 'p3', name: 'Algicide 1L', price: 45, inStock: false }], total: 110 },
    cloudy: { products: [], total: 0 }, dirty: { products: [], total: 0 }, cold: { products: [], total: 0 }
  },
  configurator: { sizes: [{ label: '8 × 4 m', pump: null, filter: card(products[0]) }], lights: null, options: [] },
  packs: [{ product: pack, season: 'Avril – mai', includes: [card(products[1])], worth: 160, saving: 21 }],
  map: { governorates: [{ governorate: 'sousse', count: 4 }, { governorate: 'gabes', count: 2 }], orders: 6 },
  reviews: [{ _id: 'r1', rating: 5, comment: 'Pompe très silencieuse, installée en une matinée.', author: 'Leila T.', productId: 'p1', productName: 'Filtre à Sable Premium' }],
  partnerBadge: 'Partenaire agréé AstralPool'
};

const renderHome = () => render(
  <ThemeProvider>
    <LanguageProvider>
      <ShopSettingsContext.Provider value={{ ...DEFAULT_SHOP_SETTINGS, contact: { ...DEFAULT_SHOP_SETTINGS.contact, whatsapp: '+216 98 765 432', phone: '+216 71 234 567' } }}>
        <CartProvider>
          <MemoryRouter>
            <PlongeeHome />
          </MemoryRouter>
        </CartProvider>
      </ShopSettingsContext.Provider>
    </LanguageProvider>
  </ThemeProvider>
);

const withWebGL = (available) => vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => (available ? {} : null));

describe('home page (Plongée)', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.spyOn(axios, 'get').mockImplementation((url) => Promise.resolve(
      url === '/api/products/categories' ? { data: { categories: { filtration: { name: 'Filtration', description: 'Filtres à sable et à cartouche' }, chemicals: { name: 'Produits Chimiques' } } } }
        : url === '/api/showcase' ? { data: showcase }
          : { data: { products } }));
    window.scrollTo = vi.fn();
    Element.prototype.scrollIntoView = vi.fn();
  });
  afterEach(() => vi.restoreAllMocks());

  it('shows the real categories, products and contact details, and adds to the cart', async () => {
    withWebGL(false);
    renderHome();

    expect(await screen.findByRole('link', { name: /Filtration/ })).toHaveProperty('href', expect.stringContaining('/shop?category=filtration'));
    expect(screen.getByText('Filtres à sable et à cartouche')).toBeTruthy();
    expect(await screen.findAllByText('Filtre à Sable Premium')).toBeTruthy();
    expect(screen.getAllByText('450 TND').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: /WhatsApp/ }).getAttribute('href')).toBe('https://wa.me/21698765432');
    expect(screen.getByRole('link', { name: /\+216 71 234 567/ }).getAttribute('href')).toBe('tel:+21671234567');

    fireEvent.click(screen.getByRole('button', { name: 'Ajouter Chlore Granulé 5kg au panier' }));
    await waitFor(() => expect(JSON.parse(localStorage.getItem('cart'))).toEqual([expect.objectContaining({ _id: 'p2', quantity: 1 })]));
  });

  it('without WebGL, shows the page flat: no opening, no goggles, a link to the shop', async () => {
    withWebGL(false);
    renderHome();
    expect(screen.queryByRole('dialog', { name: 'Bienvenue chez STES' })).toBeNull();
    expect(screen.queryByRole('button', { name: /Mettre mes lunettes/ })).toBeNull();
    expect(screen.getAllByRole('link', { name: /Voir la boutique/ }).length).toBeGreaterThan(0);
    await screen.findAllByText('Filtre à Sable Premium');
  });

  it('plays the opening once per visit, and the skip button ends it', async () => {
    withWebGL(true);
    const { unmount } = renderHome();
    const intro = await screen.findByRole('dialog', { name: 'Bienvenue chez STES' });
    expect(document.documentElement.classList.contains('pl-locked')).toBe(true);
    fireEvent.click(await screen.findByRole('button', { name: 'Passer l’intro' }));
    await waitFor(() => expect(intro.isConnected).toBe(false));
    expect(scene.skipIntro).toHaveBeenCalled();
    expect(document.documentElement.classList.contains('pl-locked')).toBe(false);
    expect(sessionStorage.getItem('stes-intro')).toBe('1');
    unmount();
    expect(scene.dispose).toHaveBeenCalled();

    // Same visit: straight to the page
    renderHome();
    await waitFor(() => expect(screen.queryByText('Marhba.')).toBeNull());
  });

  it('guides first-time visitors once', async () => {
    withWebGL(true);
    sessionStorage.setItem('stes-intro', '1');
    renderHome();
    const tour = await screen.findByRole('dialog', { name: 'Visite guidée' }, { timeout: 3000 });
    expect(tour.textContent).toContain('Faites défiler');
    fireEvent.click(screen.getByRole('button', { name: 'Passer' }));
    expect(screen.queryByRole('dialog', { name: 'Visite guidée' })).toBeNull();
    expect(localStorage.getItem('stes-tour')).toBe('1');
  });
});

describe('home page selling sections', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.spyOn(axios, 'get').mockImplementation((url) => Promise.resolve(url === '/api/showcase' ? { data: showcase } : { data: url === '/api/products/categories' ? { categories: {} } : { products } }));
    window.scrollTo = vi.fn();
    withWebGL(false);
  });
  afterEach(() => vi.restoreAllMocks());

  it('offers only the water problems with products, and adds what is in stock', async () => {
    renderHome();
    expect(await screen.findByRole('button', { name: /Eau verte/ })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Eau trouble/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Eau verte/ }));
    expect(screen.getByText('Des algues se développent')).toBeTruthy();
    expect(screen.getByText('Rupture')).toBeTruthy();
    expect(screen.getByText('110 TND')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Tout ajouter au panier' }));
    await waitFor(() => expect(JSON.parse(localStorage.getItem('cart')).map(i => i._id)).toEqual(['p2']));
  });

  it('prices the configurator kit and the packs from real products', async () => {
    renderHome();
    expect(await screen.findByText('Composez')).toBeTruthy();
    expect(screen.getAllByText('450 TND').length).toBeGreaterThan(0);
    expect(screen.getByText('Économisez 21 TND')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter le kit au panier' }));
    await waitFor(() => expect(JSON.parse(localStorage.getItem('cart'))).toEqual([expect.objectContaining({ _id: 'p1', quantity: 1 })]));
  });

  it('shows the orders map, real reviews and the partner badge', async () => {
    renderHome();
    expect(await screen.findByRole('img', { name: /Sousse 4, Gabès 2/ })).toBeTruthy();
    expect(screen.getByText(/dans 2 gouvernorats/)).toBeTruthy();
    expect(screen.getByText(/Pompe très silencieuse/)).toBeTruthy();
    expect(screen.getByText(/Leila T./)).toBeTruthy();
    expect(screen.getAllByText('Partenaire agréé AstralPool').length).toBeGreaterThan(0);
  });
});
