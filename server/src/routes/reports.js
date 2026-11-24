// Reports routes (/api/reports)
const express = require('express');
const rateLimit = require('express-rate-limit');
const z = require('zod');

const reportsController = require('../controllers/reportsController');
const upvoteController = require('../controllers/upvoteController');
const authRequired = require('../middleware/authRequired');
const validate = require('../middleware/validate');
const uploadImage = require('../middleware/upload');
const { sanitizeBody } = require('../utils/sanitize');

const router = express.Router();

// Shared value sets (mirror the DB enums from Phase 1).
const CATEGORIES = ['water', 'electricity', 'roads', 'garbage', 'safety', 'other'];
const STATUSES = ['reported', 'in_progress', 'resolved'];

// UUID param schema — reused for every /:id route.
// Returns 400 (not 422) for a syntactically invalid id so callers can
// distinguish "bad input format" from "valid id but record not found" (404).
const uuidParamSchema = z.object({
  id: z.string().uuid('Report id must be a valid UUID'),
});

// --- Validation schemas ---
const createReportSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(150),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(2000),
  category: z.enum(CATEGORIES, { errorMap: () => ({ message: 'Invalid category' }) }),
  latitude: z.coerce
    .number({ invalid_type_error: 'Latitude must be a number' })
    .min(-90, 'Latitude must be between -90 and 90')
    .max(90, 'Latitude must be between -90 and 90'),
  longitude: z.coerce
    .number({ invalid_type_error: 'Longitude must be a number' })
    .min(-180, 'Longitude must be between -180 and 180')
    .max(180, 'Longitude must be between -180 and 180'),
});

const listReportsSchema = z.object({
  category: z.enum(CATEGORIES).optional(),
  status: z.enum(STATUSES).optional(),
  // No regex guard on search — special characters are escaped in the controller
  // before they reach the ILIKE pattern, so they're safe to pass through here.
  search: z.string().max(150).optional(),
  sort: z.enum(['newest', 'top']).optional().default('newest'),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});

// Rate-limit report creation: 10 new reports per hour per USER (not IP).
// Keying on user id is fairer than IP (NAT/VPNs share IPs) and more accurate
// (one person can't bypass it by switching network). authRequired runs before
// this limiter, so req.user.id is guaranteed to exist by the time keyGenerator runs.
const createLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => req.user.id,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many reports submitted. Please try again later.' },
});

// GET routes are public. POST/DELETE require a logged-in user.
router.get('/', validate(listReportsSchema, 'query'), reportsController.listReports);

router.get(
  '/:id',
  validate(uuidParamSchema, 'params'),
  reportsController.getReport
);

router.post(
  '/',
  authRequired,
  createLimiter,       // after authRequired so req.user.id exists
  uploadImage,         // multipart parser — must run before Zod validate on body
  validate(createReportSchema),
  sanitizeBody,
  reportsController.createReport
);

router.post(
  '/:id/upvote',
  authRequired,
  validate(uuidParamSchema, 'params'),
  upvoteController.toggleUpvote
);

router.delete(
  '/:id',
  authRequired,
  validate(uuidParamSchema, 'params'),
  reportsController.deleteReport
);

module.exports = router;
