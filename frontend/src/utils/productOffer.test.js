import { describe, it, expect } from 'vitest';
import { availability, canBuy, isOnRequest, priceRange, cartKey } from './productOffer';

const pump = {
  _id: 'p1', name: 'Victoria Plus Silent', price: 865, stockQuantity: 3,
  variants: [
    { sku: '65557', label: '1/2 HP', price: 865, stockQuantity: 3 },
    { sku: '65562', label: '1 HP', price: 903, stockQuantity: 0 },
    { sku: '65569', label: '3 HP', price: null, stockQuantity: 0 }
  ]
};

describe('what a product costs and whether it can be bought', () => {
  it('needs a version chosen, with a price and stock', () => {
    expect(canBuy(pump)).toBe(false);
    expect(canBuy(pump, pump.variants[0])).toBe(true);
    expect(canBuy(pump, pump.variants[1])).toBe(false);
    expect(canBuy({ ...pump, backorder: true }, pump.variants[1])).toBe(true);
    expect(canBuy({ ...pump, backorder: true }, pump.variants[2])).toBe(false);
    expect(isOnRequest(pump, pump.variants[2])).toBe(true);
  });

  it('says in stock, on order or out of stock', () => {
    expect(availability(pump, pump.variants[0])).toMatchObject({ state: 'in', stock: 3, label: 'En stock' });
    expect(availability({ ...pump, backorder: true }, pump.variants[1])).toMatchObject({ state: 'order', label: 'Sur commande' });
    expect(availability(pump, pump.variants[1])).toMatchObject({ state: 'out', label: 'Rupture de stock' });
    expect(availability({ price: 10, inStock: false, stockQuantity: 0 })).toMatchObject({ state: 'out' });
    // A price on request is never "out of stock": the customer asks for a quote
    expect(availability(pump, pump.variants[2])).toMatchObject({ state: 'request', label: 'Sur devis' });
    expect(availability({ priceOnRequest: true, inStock: false, stockQuantity: 0 })).toMatchObject({ state: 'request' });
  });

  it('gives the price range of the priced versions, and one cart line per version', () => {
    expect(priceRange(pump)).toEqual({ min: 865, max: 903 });
    expect(priceRange({ variants: [{ price: null }] })).toBeNull();
    expect(cartKey({ _id: 'p1', variant: '65557' })).toBe('p1:65557');
    expect(cartKey({ _id: 'p1' })).toBe('p1');
  });
});
