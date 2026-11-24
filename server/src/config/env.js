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
  // AI model to use. Defaults to claude-haiku-5-5; override in .env if needed.
  AI_MODEL: z.string().default('claude-haiku-5-5'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:\n');
  console.error(JSON.stringify(parsed.error.format(), null, 2));
  process.exit(1);
}

module.exports = parsed.data;
