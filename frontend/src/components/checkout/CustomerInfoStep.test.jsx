import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CustomerInfoStep from './CustomerInfoStep';
import { isValidTaxId } from '../../utils/taxId';

const checkout = {
  checkoutData: { customer: {} },
  updateCheckoutData: vi.fn((section, values) => { checkout.checkoutData.customer = { ...checkout.checkoutData.customer, ...values }; }),
  nextStep: vi.fn(),
  validateStep: () => true
};

vi.mock('../../context/CheckoutContext', () => ({
  useCheckout: () => checkout
}));

describe('customer information step', () => {
  beforeEach(() => {
    checkout.checkoutData = { customer: { firstName: '', lastName: '', email: '', phone: '', company: '', customerType: 'individual', taxId: '' } };
    checkout.updateCheckoutData.mockClear();
  });

  it('asks businesses for their matricule fiscal, and says when its format is wrong', () => {
    const { rerender } = render(<CustomerInfoStep />);
    expect(screen.queryByLabelText(/Matricule fiscal/)).toBeNull();

    fireEvent.click(screen.getByDisplayValue('business'));
    expect(checkout.updateCheckoutData).toHaveBeenCalledWith('customer', { customerType: 'business' });
    rerender(<CustomerInfoStep />);
    expect(screen.getByText('Il figurera sur votre facture.')).toBeTruthy();

    checkout.checkoutData.customer.taxId = '12AB';
    rerender(<CustomerInfoStep />);
    expect(screen.getByLabelText(/Matricule fiscal/).getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByText(/Format attendu/)).toBeTruthy();
  });

  it('accepts matricules fiscaux as written on tax cards', () => {
    for (const valid of ['1234567A', '1234567A/A/M/000', '1234567a/b/p/001', '1234567 A / A / M / 000', '1234567AAM000']) {
      expect(isValidTaxId(valid)).toBe(true);
    }
    for (const invalid of ['', '123456A', '1234567', 'ABCDEFGH', '1234567A/A/M']) {
      expect(isValidTaxId(invalid)).toBe(false);
    }
  });
});
