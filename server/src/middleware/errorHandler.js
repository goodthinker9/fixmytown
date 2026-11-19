// Central error handler — the last middleware in app.js. Converts any thrown
// AppError into a JSON response, and logs unexpected (5xx) errors in detail.
const errorHandler = (err, _req, res, _next) => {
  const statusCode = err.statusCode || 500;

  // Always log server errors so bugs are visible; client errors (4xx) are
  // expected and noisy, so we skip them.
  if (statusCode >= 500) {
    console.error(err);
  }

  const body = { error: err.message || 'Internal server error' };

  // Attach validation details when present.
  if (err.details) {
    body.details = err.details;
  }

  // Include a stack trace only outside production, for debugging.
  if (process.env.NODE_ENV !== 'production' && statusCode >= 500) {
    body.stack = err.stack;
  }

  res.status(statusCode).json(body);
};

module.exports = errorHandler;
