/**
 * adminOnly — Backend-2
 *
 * Re-reads the user's current role directly from the database instead of
 * trusting the role embedded in the JWT.
 *
 * Why:
 *   JWT roles are minted at login and valid for 7 days. If a user's role is
 *   revoked (e.g. demoted from admin back to resident) the old JWT still carries
 *   role:'admin'. Doing a single cheap DB read per admin request closes that
 *   window to zero without requiring token invalidation infrastructure.
 *
 * Trade-off:
 *   One extra SELECT per admin request. Admin routes are low-traffic so the
 *   cost is acceptable; this is NOT applied to ordinary resident routes, which
 *   stay stateless.
 *
 * Also returns 401 if the user no longer exists (e.g. deleted account).
 */
const { query } = require('../config/db');
const AppError  = require('../utils/AppError');

const adminOnly = async (req, _res, next) => {
  if (!req.user) {
    return next(new AppError('Authentication required.', 401));
  }

  try {
    const result = await query(
      'select role from users where id = $1',
      [req.user.id]
    );

    if (result.rowCount === 0) {
      return next(new AppError('User account not found. Please log in again.', 401));
    }

    const currentRole = result.rows[0].role;

    // Update req.user.role so downstream handlers see the current value.
    req.user = { ...req.user, role: currentRole };

    if (currentRole !== 'admin') {
      return next(new AppError('Admin access required.', 403));
    }

    next();
  } catch (err) {
    next(err);
  }
};

module.exports = adminOnly;
