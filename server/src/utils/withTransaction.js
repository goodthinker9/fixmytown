// Runs an async function inside a single DB transaction.
// Acquires a client, BEGINs, runs fn(client), COMMITs on success, ROLLBACKs on
// any thrown error (including AppErrors used for 404/403), and always releases
// the client back to the pool.
const { pool } = require('../config/db');

const withTransaction = async (fn) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackErr) {
      console.error('ROLLBACK failed:', rollbackErr.message);
    }
    throw err; // re-throw so the route's asyncHandler -> errorHandler handle it
  } finally {
    client.release();
  }
};

module.exports = withTransaction;
