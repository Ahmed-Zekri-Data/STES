import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';

// A browser able to receive push notifications
const register = vi.fn();
const answer = (publicKey) => {
  const api = { get: vi.fn().mockResolvedValue({ data: { publicKey } }), interceptors: { request: { use: vi.fn() } } };
  vi.spyOn(axios, 'create').mockReturnValue(api);
  return api;
};

describe('push notifications in the shop', () => {
  beforeEach(() => {
    register.mockReset().mockResolvedValue({ pushManager: { getSubscription: vi.fn().mockResolvedValue(null) } });
    vi.stubGlobal('navigator', { ...navigator, serviceWorker: { register, addEventListener: vi.fn() } });
    vi.stubGlobal('PushManager', function PushManager() {});
    vi.stubGlobal('Notification', { permission: 'default' });
    vi.spyOn(console, 'error');
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('installs nothing, quietly, while the server has no push keys', async () => {
    answer(null);
    // A fresh module, so its API client is the one answering above
    vi.resetModules();
    const { NotificationService } = await import('./notificationService');
    const service = new NotificationService();
    await service.ready;
    expect(register).not.toHaveBeenCalled();
    expect(console.error).not.toHaveBeenCalled();
    expect(await service.getSubscriptionStatus()).toEqual({ supported: false, subscribed: false });
  });

  it('installs the push worker once the server has keys', async () => {
    answer('BPublicKey');
    vi.resetModules();
    const { NotificationService } = await import('./notificationService');
    const service = new NotificationService();
    await service.ready;
    expect(register).toHaveBeenCalledWith('/sw.js');
    expect(await service.getSubscriptionStatus()).toEqual({ supported: true, subscribed: false, permission: 'default' });
  });
});
