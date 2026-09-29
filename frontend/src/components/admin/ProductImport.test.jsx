import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import adminApi from '../../utils/adminApi';
import ProductImport from './ProductImport';

vi.mock('../../utils/productSheet', () => ({
  readProductSheet: vi.fn(async () => ({
    rows: [
      { row: 2, code: '65557', product: 'Victoria Plus Silent', model: '1/2 HP', price: 1290, stock: 3 },
      { row: 3, code: '65562', product: 'Victoria Plus Silent', model: '1 HP', price: null, stock: null }
    ]
  }))
}));

const report = (overrides) => ({
  dryRun: true, saved: false, rows: 2, skipped: 0, created: 1, updated: 0, versions: 2, versionsAdded: 0, priceChanges: 0,
  onRequest: 1, newCategories: ['Skimmers'], errors: [], errorCount: 0, sample: [], ...overrides
});

describe('product import', () => {
  afterEach(() => vi.restoreAllMocks());

  it('previews the file, then imports it', async () => {
    const post = vi.spyOn(adminApi, 'post').mockImplementation((url, body) => Promise.resolve({ data: body.dryRun ? report() : report({ dryRun: false, saved: true }) }));
    const onImported = vi.fn();
    render(<ProductImport onClose={() => {}} onImported={onImported} />);

    const file = new File(['x'], 'catalogue.xlsx');
    fireEvent.change(screen.getByLabelText(/Choose the Excel file/), { target: { files: [file] } });

    expect(await screen.findByText('Before importing')).toBeTruthy();
    expect(screen.getByText(/1 code without a price/)).toBeTruthy();
    expect(screen.getByText('New categories: Skimmers')).toBeTruthy();
    expect(post).toHaveBeenLastCalledWith('/admin/products/import', expect.objectContaining({ brand: 'AstralPool', dryRun: true, rows: expect.any(Array) }), expect.anything());

    fireEvent.click(screen.getByRole('button', { name: 'Import 1 product' }));
    expect(await screen.findByText('Import done')).toBeTruthy();
    expect(post).toHaveBeenLastCalledWith('/admin/products/import', expect.objectContaining({ dryRun: false }), expect.anything());
    expect(onImported).toHaveBeenCalled();
  });

  it('lists the rows it will leave out', async () => {
    vi.spyOn(adminApi, 'post').mockResolvedValue({ data: report({ errorCount: 1, errors: [{ row: 3, message: 'The price of 65562 must be a number in TND, or empty for a price on request' }] }) });
    render(<ProductImport onClose={() => {}} onImported={() => {}} />);
    fireEvent.change(screen.getByLabelText(/Choose the Excel file/), { target: { files: [new File(['x'], 'catalogue.xlsx')] } });
    expect(await screen.findByText(/1 row with a problem will be left out/)).toBeTruthy();
    expect(screen.getByText(/Row 3: The price of 65562/)).toBeTruthy();
  });
});
