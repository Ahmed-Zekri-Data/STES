// Reads a products spreadsheet (.xlsx) in the browser for Admin → Products
// → Import: the "Produits" sheet (or the first one), its columns found by
// their titles. The server checks every value (see productImportService).

// Column titles, compared without accents, case, spaces or punctuation.
// "Prix UK…" is deliberately not a price column: only the shop's price is.
const COLUMNS = {
  code: ['codeastralpool', 'code', 'reference', 'ref', 'sku', 'codeproduit'],
  family: ['famille', 'family'],
  category: ['categorieboutique', 'categorie', 'category'],
  subfamily: ['sousfamille', 'subfamily'],
  product: ['produit', 'product', 'nom', 'name', 'nomduproduit'],
  model: ['modeleversion', 'modele', 'version', 'model'],
  price: ['prixstestndttc', 'prixstes', 'prixtnd', 'prixttc', 'prix', 'price'],
  stock: ['stock', 'quantite', 'qty'],
  sell: ['avendreouinon', 'avendre', 'sell'],
  description: ['descriptionanglais', 'descriptionfrancais', 'description']
};

export const normalizeTitle = (title) => String(title ?? '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]/g, '');

// Which column holds what: { code: 0, product: 3, ... }
export const findColumns = (header) => {
  const titles = header.map(normalizeTitle);
  const found = {};
  for (const [key, names] of Object.entries(COLUMNS)) {
    const index = names.map(name => titles.indexOf(name)).find(i => i >= 0);
    if (index !== undefined) found[key] = index;
  }
  return found;
};

// Sheet rows (arrays of cells, header first) → the rows the server takes
export const rowsFromSheet = (data) => {
  const headerIndex = data.findIndex(row => (row || []).some(cell => cell !== null && cell !== ''));
  if (headerIndex < 0) throw new Error('The file is empty.');
  const columns = findColumns(data[headerIndex]);
  if (columns.code === undefined) throw new Error('No “Code AstralPool” (or “Code”) column was found in the first row.');
  if (columns.product === undefined && columns.subfamily === undefined) throw new Error('No “Produit” column was found in the first row.');

  const rows = [];
  for (let i = headerIndex + 1; i < data.length; i++) {
    const cells = data[i] || [];
    if (!cells.some(cell => cell !== null && cell !== '')) continue;
    const row = { row: i + 1 };
    for (const [key, index] of Object.entries(columns)) row[key] = cells[index] ?? null;
    rows.push(row);
  }
  return { rows, columns: Object.keys(columns) };
};

// Reads the file: the "Produits" sheet when there is one
export const readProductSheet = async (file) => {
  const { readSheet } = await import('read-excel-file/browser');
  let data;
  try {
    data = await readSheet(file, 'Produits');
  } catch {
    data = await readSheet(file);
  }
  return rowsFromSheet(data);
};
