import React, { StrictMode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import axios from 'axios';
import { LanguageProvider } from '../context/LanguageContext';
import { CustomerProvider } from '../context/CustomerContext';
import VerifyEmail from './VerifyEmail';

const renderPage = (url = '/verify-email?token=abc123') => render(
  <StrictMode>
    <LanguageProvider>
      <CustomerProvider>
        <MemoryRouter initialEntries={[url]}>
          <Routes>
            <Route path="/verify-email" element={<VerifyEmail />} />
          </Routes>
        </MemoryRouter>
      </CustomerProvider>
    </LanguageProvider>
  </StrictMode>
);

describe('email confirmation page', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('language', 'fr');
  });

  it('confirms the address, sending the link only once', async () => {
    const post = vi.spyOn(axios, 'post').mockResolvedValue({ data: { email: 'sami@example.com' } });
    renderPage();

    expect(await screen.findByText('Adresse email confirmée')).toBeTruthy();
    expect(screen.getByText(/sami@example.com est confirmée/)).toBeTruthy();
    expect(post).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith('/api/customers/verify-email', { token: 'abc123' });
  });

  it('explains an expired link and asks a logged-out visitor to log in', async () => {
    vi.spyOn(axios, 'post').mockRejectedValue(Object.assign(new Error('400'), { response: { status: 400, data: {} } }));
    renderPage();

    expect(await screen.findByText('Ce lien n’est plus valable')).toBeTruthy();
    expect(screen.getByText(/Connectez-vous pour recevoir un nouveau lien/)).toBeTruthy();
  });

  it('offers to retry when the server could not answer', async () => {
    vi.spyOn(axios, 'post').mockRejectedValue(Object.assign(new Error('500'), { response: { status: 500, data: {} } }));
    renderPage();
    expect(await screen.findByRole('button', { name: 'Réessayer' })).toBeTruthy();
  });
});
