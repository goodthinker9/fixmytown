// Singleton Anthropic client. Lazy-initialised so a missing key doesn't
// crash the whole server — only the AI features degrade.
const env = require('./env');

// Values that look like "TODO: paste your key here" placeholders are treated
// as missing so AI degrades gracefully instead of returning 401 errors.
const PLACEHOLDER_PATTERNS = [/replace_with/i, /your_api_key/i, /your_secret/i];

function _looksLikePlaceholder(value) {
  return typeof value === 'string' && PLACEHOLDER_PATTERNS.some((p) => p.test(value));
}

let client = null;

function getClient() {
  if (client) return client;
  if (!env.ANTHROPIC_API_KEY || _looksLikePlaceholder(env.ANTHROPIC_API_KEY)) return null;
  const { Anthropic } = require('@anthropic-ai/sdk');
  client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  return client;
}

module.exports = { getClient };
