import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { checkoutDraftId, forgetCheckoutDraft, saveCheckoutDraft } from './checkoutDraft';

describe('checkout draft', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('keeps one id per checkout, until the order is placed', () => {
    const first = checkoutDraftId();
    expect(first).toMatch(/^[A-Za-z0-9-]{8,64}$/);
    expect(checkoutDraftId()).toBe(first);
    forgetCheckoutDraft();
    expect(checkoutDraftId()).not.toBe(first);
  });

  it('sends the cart with the email and the reminder choice, and nothing without an email', async () => {
    const post = vi.spyOn(axios, 'post').mockResolvedValue({});
    const items = [{ _id: 'p1', name: 'Pompe', quantity: 1, variant: '65557' }, { _id: 'p2', name: 'Chlore', quantity: 2 }];
    await saveCheckoutDraft({ email: '', firstName: 'Leila' }, items);
    expect(post).not.toHaveBeenCalled();

    await saveCheckoutDraft({ email: 'leila@example.com', firstName: 'Leila', cartReminders: false }, items);
    expect(post).toHaveBeenCalledWith('/api/checkout/draft', {
      draftId: checkoutDraftId(),
      email: 'leila@example.com',
      firstName: 'Leila',
      reminders: false,
      items: [{ productId: 'p1', variant: '65557', quantity: 1 }, { productId: 'p2', quantity: 2 }]
    });
  });

  it('never fails the checkout when saving fails', async () => {
    vi.spyOn(axios, 'post').mockRejectedValue(new Error('offline'));
    await expect(saveCheckoutDraft({ email: 'leila@example.com' }, [{ _id: 'p1', quantity: 1 }])).resolves.toBeUndefined();
  });
});
