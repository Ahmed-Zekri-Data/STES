// Case-insensitive "contains" match for text typed by a user. The text is
// escaped, so characters like "(" or "*" are matched literally instead of
// breaking the query or making it slow.
const containing = (text) => new RegExp(String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

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

module.exports = { containing, slugify, isImageLocation };
