import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import axios from 'axios';
import { LanguageProvider } from '../context/LanguageContext';
import { CustomerProvider } from '../context/CustomerContext';
import ResetPassword from './ResetPassword';

const renderPage = (url = '/reset-password?token=abc123') => render(
  <LanguageProvider>
    <CustomerProvider>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="/reset-password" element={<ResetPassword />} />
        </Routes>
      </MemoryRouter>
    </CustomerProvider>
  </LanguageProvider>
);

const invalidLink = () => Object.assign(new Error('Request failed'), {
  response: { status: 400, data: { message: 'Invalid or expired reset token' } }
});

const typePasswords = (password, confirm = password) => {
  fireEvent.change(screen.getByLabelText('Nouveau mot de passe'), { target: { value: password } });
  fireEvent.change(screen.getByLabelText('Confirmer le mot de passe'), { target: { value: confirm } });
  fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
};

describe('reset password page', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('language', 'fr');
  });

  it('sets the new password and logs the customer in', async () => {
    const post = vi.spyOn(axios, 'post').mockImplementation(async (url) => {
      if (url === '/api/customers/reset-password/check') return { data: { valid: true, email: 'sami@example.com' } };
      return { data: { token: 'new-session', customer: { email: 'sami@example.com', firstName: 'Sami' } } };
    });

    renderPage();
    expect(await screen.findByText('Pour le compte sami@example.com')).toBeTruthy();
    typePasswords('nouveau-mdp');

    expect(await screen.findByText('Mot de passe changé')).toBeTruthy();
    expect(post).toHaveBeenCalledWith('/api/customers/reset-password', { token: 'abc123', password: 'nouveau-mdp' });
    expect(localStorage.getItem('customerToken')).toBe('new-session');
  });

  it('checks the two passwords before sending', async () => {
    const post = vi.spyOn(axios, 'post').mockResolvedValue({ data: { valid: true, email: 'sami@example.com' } });

    renderPage();
    await screen.findByText('Pour le compte sami@example.com');
    typePasswords('12345');
    expect(screen.getByRole('alert').textContent).toMatch(/au moins 6 caractères/);
    typePasswords('nouveau-mdp', 'nouveau-mdx');
    expect(screen.getByRole('alert').textContent).toMatch(/pas identiques/);

    expect(post).toHaveBeenCalledTimes(1); // only the link check
  });

  it('offers a new link when this one has expired', async () => {
    const post = vi.spyOn(axios, 'post').mockImplementation(async (url) => {
      if (url === '/api/customers/reset-password/check') throw invalidLink();
      return { data: { message: 'sent' } };
    });

    renderPage();
    expect(await screen.findByText('Ce lien n’est plus valable')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'sami@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer le lien' }));

    expect(await screen.findByText('Vérifiez votre boîte mail')).toBeTruthy();
    expect(post).toHaveBeenCalledWith('/api/customers/forgot-password', { email: 'sami@example.com' });
  });

  it('does not call a good link expired when the check is refused for too many attempts', async () => {
    let calls = 0;
    vi.spyOn(axios, 'post').mockImplementation(async () => {
      calls += 1;
      if (calls === 1) {
        throw Object.assign(new Error('429'), { response: { status: 429, data: { message: 'Trop de tentatives. Veuillez réessayer dans 15 minutes.' } } });
      }
      return { data: { valid: true, email: 'sami@example.com' } };
    });

    renderPage();
    expect((await screen.findByRole('alert')).textContent).toMatch(/Trop de tentatives/);
    expect(screen.queryByText('Ce lien n’est plus valable')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }));
    expect(await screen.findByText('Pour le compte sami@example.com')).toBeTruthy();
  });

  it('treats a link without a code as expired', async () => {
    const post = vi.spyOn(axios, 'post');
    renderPage('/reset-password');
    expect(await screen.findByText('Ce lien n’est plus valable')).toBeTruthy();
    expect(post).not.toHaveBeenCalled();
  });
});
