import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import axios from 'axios';
import EmailUnsubscribe from './EmailUnsubscribe';

const renderPage = (search) => render(
  <MemoryRouter initialEntries={[`/emails/desinscription${search}`]}>
    <Routes><Route path="/emails/desinscription" element={<EmailUnsubscribe />} /></Routes>
  </MemoryRouter>
);

describe('unsubscribing from automatic emails', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('stops them only on a click, then says order emails still come', async () => {
    const post = vi.spyOn(axios, 'post').mockResolvedValue({ data: { message: 'C’est noté : vous ne recevrez plus ces emails.' } });
    renderPage('?token=abc.def');
    expect(post).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /Ne plus recevoir ces emails/ }));
    expect((await screen.findByRole('status')).textContent).toMatch('vous ne recevrez plus ces emails');
    expect(screen.getByText(/emails liés à vos commandes/)).toBeTruthy();
    expect(post).toHaveBeenCalledWith('/api/emails/unsubscribe', { token: 'abc.def' });
  });

  it('says when the link is not valid', async () => {
    vi.spyOn(axios, 'post').mockRejectedValue({ response: { status: 400, data: { message: 'Ce lien de désinscription n’est pas valide.' } } });
    renderPage('?token=forged');
    fireEvent.click(screen.getByRole('button', { name: /Ne plus recevoir ces emails/ }));
    expect((await screen.findByRole('alert')).textContent).toMatch('n’est pas valide');
  });

  it('explains what to do without a token', () => {
    renderPage('');
    expect(screen.getByText(/n’est pas complet/)).toBeTruthy();
  });
});
