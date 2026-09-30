import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ProductFilters from './ProductFilters';

const names = Array.from({ length: 15 }, (_, i) => `Sous-famille ${String(i + 1).padStart(2, '0')}`);
const categories = {
  filters: {
    name: 'Filtration',
    subcategories: Object.fromEntries(names.map(n => [n, n])),
    subcategoryCounts: Object.fromEntries(names.map((n, i) => [n, i + 1]))
  }
};

describe('shop sub-category filter', () => {
  it('lists the category’s sub-categories with their count, the first ten until asked', () => {
    const onFiltersChange = vi.fn();
    render(<ProductFilters filters={{ category: 'filters', subcategory: 'Sous-famille 14' }} categories={categories} onFiltersChange={onFiltersChange} onClearFilters={() => {}} />);

    expect(screen.getByRole('button', { name: /Sous-famille 01\s*1$/ })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Sous-famille 12/ })).toBeNull();
    // The one chosen stays visible
    expect(screen.getByRole('button', { name: /Sous-famille 14/ }).getAttribute('aria-pressed')).toBe('true');

    fireEvent.click(screen.getByRole('button', { name: 'Voir les 15 sous-catégories' }));
    fireEvent.click(screen.getByRole('button', { name: /Sous-famille 12/ }));
    expect(onFiltersChange).toHaveBeenCalledWith({ subcategory: 'Sous-famille 12' });
  });
});
