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

  req[property] = result.data;
  next();
};

module.exports = validate;
