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

// --- Validation schemas ---
// Multipart form fields arrive as strings, so latitude/longitude use
// z.coerce.number() to turn them into numbers before they reach the controller.
const createReportSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(150),
  description: z.string().min(10, 'Description must be at least 10 characters').max(2000),
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
  search: z
    .string()
    .max(150)
    .regex(/^[^;'"\\<>]*$/, 'Search contains invalid characters')
    .optional(),
  sort: z.enum(['newest', 'top']).optional().default('newest'),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});

// Rate-limit report creation: 10 new reports per hour per IP.
// Prevents bulk spam without blocking normal use.
const createLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many reports submitted. Please try again later.' },
});

// GET routes are public. POST/DELETE require a logged-in user.
router.get('/', validate(listReportsSchema, 'query'), reportsController.listReports);
router.get('/:id', reportsController.getReport);
router.post(
  '/',
  authRequired,
  createLimiter,
  uploadImage,         // multipart parser — must run before Zod validate on body
  validate(createReportSchema),
  sanitizeBody,
  reportsController.createReport
);
// Toggle upvote on a report (login required)
router.post('/:id/upvote', authRequired, upvoteController.toggleUpvote);

router.delete('/:id', authRequired, reportsController.deleteReport);

module.exports = router;
