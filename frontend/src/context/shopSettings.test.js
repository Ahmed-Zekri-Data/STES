import { describe, it, expect } from 'vitest';
import { whatsappLink, phoneLink, deliveryEstimate, DEFAULT_SHOP_SETTINGS } from './shopSettings';

describe('delivery estimate in the cart', () => {
  const { delivery } = DEFAULT_SHOP_SETTINGS; // free above 200, base cost 7

  it('starts from the base cost until the free-delivery amount is passed', () => {
    expect(deliveryEstimate(180, delivery)).toEqual({ free: false, from: 7 });
    expect(deliveryEstimate(200, delivery)).toEqual({ free: false, from: 7 }); // "above 200", as the server
    expect(deliveryEstimate(200.5, delivery)).toEqual({ free: true, from: 0 });
  });

  it('follows the prices set in Admin → Settings', () => {
    expect(deliveryEstimate(300, { freeDeliveryOver: 500, baseCost: 9 })).toEqual({ free: false, from: 9 });
  });
});

describe('shop contact links', () => {
  it('builds a WhatsApp link from a written number', () => {
    expect(whatsappLink('+216 98 765 432')).toBe('https://wa.me/21698765432');
    expect(whatsappLink('')).toBe('');
  });

  it('builds a phone link', () => {
    expect(phoneLink('+216 (71) 234-567')).toBe('tel:+21671234567');
  });
});
