// Case-insensitive "contains" match for text typed by a user. The text is
// escaped, so characters like "(" or "*" are matched literally instead of
// breaking the query or making it slow.
const containing = (text) => new RegExp(String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

module.exports = { containing };
