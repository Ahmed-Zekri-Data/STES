const sanitizeHtml = require('sanitize-html');

// The About and Contact pages are written in the admin as HTML and shown to
// every visitor. Only formatting is kept: no scripts, event handlers, styles,
// frames or javascript: links, which could run in a visitor's (or a super
// admin's) browser and read their login.
const PAGE_HTML = {
  allowedTags: [
    'h2', 'h3', 'h4', 'p', 'br', 'hr', 'ul', 'ol', 'li', 'strong', 'b', 'em', 'i', 'u',
    'blockquote', 'a', 'div', 'span', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td'
  ],
  allowedAttributes: {
    a: ['href', 'title', 'target', 'rel'],
    img: ['src', 'alt', 'width', 'height'],
    '*': ['class']
  },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesByTag: { img: ['http', 'https'] },
  allowProtocolRelative: false,
  // Links that open a new tab can't reach back into this page
  transformTags: {
    a: (tagName, attribs) => ({
      tagName,
      attribs: attribs.target === '_blank' ? { ...attribs, rel: 'noopener noreferrer' } : attribs
    })
  }
};

const cleanPageHtml = (html) => sanitizeHtml(String(html ?? ''), PAGE_HTML);

module.exports = { cleanPageHtml };
