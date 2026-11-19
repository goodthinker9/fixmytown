// Central PostgreSQL connection pool.
// One Pool is shared across the whole app; pg manages the connections.
const { Pool } = require('pg');
const env = require('./env');

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 10, // max simultaneous connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Surface unexpected pool errors (e.g. the DB restarted) instead of
// letting them crash the process silently.
pool.on('error', (err) => {
  console.error('⚠️  Unexpected PostgreSQL pool error:', err.message);
});

// Thin query helper so controllers call `query(sql, params)` directly.
const query = (text, params) => pool.query(text, params);

module.exports = { pool, query };
