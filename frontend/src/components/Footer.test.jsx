import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';
import Footer from './Footer';
import { LanguageProvider } from '../context/LanguageContext';
import { ShopSettingsContext, DEFAULT_SHOP_SETTINGS } from '../context/shopSettings';
import { OPEN_COOKIE_CHOICE } from '../utils/cookieChoice';

const renderFooter = (marketing) => render(
  <LanguageProvider>
    <ShopSettingsContext.Provider value={{ ...DEFAULT_SHOP_SETTINGS, marketing: { ...DEFAULT_SHOP_SETTINGS.marketing, ...marketing } }}>
      <MemoryRouter><Footer /></MemoryRouter>
    </ShopSettingsContext.Provider>
  </LanguageProvider>
);

describe('footer', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(axios, 'get').mockResolvedValue({ data: { categories: {} } });
  });

  it('links to the social pages set in Admin, and offers the cookie choice when measuring', () => {
    const asked = vi.fn();
    window.addEventListener(OPEN_COOKIE_CHOICE, asked);
    renderFooter({ facebookUrl: 'https://www.facebook.com/stes', instagramUrl: 'https://www.instagram.com/stes', gaMeasurementId: 'G-TEST123' });
    expect(screen.getByRole('link', { name: 'STES sur Facebook' }).getAttribute('href')).toBe('https://www.facebook.com/stes');
    expect(screen.getByRole('link', { name: 'STES sur Instagram' }).getAttribute('href')).toBe('https://www.instagram.com/stes');
    expect(screen.queryByRole('link', { name: 'STES sur TikTok' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Cookies' }));
    expect(asked).toHaveBeenCalledTimes(1);
    window.removeEventListener(OPEN_COOKIE_CHOICE, asked);
  });

  it('shows no social icons and no cookie link while nothing is set up', () => {
    renderFooter({});
    expect(screen.queryByRole('list', { name: 'STES sur les réseaux sociaux' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Cookies' })).toBeNull();
  });
});
