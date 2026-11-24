// Text sanitisation helpers.
// We already use Zod for type/length validation; this layer strips characters
// that have no place in plain-text fields and trims whitespace so stored data
// is clean.
//
// What we sanitise:
//   - Trim leading/trailing whitespace
//   - Collapse internal runs of whitespace (tabs, newlines) to a single space
//     for single-line fields (name, title, category)
//   - Strip NUL bytes (\x00) which can confuse some DB drivers and log parsers
//   - Strip <script> and javascript: patterns from text fields (defence-in-depth
//     against stored XSS — the real XSS guard is the React frontend escaping
//     output, but we don't want raw script tags in the DB at all)
//
// We deliberately do NOT strip < > " ' in general because legitimate
// report descriptions might say things like "pipe > 5 cm in diameter".
// Escaping is the frontend's job; stripping is ours.

const SCRIPT_TAG_RE = /<script[\s\S]*?>[\s\S]*?<\/script>/gi;
const INLINE_JS_RE = /javascript\s*:/gi;
const NUL_RE = /\x00/g;

function sanitizeText(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(NUL_RE, '')
    .replace(SCRIPT_TAG_RE, '')
    .replace(INLINE_JS_RE, '')
    .trim();
}

function sanitizeSingleLine(str) {
  if (typeof str !== 'string') return str;
  return sanitizeText(str).replace(/\s+/g, ' ');
}

// Middleware: sanitise all string fields in req.body in-place.
// Run after JSON/multipart parsing and after Zod validation (so the shape is
// already guaranteed), just before the controller.
const sanitizeBody = (req, _res, next) => {
  if (req.body && typeof req.body === 'object') {
    for (const [key, val] of Object.entries(req.body)) {
      if (typeof val === 'string') {
        const isMultiLine = ['description', 'note'].includes(key);
        req.body[key] = isMultiLine ? sanitizeText(val) : sanitizeSingleLine(val);
      }
    }
  }
  next();
};

module.exports = { sanitizeText, sanitizeSingleLine, sanitizeBody };
