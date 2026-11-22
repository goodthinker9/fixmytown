// Generic Zod validation middleware.
// Usage: validate(schema)        -> validates req.body
//        validate(schema, 'params') -> validates req.params, etc.
// On success it replaces req[property] with the parsed data, which strips
// unknown keys (prevents mass-assignment) and coerces types.
const AppError = require('../utils/AppError');

const validate = (schema, property = 'body') => (req, _res, next) => {
  const result = schema.safeParse(req[property]);

  if (!result.success) {
    const details = result.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
    // 422 = semantically valid request, but failed business/validation rules
    return next(new AppError('Validation failed', 422, details));
  }

  req.validated = req.validated || {};
  req.validated[property] = result.data;

  // Replace the original for body/params (own writable props, strips unknown keys
  // as a mass-assignment guard). For 'query' we skip the write-back — Express can
  // expose req.query as a read-only getter, so handlers read req.validated.query.
  if (property !== 'query') {
    req[property] = result.data;
  }

  next();
};

module.exports = validate;
