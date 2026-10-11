// The text of some HTML, for reading times and search engines
const plainText = (html) => String(html || '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ')
  .replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'")
  .replace(/\s+/g, ' ')
  .trim();

// Minutes to read, at about 200 words a minute
const readingMinutes = (html) => Math.max(1, Math.round(plainText(html).split(' ').filter(Boolean).length / 200));

module.exports = { plainText, readingMinutes };
