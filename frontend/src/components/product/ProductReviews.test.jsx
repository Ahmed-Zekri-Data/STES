import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import axios from 'axios';
import { CustomerProvider } from '../../context/CustomerContext';
import ProductReviews from './ProductReviews';

const stats = (distribution) => {
  const ratings = Object.entries(distribution).flatMap(([rating, count]) => Array(count).fill(Number(rating)));
  return {
    averageRating: ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0,
    totalReviews: ratings.length,
    ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0, ...distribution }
  };
};

const review = (fields) => ({
  _id: 'r1', author: 'Leila T.', rating: 4, title: 'Bonne pompe', comment: 'Silencieuse',
  verified: true, createdAt: '2026-09-01T10:00:00Z', helpfulCount: 2, votedHelpful: false, mine: false, ...fields
});

const listResponse = (reviews, myReview = null) => ({
  data: {
    reviews,
    pagination: { currentPage: 1, totalPages: 1, totalReviews: reviews.length, hasNext: false, hasPrev: false },
    ratingStats: stats(Object.fromEntries(reviews.map(r => [r.rating, 1]))),
    myReview
  }
});

let reviewsResponse;

const renderReviews = (onStatsChange) => render(
  <CustomerProvider>
    <ProductReviews productId="p1" onStatsChange={onStatsChange} />
  </CustomerProvider>
);

const signIn = () => localStorage.setItem('customerToken', 'session');

describe('product reviews', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    reviewsResponse = listResponse([review()]);
    vi.spyOn(axios, 'get').mockImplementation(async (url) => {
      if (url === '/api/customers/me') return { data: { customer: { _id: 'c1', firstName: 'Sami' } } };
      return reviewsResponse;
    });
  });

  it('shows the rating summary and the reviews, and asks visitors to sign in to write one', async () => {
    renderReviews();

    expect(await screen.findByText('Bonne pompe')).toBeTruthy();
    expect(screen.getByText('Basé sur 1 avis')).toBeTruthy();
    expect(screen.getByText('Leila T.')).toBeTruthy();
    expect(screen.getByText('Achat vérifié')).toBeTruthy();
    expect(screen.getAllByRole('img', { name: 'Note 4 sur 5' }).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Se connecter' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Écrire un avis/ })).toBeNull();
  });

  it('invites the first review when there are none', async () => {
    reviewsResponse = listResponse([]);
    renderReviews();
    expect(await screen.findByText(/Soyez le premier/)).toBeTruthy();
  });

  it('lets a signed-in customer publish a review, which needs a rating', async () => {
    signIn();
    const onStatsChange = vi.fn();
    const post = vi.spyOn(axios, 'post').mockResolvedValue({ data: { ratingStats: stats({ 4: 1, 5: 1 }) } });
    renderReviews(onStatsChange);

    fireEvent.click(await screen.findByRole('button', { name: /Écrire un avis/ }));
    fireEvent.change(screen.getByLabelText('Titre'), { target: { value: 'Parfait' } });
    fireEvent.change(screen.getByLabelText('Commentaire'), { target: { value: 'Installée en une heure' } });
    fireEvent.click(screen.getByRole('button', { name: "Publier l'avis" }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/Choisissez une note/);
    expect(post).not.toHaveBeenCalled();

    fireEvent.click(screen.getByLabelText(/5 étoiles/));
    fireEvent.click(screen.getByRole('button', { name: "Publier l'avis" }));

    await waitFor(() => expect(post).toHaveBeenCalledWith('/api/products/p1/reviews', { rating: 5, title: 'Parfait', comment: 'Installée en une heure' }));
    expect(await screen.findByText('Merci ! Votre avis est publié.')).toBeTruthy();
    expect(onStatsChange).toHaveBeenCalledWith(stats({ 4: 1, 5: 1 }));
  });

  it('explains when the customer has already reviewed the product', async () => {
    signIn();
    vi.spyOn(axios, 'post').mockRejectedValue({ response: { status: 409 } });
    renderReviews();

    fireEvent.click(await screen.findByRole('button', { name: /Écrire un avis/ }));
    fireEvent.click(screen.getByLabelText(/3 étoiles/));
    fireEvent.change(screen.getByLabelText('Titre'), { target: { value: 'x' } });
    fireEvent.change(screen.getByLabelText('Commentaire'), { target: { value: 'y' } });
    fireEvent.click(screen.getByRole('button', { name: "Publier l'avis" }));

    expect((await screen.findByRole('alert')).textContent).toMatch(/déjà donné votre avis/);
  });

  it('lets customers change or delete their own review', async () => {
    signIn();
    const mine = review({ _id: 'r2', author: 'Sami B.', rating: 2, title: 'Bof', comment: 'Bruyante', mine: true, helpfulCount: 0 });
    reviewsResponse = listResponse([mine], mine);
    const put = vi.spyOn(axios, 'put').mockResolvedValue({ data: { ratingStats: stats({ 4: 1 }) } });
    const del = vi.spyOn(axios, 'delete').mockResolvedValue({ data: { ratingStats: stats({}) } });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderReviews();

    fireEvent.click(await screen.findByRole('button', { name: /Modifier/ }));
    expect(screen.getByLabelText('Titre').value).toBe('Bof');
    fireEvent.click(screen.getByLabelText(/4 étoiles/));
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    await waitFor(() => expect(put).toHaveBeenCalledWith('/api/products/p1/reviews/mine', { rating: 4, title: 'Bof', comment: 'Bruyante' }));
    expect(await screen.findByText('Votre avis a été modifié.')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Supprimer/ }));
    await waitFor(() => expect(del).toHaveBeenCalledWith('/api/products/p1/reviews/mine'));
    expect(await screen.findByText('Votre avis a été supprimé.')).toBeTruthy();
  });

  it('marks a review as helpful and shows the new count', async () => {
    signIn();
    const post = vi.spyOn(axios, 'post').mockResolvedValue({ data: { helpfulCount: 3, votedHelpful: true } });
    renderReviews();

    const item = (await screen.findByText('Bonne pompe')).closest('li');
    fireEvent.click(within(item).getByRole('button', { name: 'Utile (2)' }));

    await waitFor(() => expect(post).toHaveBeenCalledWith('/api/products/p1/reviews/r1/helpful', { helpful: true }));
    const button = await within(item).findByRole('button', { name: 'Utile (3)' });
    expect(button.getAttribute('aria-pressed')).toBe('true');
  });
});
