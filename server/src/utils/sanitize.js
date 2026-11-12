const sanitizeHtml = require('sanitize-html');

/** Allowed HTML for rich-text note content. Strips scripts, event handlers, styles, iframes. */
const sanitizeNoteContent = (html) =>
  sanitizeHtml(html || '', {
    allowedTags: [
      'p', 'br', 'b', 'strong', 'i', 'em', 'u', 's', 'strike', 'blockquote', 'pre', 'code',
      'h1', 'h2', 'h3', 'ul', 'ol', 'li', 'a', 'div', 'span', 'hr',
    ],
    allowedAttributes: {
      a: ['href', 'target', 'rel'],
      div: ['data-checklist'],
      span: ['style'],
      p: ['style'],
      li: ['class', 'style'],
      ul: ['class'],
    },
    allowedStyles: {
      '*': { 'text-align': [/^(left|center|right|justify)$/i] },
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer', target: '_blank' }),
    },
  });

/** Plain-text excerpt from stored HTML, for previews/search. */
const htmlToExcerpt = (html, maxLen = 180) => {
  const text = String(html || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > maxLen ? `${text.slice(0, maxLen).trimEnd()}…` : text;
};

module.exports = { sanitizeNoteContent, htmlToExcerpt };
