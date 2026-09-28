// Numbers in French words, for amounts on invoices ("Arrêtée la présente
// facture à la somme de ..."). Traditional spelling: hyphens below one
// hundred, "et" in 21, 31 ... 71, plural "cents" and "quatre-vingts" only
// at the end of a number.

const UNITS = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix',
  'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize'];
const TENS = { 2: 'vingt', 3: 'trente', 4: 'quarante', 5: 'cinquante', 6: 'soixante' };

// 0–99
const belowHundred = (n) => {
  if (n <= 16) return UNITS[n];
  if (n < 20) return `dix-${UNITS[n - 10]}`;
  const tens = Math.floor(n / 10);
  const unit = n % 10;
  if (tens === 7 || tens === 9) {
    // 70–79 is soixante + 10–19, 90–99 is quatre-vingt + 10–19
    const base = tens === 7 ? 'soixante' : 'quatre-vingt';
    const rest = belowHundred(10 + unit);
    return tens === 7 && unit === 1 ? `${base} et ${rest}` : `${base}-${rest}`;
  }
  if (tens === 8) return unit === 0 ? 'quatre-vingts' : `quatre-vingt-${UNITS[unit]}`;
  if (unit === 0) return TENS[tens];
  if (unit === 1) return `${TENS[tens]} et un`;
  return `${TENS[tens]}-${UNITS[unit]}`;
};

// 0–999; `last` when nothing follows (for "cents" / "quatre-vingts")
const belowThousand = (n, last = true) => {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  let words = '';
  if (hundreds === 1) words = 'cent';
  else if (hundreds > 1) words = `${UNITS[hundreds]} cent${rest === 0 && last ? 's' : ''}`;
  if (rest) {
    let restWords = belowHundred(rest);
    if (!last && rest === 80) restWords = 'quatre-vingt';
    words = words ? `${words} ${restWords}` : restWords;
  }
  return words || 'zéro';
};

const toFrenchWords = (value) => {
  let n = Math.floor(Math.abs(value));
  if (n === 0) return 'zéro';
  const parts = [];
  const millions = Math.floor(n / 1e6);
  n %= 1e6;
  const thousands = Math.floor(n / 1000);
  const rest = n % 1000;
  if (millions) parts.push(`${belowThousand(millions, false)} million${millions > 1 ? 's' : ''}`);
  if (thousands) parts.push(thousands === 1 ? 'mille' : `${belowThousand(thousands, false)} mille`);
  if (rest) parts.push(belowThousand(rest, true));
  return parts.join(' ');
};

// 174.5 → "cent soixante-quatorze dinars et cinq cents millimes"
const dinarsInWords = (amount) => {
  const millimesTotal = Math.round(amount * 1000);
  const dinars = Math.floor(millimesTotal / 1000);
  const millimes = millimesTotal % 1000;
  const dinarWords = `${toFrenchWords(dinars)} dinar${dinars > 1 ? 's' : ''}`;
  return millimes ? `${dinarWords} et ${toFrenchWords(millimes)} millime${millimes > 1 ? 's' : ''}` : dinarWords;
};

module.exports = { toFrenchWords, dinarsInWords };
