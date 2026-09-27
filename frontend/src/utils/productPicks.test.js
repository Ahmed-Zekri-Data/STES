import { describe, it, expect, vi } from 'vitest';
import axios from 'axios';
import { pickProducts } from './productPicks';

const p = (id, category) => ({ _id: id, name: `Produit ${id}`, category });

describe('pickProducts', () => {
  it('takes the cart categories first, then featured, then newest, without repeats or excluded ones', async () => {
    const get = vi.spyOn(axios, 'get').mockImplementation(async (url, { params }) => {
      if (params.category === 'filters') return { data: { products: [p('in-cart', 'filters'), p('f1', 'filters')] } };
      if (params.featured) return { data: { products: [p('f1', 'filters'), p('star', 'pumps')] } };
      return { data: { products: [p('new1'), p('new2'), p('new3')] } };
    });

    const picked = await pickProducts({ categories: ['filters', 'filters'], exclude: ['in-cart'], limit: 4 });

    expect(picked.map(x => x._id)).toEqual(['f1', 'star', 'new1', 'new2']);
    expect(get).toHaveBeenCalledTimes(3); // the repeated category is asked once
    expect(get.mock.calls.every(([, { params }]) => params.inStock === true)).toBe(true);
  });

  it('stops asking once it has enough', async () => {
    const get = vi.spyOn(axios, 'get').mockResolvedValue({ data: { products: [p('a'), p('b'), p('c')] } });
    const picked = await pickProducts({ limit: 3 });
    expect(picked).toHaveLength(3);
    expect(get).toHaveBeenCalledTimes(1);
  });
});
