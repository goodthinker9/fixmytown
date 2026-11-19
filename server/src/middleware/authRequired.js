// Verifies the Bearer JWT and attaches { id, role } to req.user.
// Stateless: no DB lookup per request; the payload is trusted.
const { verifyToken } = require('../utils/jwt');
const AppError = require('../utils/AppError');

const authRequired = (req, _res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return next(new AppError('Authentication required. Please log in.', 401));
  }

  const token = header.slice(7).trim();

  try {
    const payload = verifyToken(token);
    req.user = { id: payload.id, role: payload.role };
    next();
  } catch (err) {
    return next(new AppError('Invalid or expired token. Please log in again.', 401));
  }
};

module.exports = authRequired;
