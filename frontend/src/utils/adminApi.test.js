import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AxiosError } from 'axios';
import adminApi, { ADMIN_SESSION_EXPIRED, errorMessage } from './adminApi';

// Answers every request without a network, recording what was sent
const respondWith = (status) => {
  const sent = [];
  adminApi.defaults.adapter = async (config) => {
    sent.push(config);
    const response = { data: {}, status, statusText: '', headers: {}, config };
    if (status >= 400) {
      throw new AxiosError('failed', 'ERR_BAD_RESPONSE', config, null, response);
    }
    return response;
  };
  return sent;
};

describe('adminApi', () => {
  beforeEach(() => localStorage.clear());

  it('sends the admin token, even when a shop customer is signed in', async () => {
    localStorage.setItem('customerToken', 'customer-token');
    localStorage.setItem('adminToken', 'admin-token');
    const sent = respondWith(200);

    await adminApi.get('/admin/products');

    expect(sent[0].headers.Authorization).toBe('Bearer admin-token');
  });

  it('ends the admin session when an admin request is refused', async () => {
    respondWith(401);
    const expired = vi.fn();
    window.addEventListener(ADMIN_SESSION_EXPIRED, expired);

    await expect(adminApi.get('/admin/products')).rejects.toThrow();
    window.removeEventListener(ADMIN_SESSION_EXPIRED, expired);

    expect(expired).toHaveBeenCalledOnce();
  });

  it('does not treat a wrong password at login as an expired session', async () => {
    respondWith(401);
    const expired = vi.fn();
    window.addEventListener(ADMIN_SESSION_EXPIRED, expired);

    await expect(adminApi.post('/auth/login', {})).rejects.toThrow();
    window.removeEventListener(ADMIN_SESSION_EXPIRED, expired);

    expect(expired).not.toHaveBeenCalled();
  });
});

describe('errorMessage', () => {
  it("prefers the server's message, then the first validation error", () => {
    expect(errorMessage({ response: { data: { message: 'A brand with this name already exists' } } }))
      .toBe('A brand with this name already exists');
    expect(errorMessage({ response: { data: { errors: [{ msg: 'Contact email must be valid' }] } } }))
      .toBe('Contact email must be valid');
    expect(errorMessage({ message: 'Network Error' })).toBe('Network Error');
  });
});
