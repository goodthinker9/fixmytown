// Generic Zod validation middleware.
// Usage: validate(schema)              -> validates req.body    (422 on failure)
//        validate(schema, 'query')     -> validates req.query   (422 on failure)
//        validate(schema, 'params')    -> validates req.params  (400 on failure)
//
// 'params' returns 400 because a bad route parameter (e.g. a non-UUID :id) is a
// malformed request URL, not a semantic/business-rule violation. 422 is reserved
// for valid-shape payloads that fail business rules (body/query validation).
//
// On success the parsed data is stored on req.validated[property] AND written
// back to req[property] for body/params (strips unknown keys — mass-assignment
// guard). Query strings are only stored on req.validated.query because Express
// can expose req.query as a read-only getter.
const AppError = require('../utils/AppError');

const validate = (schema, property = 'body') => (req, _res, next) => {
  const result = schema.safeParse(req[property]);

  if (!result.success) {
    const details = result.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
    // 400 for route params (bad URL format), 422 for body/query (bad payload).
    const statusCode = property === 'params' ? 400 : 422;
    return next(new AppError('Validation failed', statusCode, details));
  }

  req.validated = req.validated || {};
  req.validated[property] = result.data;

  if (property !== 'query') {
    req[property] = result.data;
  }

  next();
};

module.exports = validate;
