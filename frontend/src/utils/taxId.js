// Tunisian matricule fiscal, checked like the server does (backend
// utils/taxId.js): 7 digits and a letter, usually followed by the VAT
// code, category and establishment number, e.g. 1234567A/A/M/000.
export const isValidTaxId = (value) => /^\d{7}[A-Z](\/?[A-Z]\/?[A-Z]\/?\d{3})?$/.test(String(value || '').replace(/\s+/g, '').toUpperCase());
