import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ErrorBoundary from './ErrorBoundary';

const Broken = () => {
  throw new Error('bad data');
};

const renderAt = (path) => render(
  <MemoryRouter initialEntries={[path]}>
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<p>Accueil</p>} />
        <Route path="/broken" element={<Broken />} />
      </Routes>
    </ErrorBoundary>
  </MemoryRouter>
);

describe('ErrorBoundary', () => {
  it('shows a message instead of a blank page when a page crashes', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    renderAt('/broken');

    expect(screen.getByText('Un problème est survenu')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Réessayer/ })).toBeTruthy();
  });

  it('recovers when the visitor goes to another page', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    renderAt('/broken');

    fireEvent.click(screen.getByRole('link', { name: "Retour à l'accueil" }));

    expect(screen.getByText('Accueil')).toBeTruthy();
    expect(screen.queryByText('Un problème est survenu')).toBeNull();
  });

  it('shows the page normally when nothing goes wrong', () => {
    renderAt('/');
    expect(screen.getByText('Accueil')).toBeTruthy();
  });
});
