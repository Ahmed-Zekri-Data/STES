import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CookieConsent from './CookieConsent';
import { ShopSettingsContext, DEFAULT_SHOP_SETTINGS } from '../context/shopSettings';
import { resetAnalytics } from '../utils/analytics';
import { openCookieChoice } from '../utils/cookieChoice';

const renderBanner = (marketing) => render(
  <ShopSettingsContext.Provider value={{ ...DEFAULT_SHOP_SETTINGS, marketing: { ...DEFAULT_SHOP_SETTINGS.marketing, ...marketing } }}>
    <MemoryRouter><CookieConsent /></MemoryRouter>
  </ShopSettingsContext.Provider>
);

describe('cookie consent', () => {
  beforeEach(() => {
    localStorage.clear();
    document.head.innerHTML = '';
    delete window.gtag;
    delete window.dataLayer;
    resetAnalytics();
  });

  it('asks nothing while no measurement is set up', () => {
    renderBanner({});
    expect(screen.queryByText('Mesure d’audience et publicités')).toBeNull();
  });

  it('asks once, measures after "Accepter", and can be asked again from the footer', () => {
    renderBanner({ gaMeasurementId: 'G-TEST123' });
    expect(screen.getByText('Mesure d’audience et publicités')).toBeTruthy();
    expect(document.head.querySelector('script')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Accepter' }));
    expect(screen.queryByText('Mesure d’audience et publicités')).toBeNull();
    expect(localStorage.getItem('stes-cookies')).toBe('granted');
    expect(document.head.querySelector('script').src).toBe('https://www.googletagmanager.com/gtag/js?id=G-TEST123');
    // The page being shown is counted
    expect([...window.dataLayer].map(args => args[1])).toContain('page_view');

    act(() => openCookieChoice());
    fireEvent.click(screen.getByRole('button', { name: 'Refuser' }));
    expect(localStorage.getItem('stes-cookies')).toBe('denied');
    expect(screen.queryByText('Mesure d’audience et publicités')).toBeNull();
  });

  it('keeps a refusal: nothing loads and the banner stays closed', () => {
    localStorage.setItem('stes-cookies', 'denied');
    resetAnalytics();
    renderBanner({ metaPixelId: '123456789012345' });
    expect(screen.queryByText('Mesure d’audience et publicités')).toBeNull();
    expect(document.head.querySelector('script')).toBeNull();
  });
});
