// Singleton Anthropic client. Lazy-initialised so a missing key doesn't
// crash the whole server — only the AI features degrade.
const env = require('./env');

let client = null;

function getClient() {
  if (client) return client;
  if (!env.ANTHROPIC_API_KEY) return null;
  const { Anthropic } = require('@anthropic-ai/sdk');
  client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  return client;
}

module.exports = { getClient };
