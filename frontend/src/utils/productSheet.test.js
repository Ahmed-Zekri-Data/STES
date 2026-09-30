import { describe, it, expect } from 'vitest';
import { findColumns, rowsFromSheet } from './productSheet';

const header = ['Code AstralPool', 'Famille', 'Catégorie boutique', 'Sous-famille', 'Produit', 'Modèle / version', 'Prix UK 2025 (£ HT, catalogue)', 'Prix STES (TND TTC)', 'Stock', 'À vendre (Oui/Non)', 'Page du catalogue', 'Description (anglais)'];

describe('reading the products spreadsheet', () => {
  it('finds the columns by their titles, and never takes the UK price for the shop’s', () => {
    expect(findColumns(header)).toEqual({ code: 0, family: 1, category: 2, subfamily: 3, product: 4, model: 5, price: 7, stock: 8, sell: 9, description: 11 });
    expect(findColumns(['Référence', 'Nom', 'Prix'])).toEqual({ code: 0, product: 1, price: 2 });
    // The translated file: French columns are used, the English ones only kept for reference
    expect(findColumns(['Code AstralPool', 'Produit', 'Modèle / version', 'Description', 'Produit (anglais)', 'Modèle (anglais)', 'Description (anglais)']))
      .toEqual({ code: 0, product: 1, model: 2, description: 3 });
  });

  it('turns rows into what the server takes, with their row numbers, skipping blank ones', () => {
    const { rows } = rowsFromSheet([
      header,
      ['65557', 'Filtration pumps', 'Pompes et Moteurs', 'Self-priming pumps', 'Victoria Plus Silent', '1/2 HP', 865, 1290, 3, 'Oui', 141, 'Pump'],
      [null, null, null, null, null, null, null, null, null, null, null, null],
      ['65562', 'Filtration pumps', 'Pompes et Moteurs', 'Self-priming pumps', 'Victoria Plus Silent', '1 HP', 903, null, null, 'Oui', 141, '']
    ]);
    expect(rows).toEqual([
      { row: 2, code: '65557', family: 'Filtration pumps', category: 'Pompes et Moteurs', subfamily: 'Self-priming pumps', product: 'Victoria Plus Silent', model: '1/2 HP', price: 1290, stock: 3, sell: 'Oui', description: 'Pump' },
      { row: 4, code: '65562', family: 'Filtration pumps', category: 'Pompes et Moteurs', subfamily: 'Self-priming pumps', product: 'Victoria Plus Silent', model: '1 HP', price: null, stock: null, sell: 'Oui', description: '' }
    ]);
  });

  it('says which column is missing', () => {
    expect(() => rowsFromSheet([['Nom', 'Prix'], ['Pompe', 10]])).toThrow(/Code AstralPool/);
    expect(() => rowsFromSheet([['Code', 'Prix'], ['1', 10]])).toThrow(/Produit/);
    expect(() => rowsFromSheet([])).toThrow(/empty/);
  });
});
