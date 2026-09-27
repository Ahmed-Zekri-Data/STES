import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import axios from 'axios';
import { CustomerProvider } from '../../context/CustomerContext';
import AccountSettings from './AccountSettings';

const account = {
  id: 'c1', email: 'sami@example.com', firstName: 'Sami', lastName: 'Ben Ali', fullName: 'Sami Ben Ali',
  phone: '+21698765432', dateOfBirth: '1990-05-14T00:00:00.000Z', isEmailVerified: true
};

const renderSettings = () => render(<CustomerProvider><AccountSettings /></CustomerProvider>);

describe('customer account settings', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('customerToken', 'old-session');
    vi.spyOn(axios, 'get').mockResolvedValue({ data: { customer: account } });
  });

  it('fills in the current details and saves changes', async () => {
    const put = vi.spyOn(axios, 'put').mockResolvedValue({ data: { customer: { ...account, firstName: 'Samir' } } });
    renderSettings();

    const firstName = await screen.findByDisplayValue('Sami');
    expect(screen.getByLabelText('Date de naissance').value).toBe('1990-05-14');
    expect(screen.getByLabelText('Email').disabled).toBe(true);
    fireEvent.change(firstName, { target: { value: 'Samir' } });
    fireEvent.click(screen.getByRole('button', { name: /^Enregistrer$/ }));

    expect((await screen.findByRole('status')).textContent).toMatch(/enregistrées/);
    expect(put).toHaveBeenCalledWith('/api/customers/profile', {
      firstName: 'Samir', lastName: 'Ben Ali', phone: '+21698765432', dateOfBirth: '1990-05-14'
    });
  });

  it('shows the server reason in French', async () => {
    vi.spyOn(axios, 'put').mockRejectedValue(Object.assign(new Error('400'), {
      response: { status: 400, data: { errors: [{ msg: 'Please enter a valid Tunisian phone number (8 digits)' }] } }
    }));
    renderSettings();
    await screen.findByDisplayValue('Sami');
    fireEvent.click(screen.getByRole('button', { name: /^Enregistrer$/ }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/8 chiffres/);
  });

  it('changes the password and keeps the new session', async () => {
    const put = vi.spyOn(axios, 'put').mockResolvedValue({ data: { token: 'new-session' } });
    renderSettings();
    await screen.findByDisplayValue('Sami');

    fireEvent.change(screen.getByLabelText('Mot de passe actuel'), { target: { value: 'secret123' } });
    fireEvent.change(screen.getByLabelText('Nouveau mot de passe'), { target: { value: 'nouveau-mdp' } });
    fireEvent.change(screen.getByLabelText('Confirmer le nouveau mot de passe'), { target: { value: 'nouveau-mdx' } });
    fireEvent.click(screen.getByRole('button', { name: /Changer le mot de passe/ }));
    expect(screen.getByRole('alert').textContent).toMatch(/pas identiques/);
    expect(put).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Confirmer le nouveau mot de passe'), { target: { value: 'nouveau-mdp' } });
    fireEvent.click(screen.getByRole('button', { name: /Changer le mot de passe/ }));
    expect((await screen.findByRole('status')).textContent).toMatch(/autres appareils ont été déconnectés/);
    expect(put).toHaveBeenCalledWith('/api/customers/change-password', { currentPassword: 'secret123', newPassword: 'nouveau-mdp' });
    expect(localStorage.getItem('customerToken')).toBe('new-session');
  });
});
