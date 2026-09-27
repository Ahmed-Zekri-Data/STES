import { describe, it, expect } from 'vitest';
import { whatsappLink, phoneLink } from './shopSettings';

describe('shop contact links', () => {
  it('builds a WhatsApp link from a written number', () => {
    expect(whatsappLink('+216 98 765 432')).toBe('https://wa.me/21698765432');
    expect(whatsappLink('')).toBe('');
  });

  it('builds a phone link', () => {
    expect(phoneLink('+216 (71) 234-567')).toBe('tel:+21671234567');
  });
});
