// Entry point: verifies the DB connection is reachable, then starts listening.
const { pool } = require('./src/config/db');
const env = require('./src/config/env');
const app = require('./src/app');

const start = async () => {
  try {
    // Quick connectivity check — fail loudly at startup if the DB is unreachable.
    await pool.query('select 1');
    console.log('✅ Database connected');
  } catch (err) {
    console.error('❌ Failed to connect to the database:', err.message);
    process.exit(1);
  }

  app.listen(env.PORT, () => {
    console.log(`🚀 FixMyTown API running at http://localhost:${env.PORT}`);
  });
};

start();
