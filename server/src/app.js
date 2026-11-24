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

// --- Security headers ---
// helmet sets ~15 safe HTTP headers (X-Frame-Options, HSTS, etc.). CSP is left
// off (default helmet behaviour for a pure JSON API).
app.use(helmet());

// --- CORS ---
// Accept requests only from the configured frontend origin. An explicit
// allowedHeaders list prevents browsers from sending arbitrary headers.
// credentials:true allows the Authorization header cross-origin.
const allowedOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim());
app.use(
  cors({
    origin: (origin, cb) => {
      // Allow requests with no origin (curl, Postman, server-to-server).
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  })
);

// --- Global rate limit ---
// A broad 300 req/15 min ceiling per IP as a last-resort abuse guard.
// Individual route groups (auth, AI) have their own tighter limits.
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
// Reject payloads larger than 1 MB.
app.use(express.json({ limit: '1mb' }));

// --- Health check ---
// Returns service status and uptime. No auth — used by uptime monitors.
// Also a quick smoke-test: if the process is running this responds.
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
