// Tunisian bank account numbers (RIB): 20 digits, bank (2), branch (3),
// account (13) and a 2-digit key chosen so the whole number is a multiple
// of 97. That is why every Tunisian IBAN is "TN59" followed by the RIB.

const digitsOf = (value) => String(value || '').replace(/[\s-]/g, '');

// True for 20 digits with a correct key (catches most typos)
const isValidRib = (value) => {
  const digits = digitsOf(value);
  return /^\d{20}$/.test(digits) && BigInt(digits) % 97n === 0n;
};

// "08104000123456789012" → "08 104 0001234567890 12"
const formatRib = (value) => {
  const d = digitsOf(value);
  return `${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 18)} ${d.slice(18)}`;
};

// "TN59 0810 4000 1234 5678 9012"
const ibanOf = (value) => `TN59${digitsOf(value)}`.replace(/(.{4})/g, '$1 ').trim();

module.exports = { isValidRib, formatRib, ibanOf };
