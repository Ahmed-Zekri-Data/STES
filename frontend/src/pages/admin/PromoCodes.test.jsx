import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import adminApi from '../../utils/adminApi';
import PromoCodes from './PromoCodes';

const summer = {
  _id: 'p1', code: 'SUMMER10', description: 'Soldes', type: 'percent', value: 10, minOrder: 150,
  maxDiscount: null, startsAt: null, expiresAt: null, usageLimit: 50, usedCount: 12, isActive: true,
  status: 'active', orders: 12, discountTotal: 240
};

describe('admin promo codes page', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('lists codes with their discount, state and use', async () => {
    vi.spyOn(adminApi, 'get').mockResolvedValue({ data: { promoCodes: [summer, { ...summer, _id: 'p2', code: 'OLD5', type: 'fixed', value: 5, status: 'expired', usageLimit: null, usedCount: 3, orders: 3, discountTotal: 15 }] } });
    render(<PromoCodes />);

    const card = (await screen.findByText('SUMMER10')).closest('li');
    expect(within(card).getByText('−10%')).toBeTruthy();
    expect(within(card).getByText('Active')).toBeTruthy();
    expect(within(card).getByText(/Used 12 of 50/)).toBeTruthy();
    expect(within(card).getByText(/From 150 TND/)).toBeTruthy();

    const old = screen.getByText('OLD5').closest('li');
    expect(within(old).getByText('Expired')).toBeTruthy();
    expect(within(old).getByLabelText('No limit')).toBeTruthy();
  });

  it('creates a code, sending days as the start of the first and the end of the last', async () => {
    vi.spyOn(adminApi, 'get').mockResolvedValue({ data: { promoCodes: [] } });
    const post = vi.spyOn(adminApi, 'post').mockResolvedValue({ data: summer });
    render(<PromoCodes />);

    fireEvent.click((await screen.findAllByRole('button', { name: /New code/ }))[0]);
    const dialog = screen.getByRole('dialog', { name: 'New promo code' });
    fireEvent.change(within(dialog).getByPlaceholderText('SUMMER10'), { target: { value: 'ete25' } });
    fireEvent.change(within(dialog).getByLabelText(/^Value/), { target: { value: '25' } });
    fireEvent.change(within(dialog).getByLabelText(/Ends on/), { target: { value: '2026-10-31' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create code' }));

    await waitFor(() => expect(post).toHaveBeenCalled());
    const [url, body] = post.mock.calls[0];
    expect(url).toBe('/admin/promo-codes');
    expect(body).toMatchObject({ code: 'ETE25', type: 'percent', value: '25', isActive: true, startsAt: '' });
    expect(new Date(body.expiresAt).getHours()).toBe(23); // until the end of the 31st, local time
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('shows why the server refused a code', async () => {
    vi.spyOn(adminApi, 'get').mockResolvedValue({ data: { promoCodes: [] } });
    vi.spyOn(adminApi, 'post').mockRejectedValue({ response: { data: { message: 'A promo code with this code already exists' } } });
    render(<PromoCodes />);

    fireEvent.click((await screen.findAllByRole('button', { name: /New code/ }))[0]);
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByPlaceholderText('SUMMER10'), { target: { value: 'SUMMER10' } });
    fireEvent.change(within(dialog).getByLabelText(/^Value/), { target: { value: '10' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create code' }));

    expect((await within(dialog).findByRole('alert')).textContent).toBe('A promo code with this code already exists');
  });
});
