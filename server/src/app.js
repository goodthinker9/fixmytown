// Express application setup: security middleware, body parsing, route mounting,
// a 404 catch-all, and the central error handler (always last).
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');

const env = require('./config/env');
const errorHandler = require('./middleware/errorHandler');
const authRoutes = require('./routes/auth');
const reportRoutes = require('./routes/reports');
const AppError = require('./utils/AppError');

const app = express();

// Security headers (CSP off by default for an API; enables many safe defaults).
app.use(helmet());

// CORS: allow only the configured frontend origin. credentials:true means
// cookies/headers are allowed cross-origin (we use Bearer tokens, kept just
// in case we add cookies later).
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));

// Parse JSON bodies; reject payloads larger than 1MB.
app.use(express.json({ limit: '1mb' }));

// Health check (no auth) — handy for uptime checks and quick smoke tests.
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/reports', reportRoutes);

// 404 for any other route.
app.use((_req, _res, next) => next(new AppError('Route not found.', 404)));

// Central error handler (must be the last middleware; 4 args = error handler).
app.use(errorHandler);

module.exports = app;
