import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CartProvider, useCart } from './CartContext';

const CartView = () => {
  const { cartItems, addToCart, updateQuantity } = useCart();
  return (
    <div>
      <p data-testid="items">{cartItems.map(item => `${item.name} x${item.quantity}`).join(', ')}</p>
      <button onClick={() => addToCart({ _id: 'p2', name: 'Chlore', price: 65 })}>add</button>
      <button onClick={() => updateQuantity('p1', 0)}>remove pump</button>
    </div>
  );
};

const renderCart = () => render(<CartProvider><CartView /></CartProvider>);
const saved = () => JSON.parse(localStorage.getItem('cart'));

describe('cart', () => {
  beforeEach(() => localStorage.clear());

  it('keeps the cart after a page reload', () => {
    localStorage.setItem('cart', JSON.stringify([{ _id: 'p1', name: 'Pompe', price: 850, quantity: 2 }]));

    renderCart();

    expect(screen.getByTestId('items').textContent).toBe('Pompe x2');
    // It used to be overwritten with an empty cart on load
    expect(saved()).toHaveLength(1);
  });

  it('saves changes, and adding the same product again increases its quantity', () => {
    localStorage.setItem('cart', JSON.stringify([{ _id: 'p1', name: 'Pompe', price: 850, quantity: 1 }]));
    renderCart();

    fireEvent.click(screen.getByText('add'));
    fireEvent.click(screen.getByText('add'));
    fireEvent.click(screen.getByText('remove pump'));

    expect(screen.getByTestId('items').textContent).toBe('Chlore x2');
    expect(saved()).toEqual([{ _id: 'p2', name: 'Chlore', price: 65, quantity: 2 }]);
  });

  it('starts empty when the saved cart is unreadable', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    localStorage.setItem('cart', '{not json');
    renderCart();
    expect(screen.getByTestId('items').textContent).toBe('');
  });
});
