// Central error handler — the last middleware in app.js.
// Converts any thrown AppError into a consistent JSON envelope so every error
// response has the same shape:
//   { status: 'error', error: 'Human-readable message', [details]: [...] }
// This makes it easy to test and easy for the frontend to consume.
const errorHandler = (err, _req, res, _next) => {
  const statusCode = err.statusCode || 500;

  // Log server errors with the full stack; skip 4xx (expected, noisy).
  if (statusCode >= 500) {
    console.error(err);
  }

  const body = {
    status: 'error',
    error: err.message || 'Internal server error',
  };

  // Attach validation field details when present (422 responses).
  if (err.details) {
    body.details = err.details;
  }

  // Include a stack trace only in non-production for debugging.
  // Never in production: stack traces leak internal paths and package versions.
  if (process.env.NODE_ENV !== 'production' && statusCode >= 500) {
    body.stack = err.stack;
  }

  res.status(statusCode).json(body);
};

module.exports = errorHandler;
