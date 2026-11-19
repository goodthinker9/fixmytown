// Central place to sign/verify JWTs so the secret + expiry live in one spot.
const jwt = require('jsonwebtoken');
const env = require('../config/env');

// Token payload: { id, role }. We embed the role so adminOnly can authorize
// without a DB hit on every request. Trade-off noted in README/decisions:
// a role change takes effect on the next login (or token refresh).
const signToken = (payload) =>
  jwt.sign(payload, env.JWT_SECRET, { expiresIn: '7d' });

const verifyToken = (token) => jwt.verify(token, env.JWT_SECRET);

module.exports = { signToken, verifyToken };
