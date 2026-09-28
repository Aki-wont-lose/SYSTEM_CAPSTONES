// src/middleware/errorHandler.js

// Prisma error codes mapped to safe, non-revealing client messages.
// The default branch below never echoes a Prisma message: raw ones disclose table
// names, column names, constraint names and, for connection errors, the database
// host, port and username (e.g. "Can't reach database server at db.xxx.co:5432").
const PRISMA_MESSAGES = {
  P2000: 'The value provided is not valid.',
  P2002: 'That value is already in use.',
  P2003: 'This operation would break a linked record.',
  P2025: 'The requested record no longer exists.',
  P1000: 'Authentication to the database failed.',
  P1001: 'The service is temporarily unavailable. Please try again.',
  P1002: 'The service is temporarily unavailable. Please try again.',
  P1011: 'The service is temporarily unavailable. Please try again.'
};

// Anything at or above this status is our own fault; the client gets a generic
// message so internal wording, ids and driver detail never reach the browser.
const SERVER_FAULT = 500;

export const errorHandler = (err, req, res, next) => {
  // Log server-side, with enough context to triage, but never the request body
  // (it can contain passwords and base64 photos).
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} -> ${err.code || err.name || 'Error'}: ${err.message}`);

  // honour both conventions; express.json's 413 sets statusCode, not status
  const status = err.status || err.statusCode || SERVER_FAULT;

  let message;
  if (PRISMA_MESSAGES[err.code]) {
    message = PRISMA_MESSAGES[err.code];
  } else if (status < SERVER_FAULT) {
    // Deliberate, client-safe error (validation, 401, 403, 404...) - these messages
    // are written by us and are shown to the user in the UI.
    message = err.message || 'Request failed';
  } else {
    message = 'Something went wrong on our end. Please try again.';
  }

  res.status(status).json({
    success: false,
    message
    // NOTE: the previous handler sent the entire error object - including Prisma
    // `meta` and a stack trace with absolute server paths - to the client whenever
    // NODE_ENV was not exactly "production". That field is removed for good.
  });
};

export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
