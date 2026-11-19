// Auth controller: register, login, me.
// Passwords are hashed with bcrypt before they ever reach the database, and
// password_hash is never included in any response.
const bcrypt = require('bcrypt');
const { query } = require('../config/db');
const { signToken } = require('../utils/jwt');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

const SALT_ROUNDS = 10;

// POST /api/auth/register
const register = asyncHandler(async (req, res, next) => {
  const { name, email, password } = req.body;

  // Prevent duplicate accounts with a pre-check. (The unique constraint on
  // email is the real guarantee; this gives a clean 409 instead of a 23505.)
  const existing = await query('select id from users where email = $1', [email]);
  if (existing.rowCount > 0) {
    return next(new AppError('Email is already registered.', 409));
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const result = await query(
    `insert into users (name, email, password_hash, role)
     values ($1, $2, $3, 'resident')
     returning id, name, email, role, created_at`,
    [name, email, passwordHash]
  );

  const user = result.rows[0];
  const token = signToken({ id: user.id, role: user.role });

  res.status(201).json({ user, token });
});

// POST /api/auth/login
const login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  const result = await query(
    `select id, name, email, password_hash, role, created_at
     from users where email = $1`,
    [email]
  );
  const user = result.rows[0];

  // Same message for "no such email" and "wrong password" to avoid
  // user-enumeration via the login endpoint.
  if (!user) {
    return next(new AppError('Invalid email or password.', 401));
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return next(new AppError('Invalid email or password.', 401));
  }

  const token = signToken({ id: user.id, role: user.role });

  // Explicitly build the safe response object (omit password_hash).
  const safeUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    created_at: user.created_at,
  };

  res.json({ user: safeUser, token });
});

// GET /api/auth/me  (requires authRequired)
const me = asyncHandler(async (req, res, next) => {
  const result = await query(
    `select id, name, email, role, created_at
     from users where id = $1`,
    [req.user.id]
  );

  const user = result.rows[0];
  if (!user) {
    return next(new AppError('User not found.', 404));
  }

  res.json({ user });
});

module.exports = { register, login, me };
