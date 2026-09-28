// Tunisian matricule fiscal: 7 digits and a check letter, usually followed by
// the VAT code, category and establishment number, e.g. 1234567A/A/M/000.
// Spaces are ignored and letters put in capitals.
const normalizeTaxId = (value) => String(value || '').replace(/\s+/g, '').toUpperCase();

const isValidTaxId = (value) => /^\d{7}[A-Z](\/?[A-Z]\/?[A-Z]\/?\d{3})?$/.test(normalizeTaxId(value));

module.exports = { normalizeTaxId, isValidTaxId };
