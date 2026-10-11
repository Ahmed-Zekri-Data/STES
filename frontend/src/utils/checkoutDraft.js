import axios from 'axios';

// The checkout in progress, saved on the server once the customer has given
// their email, so the shop can send one reminder if no order follows (see
// the server's automationService). One id per checkout, kept in this browser
// until the order is placed.

const KEY = 'stes-checkout-draft';

const newId = () => (window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`);

export const checkoutDraftId = () => {
  try {
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = newId();
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return newId();
  }
};

// The order is placed: the next checkout is a new one
export const forgetCheckoutDraft = () => {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Nothing kept, nothing to forget
  }
};

// In the background: a failure only means no reminder
export const saveCheckoutDraft = (customer, items) => {
  if (!customer?.email || !items?.length) return Promise.resolve();
  return axios.post('/api/checkout/draft', {
    draftId: checkoutDraftId(),
    email: customer.email,
    firstName: customer.firstName || undefined,
    reminders: customer.cartReminders !== false,
    items: items.map(item => ({ productId: item._id, ...(item.variant && { variant: item.variant }), quantity: item.quantity }))
  }).catch(() => {});
};
