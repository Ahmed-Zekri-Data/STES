import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PromoCodeBox from './PromoCodeBox';

const checkout = {
  quote: null,
  promoError: '',
  promoChecking: false,
  applyPromo: vi.fn(),
  removePromo: vi.fn()
};

vi.mock('../../context/CheckoutContext', () => ({
  useCheckout: () => checkout
}));

describe('promo code box', () => {
  beforeEach(() => {
    Object.assign(checkout, { quote: null, promoError: '', promoChecking: false });
    checkout.applyPromo.mockClear();
    checkout.removePromo.mockClear();
  });

  it('sends the typed code to be checked', () => {
    render(<PromoCodeBox />);
    const button = screen.getByRole('button', { name: 'Appliquer' });
    expect(button.disabled).toBe(true);

    fireEvent.change(screen.getByLabelText('Code promo'), { target: { value: 'summer10' } });
    fireEvent.click(button);
    expect(checkout.applyPromo).toHaveBeenCalledWith('summer10');
  });

  it('explains a refused code next to the field', () => {
    checkout.promoError = 'Ce code promo a expiré.';
    render(<PromoCodeBox />);
    expect(screen.getByRole('alert').textContent).toBe('Ce code promo a expiré.');
    expect(screen.getByLabelText('Code promo').getAttribute('aria-invalid')).toBe('true');
  });

  it('shows the applied code and its discount, and removes it', () => {
    checkout.quote = { discountCode: 'SUMMER10', discountAmount: 20 };
    render(<PromoCodeBox />);
    expect(screen.getByText('SUMMER10')).toBeTruthy();
    expect(screen.getByText('Code appliqué : −20.000 TND')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Retirer le code SUMMER10' }));
    expect(checkout.removePromo).toHaveBeenCalled();
  });
});
