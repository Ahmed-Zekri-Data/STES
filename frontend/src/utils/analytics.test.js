import { describe, it, expect, beforeEach } from 'vitest';
import { configureAnalytics, setConsent, track, trackPage, resetAnalytics, measuring } from './analytics';

const scripts = () => [...document.head.querySelectorAll('script')].map(s => s.src);
// The calls each service received (gtag's arguments objects, fbq's queue)
const gaCalls = () => (window.dataLayer || []).map(args => [...args]);
const metaCalls = () => (window.fbq?.queue || []).map(args => [...args]);

describe('audience measurement', () => {
  beforeEach(() => {
    localStorage.clear();
    document.head.innerHTML = '';
    delete window.gtag;
    delete window.dataLayer;
    delete window.fbq;
    delete window._fbq;
    resetAnalytics();
  });

  it('loads and sends nothing before the visitor accepts, nor after a refusal', () => {
    configureAnalytics({ gaMeasurementId: 'G-TEST123', metaPixelId: '123456789012345' });
    expect(measuring()).toBe(true);
    track('add_to_cart', { items: [{ id: 'p1', name: 'Pompe', price: 865, quantity: 1 }] });
    trackPage('/shop');
    expect(scripts()).toEqual([]);
    expect(window.gtag).toBeUndefined();

    setConsent('denied');
    trackPage('/shop');
    expect(scripts()).toEqual([]);
    expect(localStorage.getItem('stes-cookies')).toBe('denied');
  });

  it('loads Google and Meta once accepted, and sends the shop events to both', () => {
    configureAnalytics({ gaMeasurementId: 'G-TEST123', metaPixelId: '123456789012345' });
    setConsent('granted');
    expect(scripts()).toEqual([
      'https://www.googletagmanager.com/gtag/js?id=G-TEST123',
      'https://connect.facebook.net/en_US/fbevents.js'
    ]);
    expect(gaCalls()[1]).toEqual(['config', 'G-TEST123', { send_page_view: false }]);
    expect(metaCalls()[0]).toEqual(['init', '123456789012345']);

    trackPage('/shop?search=pompe');
    track('purchase', {
      orderNumber: 'ORD-1',
      value: 1738,
      items: [{ id: 'p1', name: 'Pompe Victoria', price: 865, quantity: 2, variant: '65557' }]
    });
    const [pageView, purchase] = gaCalls().slice(2);
    expect(pageView.slice(0, 2)).toEqual(['event', 'page_view']);
    expect(pageView[2].page_path).toBe('/shop?search=pompe');
    expect(purchase).toEqual(['event', 'purchase', {
      currency: 'TND', value: 1738, transaction_id: 'ORD-1',
      items: [{ item_id: 'p1', item_name: 'Pompe Victoria', price: 865, quantity: 2, item_variant: '65557' }]
    }]);
    expect(metaCalls().slice(1)).toEqual([
      ['track', 'PageView'],
      ['track', 'Purchase', { currency: 'TND', value: 1738, content_type: 'product', content_ids: ['p1'], contents: [{ id: 'p1', quantity: 2 }], num_items: 2 }, { eventID: 'ORD-1' }]
    ]);
  });

  it('counts a price on request as 0, and names leads, searches and sign-ups', () => {
    configureAnalytics({ gaMeasurementId: 'G-TEST123' });
    setConsent('granted');
    track('view_item', { items: [{ id: 'p2', name: 'Robot', price: null }] });
    track('generate_lead', { form: 'pool_builder' });
    track('search', { term: 'echelle' });
    track('sign_up');
    expect(gaCalls().slice(2)).toEqual([
      ['event', 'view_item', { currency: 'TND', value: 0, items: [{ item_id: 'p2', item_name: 'Robot', price: 0, quantity: 1 }] }],
      ['event', 'generate_lead', { form: 'pool_builder' }],
      ['event', 'search', { search_term: 'echelle' }],
      ['event', 'sign_up', { method: 'email' }]
    ]);
    // Only Google is set up: no Meta script
    expect(scripts()).toEqual(['https://www.googletagmanager.com/gtag/js?id=G-TEST123']);
  });

  it('remembers the choice for the next visit', () => {
    setConsent('granted');
    resetAnalytics();
    configureAnalytics({ metaPixelId: '123456789012345' });
    expect(scripts()).toEqual(['https://connect.facebook.net/en_US/fbevents.js']);
  });
});
