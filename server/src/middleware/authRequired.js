// Verifies the Bearer JWT and attaches { id, role } to req.user.
// Stateless for read operations (GET/HEAD/OPTIONS) — no DB lookup.
// For write operations (POST/PATCH/DELETE/PUT) verifies the user still
// exists in the database, returning 401 if the account was deleted.
const { verifyToken } = require('../utils/jwt');
const { query } = require('../config/db');
const AppError = require('../utils/AppError');

const WRITE_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

const authRequired = async (req, _res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return next(new AppError('Authentication required. Please log in.', 401));
  }

  const token = header.slice(7).trim();

  let payload;
  try {
    payload = verifyToken(token);
  } catch (err) {
    return next(new AppError('Invalid or expired token. Please log in again.', 401));
  }

  req.user = { id: payload.id, role: payload.role };

  // Write operations: confirm the account still exists.
  if (WRITE_METHODS.has(req.method)) {
    try {
      const result = await query('select id from users where id = $1', [req.user.id]);
      if (result.rowCount === 0) {
        return next(new AppError('User account not found. Please log in again.', 401));
      }
    } catch (err) {
      return next(new AppError('Database error during authentication.', 500));
    }
  }

  next();
};

module.exports = authRequired;
