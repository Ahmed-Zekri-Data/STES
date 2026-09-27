import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import axios from 'axios';
import { CustomerProvider } from '../../context/CustomerContext';
import { toShipping } from '../../context/CheckoutContext';
import AddressBook from './AddressBook';

const account = { id: 'c1', email: 'sami@example.com', firstName: 'Sami', lastName: 'Ben Ali', phone: '+21698765432' };
const home = { _id: 'a1', type: 'home', firstName: 'Sami', lastName: 'Ben Ali', address1: '12 Rue de Marseille', city: 'Tunis', state: 'Tunis', postalCode: '1000', isDefault: true };
const work = { _id: 'a2', type: 'work', firstName: 'Sami', lastName: 'Ben Ali', address1: '5 Avenue Habib Bourguiba', city: 'Sousse', state: 'Sousse', isDefault: false };

const renderBook = (addresses) => {
  vi.spyOn(axios, 'get').mockImplementation(async (url) => (
    url === '/api/customers/me' ? { data: { customer: account } } : { data: { addresses } }
  ));
  return render(<CustomerProvider><AddressBook /></CustomerProvider>);
};

describe('address book', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('customerToken', 'session');
  });

  it('adds an address, starting from the account name and phone', async () => {
    renderBook([]);
    await screen.findByText(/Aucune adresse enregistrée/);
    const post = vi.spyOn(axios, 'post').mockResolvedValue({ data: { addresses: [home] } });

    fireEvent.click(screen.getByRole('button', { name: /Ajouter une adresse/ }));
    await waitFor(() => expect(screen.getByLabelText('Prénom').value).toBe('Sami'));
    fireEvent.change(screen.getByLabelText('Adresse'), { target: { value: '12 Rue de Marseille' } });
    fireEvent.change(screen.getByLabelText('Ville'), { target: { value: 'Tunis' } });
    fireEvent.change(screen.getByLabelText('Gouvernorat'), { target: { value: 'Tunis' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(await screen.findByText('Adresse ajoutée.')).toBeTruthy();
    expect(post).toHaveBeenCalledWith('/api/addresses', expect.objectContaining({
      firstName: 'Sami', phone: '+21698765432', address1: '12 Rue de Marseille', city: 'Tunis', state: 'Tunis', type: 'home'
    }));
    expect(screen.getByText('Par défaut')).toBeTruthy();
  });

  it('shows the server reason when an address is refused', async () => {
    renderBook([]);
    await screen.findByText(/Aucune adresse enregistrée/);
    vi.spyOn(axios, 'post').mockRejectedValue(Object.assign(new Error('400'), { response: { data: { message: 'Le code postal a 4 chiffres' } } }));
    fireEvent.click(screen.getByRole('button', { name: /Ajouter une adresse/ }));
    await waitFor(() => expect(screen.getByLabelText('Prénom').value).toBe('Sami'));
    fireEvent.change(screen.getByLabelText('Adresse'), { target: { value: '12 Rue de Marseille' } });
    fireEvent.change(screen.getByLabelText('Ville'), { target: { value: 'Tunis' } });
    fireEvent.change(screen.getByLabelText('Gouvernorat'), { target: { value: 'Tunis' } });
    fireEvent.change(screen.getByLabelText('Code postal'), { target: { value: '100' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/4 chiffres/);
  });

  it('makes another address the default and deletes one', async () => {
    renderBook([home, work]);
    const workCard = (await screen.findByText('Travail')).closest('div.bg-surface');
    vi.spyOn(axios, 'put').mockResolvedValue({ data: { addresses: [{ ...home, isDefault: false }, { ...work, isDefault: true }] } });
    fireEvent.click(within(workCard).getByRole('button', { name: /Par défaut/ }));
    expect(await screen.findByText(/Adresse par défaut changée/)).toBeTruthy();
    expect(axios.put).toHaveBeenCalledWith('/api/addresses/a2/default');

    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const del = vi.spyOn(axios, 'delete').mockResolvedValue({ data: { addresses: [{ ...work, isDefault: true }] } });
    const homeCard = screen.getByText('Domicile').closest('div.bg-surface');
    fireEvent.click(within(homeCard).getByRole('button', { name: /Supprimer/ }));
    expect(await screen.findByText('Adresse supprimée.')).toBeTruthy();
    expect(del).toHaveBeenCalledWith('/api/addresses/a1');
    expect(screen.queryByText('12 Rue de Marseille')).toBeNull();
  });

  it('turns a saved address into checkout fields', () => {
    expect(toShipping({ ...home, address2: 'Résidence Les Jasmins, 2e étage' })).toEqual({
      address: '12 Rue de Marseille, Résidence Les Jasmins, 2e étage', city: 'Tunis', governorate: 'Tunis', postalCode: '1000'
    });
  });
});
