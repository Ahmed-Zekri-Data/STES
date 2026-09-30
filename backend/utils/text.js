// "Contains" match for text typed by a user, whatever its case and accents:
// customers often type "echelle" or "amorcante" for "échelle" or
// "amorçante", and the other way round. The text is escaped, so characters
// like "(" or "*" are matched literally instead of breaking the query or
// making it slow.
const escapeRegex = (text) => String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// The text without its accents ("Œuf à" becomes "Oeuf a")
const plain = (text) => String(text ?? '')
  .replace(/œ/g, 'oe').replace(/Œ/g, 'Oe').replace(/æ/g, 'ae').replace(/Æ/g, 'Ae')
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '');

// Each letter with its accented forms, in upper and lower case
const ACCENTED = { a: 'aàâäáãå', c: 'cç', e: 'eéèêë', i: 'iîïíì', n: 'nñ', o: 'oôöóòõ', u: 'uùûüú', y: 'yÿý' };
const LIGATURES = { oe: 'œŒ', ae: 'æÆ' };
const letter = (char) => {
  const forms = ACCENTED[char.toLowerCase()];
  return forms ? `[${forms}${forms.toUpperCase()}]` : escapeRegex(char);
};

const containing = (text) => {
  const typed = plain(text);
  let pattern = '';
  for (let i = 0; i < typed.length; i += 1) {
    const ligature = LIGATURES[typed.slice(i, i + 2).toLowerCase()];
    if (ligature) {
      pattern += `(?:${letter(typed[i])}${letter(typed[i + 1])}|[${ligature}])`;
      i += 1;
    } else {
      pattern += letter(typed[i]);
    }
  }
  return new RegExp(pattern, 'i');
};

// A search where every word typed must appear, in any of the fields:
// "pompe victoria" finds the pump "Victoria Plus". Words are split on
// spaces, dashes and apostrophes; single letters (the "l" of "l'eau") are
// left out, single digits are kept. A text with no such word ("(") is
// searched as it is.
const everyWord = (text, fields) => {
  const typed = plain(text).toLowerCase().trim();
  const words = [...new Set(typed.split(/[\s'’-]+/))].filter(word => word.length > 1 || /\d/.test(word));
  return (words.length ? words.slice(0, 8) : [typed].filter(Boolean))
    .map(word => ({ $or: fields.map(field => ({ [field]: containing(word) })) }));
};

// The same text, ignoring upper and lower case ("hayward" matches
// "Hayward", but not "Hayward Pro")
const exactly = (text) => new RegExp(`^${escapeRegex(String(text).trim())}$`, 'i');

// Lowercase ASCII address part: "Équipements & Accessoires" becomes
// "equipements-accessoires". Letters outside a-z (e.g. Arabic) are dropped,
// so the result can be empty.
const slugify = (text) => String(text || '')
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

// Images are either full http(s) URLs or images served by this API
// (uploads and placeholders)
const isImageLocation = (value) => {
  if (/^\/api\/(uploads|placeholder)\/[\w./-]+$/.test(value) && !value.includes('..')) {
    return true;
  }
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

module.exports = { containing, everyWord, plain, exactly, slugify, isImageLocation };
