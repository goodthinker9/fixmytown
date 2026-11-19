// Wraps an async route handler so rejected promises go to `next` and reach
// the central error handler. Without this, an unhandled async rejection is
// never caught by Express's default error handling.
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
