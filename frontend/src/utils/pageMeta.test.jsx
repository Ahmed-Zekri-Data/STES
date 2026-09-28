import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { applyPageMeta, metaForPath, productMeta, summary } from './pageMeta';
import RouteMeta from '../components/layout/RouteMeta';

const SITE = 'https://stes.tn';
const head = (selector, attribute = 'content') => document.head.querySelector(selector)?.getAttribute(attribute) ?? null;
const pageData = () => JSON.parse(document.getElementById('page-data')?.textContent || 'null');

const product = {
  _id: 'p1',
  name: 'Pompe Hayward 1CV',
  description: 'Pompe de filtration silencieuse.',
  price: 649.5,
  category: 'pumps',
  categoryName: 'Pompes',
  brand: 'Hayward',
  image: '/api/uploads/products/pompe.webp',
  inStock: true,
  stockQuantity: 4,
  ratingStats: { averageRating: 4.25, totalReviews: 8 }
};

describe('page titles and search-engine tags', () => {
  beforeEach(() => {
    document.head.innerHTML = '<meta name="description" content="Generic" />';
    document.title = 'Generic';
  });

  it('knows the public, private and unknown pages', () => {
    expect(metaForPath('/services/')).toMatchObject({ title: 'Installation et entretien de piscines', path: '/services' });
    expect(metaForPath('/admin/orders')).toEqual({ title: 'Administration', noindex: true });
    expect(metaForPath('/payment/success')).toEqual({ title: 'Paiement', noindex: true });
    expect(metaForPath('/cartes')).toEqual({ title: 'Page introuvable', noindex: true });
  });

  it('describes a product for previews and search engines', () => {
    applyPageMeta(productMeta(product, SITE), document, SITE);
    expect(document.title).toBe('Pompe Hayward 1CV | STES.tn');
    expect(head('meta[name="description"]')).toBe('Pompe de filtration silencieuse.');
    expect(head('link[rel="canonical"]', 'href')).toBe('https://stes.tn/product/p1');
    expect(head('meta[property="og:image"]')).toBe('https://stes.tn/api/uploads/products/pompe.webp');
    expect(head('meta[property="product:price:amount"]')).toBe('649.500');
    const [data, breadcrumb] = pageData()['@graph'];
    expect(data.offers).toMatchObject({ price: 649.5, priceCurrency: 'TND', availability: 'https://schema.org/InStock' });
    expect(data.brand).toEqual({ '@type': 'Brand', name: 'Hayward' });
    expect(data.aggregateRating.ratingValue).toBe(4.3);
    expect(breadcrumb.itemListElement[2]).toMatchObject({ name: 'Pompes', item: 'https://stes.tn/shop?category=pumps' });
  });

  it('clears what the previous page set', () => {
    applyPageMeta(productMeta(product, SITE), document, SITE);
    applyPageMeta({ title: 'Panier', noindex: true }, document, SITE);
    expect(document.title).toBe('Panier | STES.tn');
    expect(head('meta[name="robots"]')).toBe('noindex');
    expect(head('link[rel="canonical"]', 'href')).toBeNull();
    expect(head('meta[property="product:price:amount"]')).toBeNull();
    expect(head('meta[property="og:image"]')).toBe('https://stes.tn/og-image.png');
    expect(document.getElementById('page-data')).toBeNull();
    expect(document.head.querySelectorAll('meta[name="description"]')).toHaveLength(1);
  });

  it('uses the shop picture for products without a photo, and says when one is sold out', () => {
    const meta = productMeta({ ...product, image: '/api/placeholder/300/200', stockQuantity: 0, inStock: false }, SITE);
    expect(meta.image).toBe('https://stes.tn/og-image.png');
    expect(meta.jsonLd['@graph'][0].offers.availability).toBe('https://schema.org/OutOfStock');
  });

  it('cuts long descriptions between words', () => {
    const text = 'Pompe '.repeat(40);
    const cut = summary(text);
    expect(cut.length).toBeLessThanOrEqual(160);
    expect(cut).toMatch(/Pompe…$/);
  });

  it('follows the visitor from page to page, leaving the shop and products to set their own', () => {
    const { unmount } = render(<MemoryRouter initialEntries={['/']}><RouteMeta /></MemoryRouter>);
    expect(document.title).toBe('STES.tn – Équipements et installation de piscines en Tunisie');
    expect(pageData()['@graph'][0]).toMatchObject({ '@type': 'Store', telephone: '+216 12 345 678' });
    unmount();

    render(<MemoryRouter initialEntries={['/checkout']}><RouteMeta /></MemoryRouter>);
    expect(document.title).toBe('Commande | STES.tn');
    expect(head('meta[name="robots"]')).toBe('noindex');
    expect(document.getElementById('page-data')).toBeNull();

    document.title = 'Set by the product page';
    render(<MemoryRouter initialEntries={['/product/p1']}><RouteMeta /></MemoryRouter>);
    expect(document.title).toBe('Set by the product page');
  });
});
