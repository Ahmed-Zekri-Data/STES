import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import adminApi from '../../utils/adminApi';
import Reviews from './Reviews';

const reviewRow = {
  _id: 'r1',
  product: { _id: 'p1', name: 'Pompe Hayward' },
  customer: { _id: 'c1', firstName: 'Leila', lastName: 'Trabelsi', email: 'leila@example.com' },
  rating: 1, title: 'Arnaque', comment: 'Appelez le 99 999 999', verified: false,
  createdAt: '2026-09-01T10:00:00Z', helpfulCount: 0
};

const page = (reviews) => ({
  data: { reviews, pagination: { currentPage: 1, totalPages: 1, totalReviews: reviews.length, hasNext: false, hasPrev: false } }
});

describe('admin reviews page', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('lists reviews with the product and the customer, filters by rating and deletes', async () => {
    const get = vi.spyOn(adminApi, 'get').mockResolvedValue(page([reviewRow]));
    const del = vi.spyOn(adminApi, 'delete').mockResolvedValue({ data: {} });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<MemoryRouter><Reviews /></MemoryRouter>);

    expect(await screen.findByText('Arnaque')).toBeTruthy();
    expect(screen.getByRole('link', { name: /Pompe Hayward/ }).getAttribute('href')).toBe('/product/p1');
    expect(screen.getByText('leila@example.com')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Filter by rating'), { target: { value: '1' } });
    await waitFor(() => expect(get).toHaveBeenLastCalledWith('/admin/reviews', {
      params: { page: 1, limit: 20, rating: '1', search: undefined }
    }));

    get.mockResolvedValue(page([]));
    fireEvent.click(screen.getByRole('button', { name: /Delete/ }));
    await waitFor(() => expect(del).toHaveBeenCalledWith('/admin/reviews/p1/r1'));
    expect(await screen.findByText(/rating of Pompe Hayward has been updated/)).toBeTruthy();
    expect(await screen.findByText('No review matches these filters.')).toBeTruthy();
  });
});
