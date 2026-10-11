import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import adminApi from '../../utils/adminApi';
import AutomationSettings from './AutomationSettings';

const automations = {
  abandonedCartEnabled: true, abandonedCartHours: 2,
  quoteAlertEnabled: true, quoteAlertHours: 24,
  quoteFollowUpEnabled: true, quoteFollowUpDays: 3,
  reviewRequestEnabled: true, reviewRequestDays: 5,
  replenishmentEnabled: true
};
const stats = { sent: { abandoned_cart: 4, quote_alert: 1, quote_follow_up: 0, review_request: 2, replenishment: 0 }, optOuts: 1, emailConfigured: true };

const answer = (extra = {}) => vi.spyOn(adminApi, 'get').mockImplementation((url) => Promise.resolve(
  url === '/admin/automations' ? { data: { ...stats, ...extra } } : { data: { automations } }
));

describe('admin automatic emails', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('shows what each one sent, and saves the switches and delays', async () => {
    answer();
    const put = vi.spyOn(adminApi, 'put').mockImplementation((url, body) => Promise.resolve({ data: { settings: { automations: body.automations } } }));
    render(<AutomationSettings />);
    const cart = (await screen.findByLabelText('Abandoned cart')).closest('li');
    expect(within(cart).getByText('4')).toBeTruthy();
    expect(screen.getByText('1 address asked to stop these emails.')).toBeTruthy();

    fireEvent.change(within(cart).getByLabelText('Hours after the checkout was left'), { target: { value: '4' } });
    fireEvent.click(screen.getByLabelText('Quote follow-up'));
    fireEvent.click(screen.getByRole('button', { name: /Save automatic emails/ }));

    expect((await screen.findByRole('status')).textContent).toMatch('Automatic emails saved');
    expect(put).toHaveBeenCalledWith('/admin/settings', { automations: { ...automations, abandonedCartHours: 4, quoteFollowUpEnabled: false } });
  });

  it('warns that nothing is sent while emails are not set up', async () => {
    answer({ emailConfigured: false });
    render(<AutomationSettings />);
    expect((await screen.findByRole('alert')).textContent).toMatch('Emails are not set up yet');
  });
});
