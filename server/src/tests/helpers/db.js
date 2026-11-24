// Test database helpers.
// Tests run against the REAL Supabase DB (using DATABASE_URL from .env).
// Each test file calls seedUser/seedReport to set up data and
// cleanupTestData() in afterAll to remove it.
//
// Why not a mock DB? For a portfolio project, testing against a real DB
// proves the SQL actually works. The trade-off is tests need a live
// connection — acceptable because Supabase is always-on.
const { pool } = require('../../config/db');

const TEST_EMAIL_PREFIX = 'jest_test_';

// Insert a minimal user and return the row (no password hash needed —
// tests that need to log in call the register endpoint instead).
async function seedUser(overrides = {}) {
  const email = overrides.email || `${TEST_EMAIL_PREFIX}${Date.now()}@test.com`;
  const result = await pool.query(
    `insert into users (name, email, password_hash, role)
     values ($1, $2, $3, $4)
     returning id, name, email, role, created_at`,
    [
      overrides.name || 'Test User',
      email,
      '$2b$10$placeholder_hash_for_tests_only',
      overrides.role || 'resident',
    ]
  );
  return result.rows[0];
}

// Insert a minimal report and return the row.
async function seedReport(userId, overrides = {}) {
  const result = await pool.query(
    `insert into reports (user_id, title, description, category, latitude, longitude, priority)
     values ($1, $2, $3, $4, $5, $6, $7)
     returning id, user_id, title, description, category, status, latitude, longitude,
               priority, upvote_count, created_at, updated_at`,
    [
      userId,
      overrides.title || 'Test report title that is long enough',
      overrides.description || 'Test description that is long enough for validation',
      overrides.category || 'roads',
      overrides.latitude ?? -1.6292,
      overrides.longitude ?? 6.6705,
      overrides.priority || 'medium',
    ]
  );
  return result.rows[0];
}

// Remove all test data created during this test run. Using a prefix on emails
// means we never accidentally delete real user data.
async function cleanupTestData() {
  await pool.query(
    `delete from users where email like '${TEST_EMAIL_PREFIX}%'`
  );
}

// End the pool so Jest can exit cleanly (no open handles).
async function closePool() {
  await pool.end();
}

module.exports = { seedUser, seedReport, cleanupTestData, closePool };
