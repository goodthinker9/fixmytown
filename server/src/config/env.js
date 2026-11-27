// Loads .env from the server/ folder (works regardless of the current
// working directory) and validates every variable up front, so a missing
// or invalid secret fails fast at startup instead of mid-request.
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const z = require('zod');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  SUPABASE_URL: z.string().url('SUPABASE_URL must be a valid URL'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),
  // Optional: if missing, AI features degrade gracefully (no crash).
  ANTHROPIC_API_KEY: z.string().optional(),
  // AI model to use. Defaults to claude-3-haiku-20240307; override in .env if needed.
  AI_MODEL: z.string().default('claude-3-haiku-20240307'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:\n');
  console.error(JSON.stringify(parsed.error.format(), null, 2));
  process.exit(1);
}

// Treat "TODO: paste your key here" placeholders as missing so AI degrades
// gracefully instead of returning 401 errors, and so the startup check below
// can distinguish "not configured" from "misconfigured".
const PLACEHOLDER_PATTERNS = [/replace_with/i, /your_api_key/i, /your_secret/i];
function _looksLikePlaceholder(value) {
  return typeof value === 'string' && PLACEHOLDER_PATTERNS.some((p) => p.test(value));
}

const env = parsed.data;

if (_looksLikePlaceholder(env.ANTHROPIC_API_KEY)) {
  console.warn('⚠️  ANTHROPIC_API_KEY is a placeholder — AI features will degrade gracefully.');
  env.ANTHROPIC_API_KEY = undefined;
}

if (_looksLikePlaceholder(env.SUPABASE_SERVICE_ROLE_KEY)) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY is still a placeholder ("replace_with_your_service_role_key").');
  console.error('   Get your service_role key from Supabase > Project Settings > API > service_role secret.');
  console.error('   Set it in .env and restart the server. Image uploads will fail until then.');
  // Don't kill the test runner; let tests run (they'll mock Supabase anyway).
  if (env.NODE_ENV !== 'test') process.exit(1);
}

module.exports = env;
