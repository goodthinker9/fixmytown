// Use after authRequired. Rejects non-admins with 403.
const AppError = require('../utils/AppError');

const adminOnly = (req, _res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return next(new AppError('Admin access required.', 403));
  }
  next();
};

module.exports = adminOnly;
