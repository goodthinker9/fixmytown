// Express application setup: security middleware, body parsing, route mounting,
// a 404 catch-all, and the central error handler (always last).
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const env = require('./config/env');
const errorHandler = require('./middleware/errorHandler');
const authRoutes = require('./routes/auth');
const reportRoutes = require('./routes/reports');
const adminRoutes = require('./routes/admin');
const AppError = require('./utils/AppError');

const app = express();

// --- Trust proxy ---
// Must be set BEFORE any middleware that reads req.ip (rate limiters, CORS).
// '1' means we trust the first upstream proxy (Render, Railway, Heroku, etc.)
// to have set X-Forwarded-For correctly, so rate limiters key on the real
// client IP rather than the proxy's IP.
app.set('trust proxy', 1);

// --- Security headers ---
app.use(helmet());

// --- CORS ---
// Accept requests only from the configured frontend origin(s).
// CORS_ORIGIN can be comma-separated for multiple origins.
const allowedOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim());
app.use(
  cors({
    origin: (origin, cb) => {
      // Allow requests with no origin (curl, Postman, server-to-server).
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      // Return a proper AppError so the central error handler sends a consistent
      // JSON 403 instead of a plain text "Error: CORS..." response.
      cb(new AppError(`CORS: origin ${origin} not allowed`, 403));
    },
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  })
);

// --- Global rate limit ---
// A broad 300 req/15 min ceiling per IP as a last-resort abuse guard.
// Individual route groups (auth, AI, report-create) have their own tighter limits.
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests. Please slow down.' },
  })
);

// --- Body parsing ---
app.use(express.json({ limit: '1mb' }));

// --- Health check ---
app.get('/api/health', (_req, res) =>
  res.json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    env: env.NODE_ENV,
    timestamp: new Date().toISOString(),
  })
);

// --- Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/admin', adminRoutes);

// --- 404 ---
app.use((_req, _res, next) => next(new AppError('Route not found.', 404)));

// --- Central error handler (must be last; 4-argument signature) ---
app.use(errorHandler);

module.exports = app;
