import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../../context/LanguageContext';
import { CustomerProvider } from '../../context/CustomerContext';
import { WishlistProvider } from '../../context/WishlistContext';
import { CartProvider } from '../../context/CartContext';
import ProductCard from './ProductCard';

const product = { _id: '6ab7b144f9e210e44d7235b0', name: 'Filtre à Sable Premium', price: 450, image: '/img/filtre.jpg', category: 'filters', categoryName: 'Filtration' };

const renderCard = (overrides = {}) => render(
  <LanguageProvider>
    <CustomerProvider>
      <WishlistProvider>
        <CartProvider>
          <MemoryRouter><ProductCard product={{ ...product, ...overrides }} /></MemoryRouter>
        </CartProvider>
      </WishlistProvider>
    </CustomerProvider>
  </LanguageProvider>
);

describe('product card', () => {
  beforeEach(() => localStorage.clear());

  it('links to the real product and shows its category name', () => {
    renderCard();
    expect(screen.getByRole('link', { name: /Voir Détails/ }).getAttribute('href')).toBe(`/product/${product._id}`);
    expect(screen.getByRole('link', { name: `Voir ${product.name}` }).getAttribute('href')).toBe(`/product/${product._id}`);
    expect(screen.getByText('Filtration')).toBeTruthy();
  });

  it('adds the product to the cart', () => {
    renderCard();
    fireEvent.click(screen.getByRole('button', { name: `Ajouter ${product.name} au panier` }));
    expect(JSON.parse(localStorage.getItem('cart'))).toEqual([expect.objectContaining({ _id: product._id, quantity: 1 })]);
  });

  it('sends products with versions or a price on request to their page', () => {
    const { unmount } = renderCard({ variants: [{ sku: '1', label: 'A', price: 450, stockQuantity: 2 }, { sku: '2', label: 'B', price: 520, stockQuantity: 0 }] });
    expect(screen.getByText('dès')).toBeTruthy();
    expect(screen.getByRole('link', { name: `Choisir la version de ${product.name}` }).getAttribute('href')).toBe(`/product/${product._id}`);
    expect(screen.queryByRole('button', { name: /au panier/ })).toBeNull();
    unmount();

    renderCard({ priceOnRequest: true, price: 0 });
    expect(screen.getByText('Prix sur demande')).toBeTruthy();
    expect(screen.getByRole('link', { name: `Demander le prix de ${product.name}` })).toBeTruthy();
  });

  it('can still be bought "sur commande" when out of stock', () => {
    renderCard({ inStock: false, stockQuantity: 0, backorder: true });
    expect(screen.getByText('Sur commande')).toBeTruthy();
    expect(screen.queryByText('Rupture de stock')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: `Ajouter ${product.name} au panier` }));
    expect(JSON.parse(localStorage.getItem('cart'))).toHaveLength(1);
  });

  it('shows a rating only when there are reviews', () => {
    const { unmount } = renderCard();
    expect(screen.queryByLabelText(/Note/)).toBeNull();
    unmount();
    renderCard({ ratingStats: { averageRating: 4.2, totalReviews: 3 } });
    expect(screen.getByLabelText('Note 4.2 sur 5')).toBeTruthy();
  });
});
