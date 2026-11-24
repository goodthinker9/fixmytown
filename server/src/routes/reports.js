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

const CATEGORIES = ['water', 'electricity', 'roads', 'garbage', 'safety', 'other'];
const STATUSES = ['reported', 'in_progress', 'resolved'];

const uuidParamSchema = z.object({
  id: z.string().uuid('Report id must be a valid UUID'),
});

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
  search: z.string().max(150).optional(),
  // sort now also accepts 'distance' — only meaningful when lat+lng are provided;
  // the controller falls back to 'newest' when no coordinates are given.
  sort: z.enum(['newest', 'top', 'distance']).optional().default('newest'),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),

  // --- Proximity search (all three must be provided together) ---
  // lat/lng: the reference point (user's location or geocoded address).
  // radius_km: cap at 50 km — prevents full-table scans and accidental misuse.
  lat: z.coerce
    .number({ invalid_type_error: 'lat must be a number' })
    .min(-90).max(90)
    .optional(),
  lng: z.coerce
    .number({ invalid_type_error: 'lng must be a number' })
    .min(-180).max(180)
    .optional(),
  radius_km: z.coerce
    .number({ invalid_type_error: 'radius_km must be a number' })
    .positive('radius_km must be positive')
    .max(50, 'radius_km cannot exceed 50 km')
    .optional()
    .default(10),
}).refine(
  (d) => {
    // If any proximity param is supplied, lat AND lng must both be present.
    const hasAny = d.lat !== undefined || d.lng !== undefined;
    const hasBoth = d.lat !== undefined && d.lng !== undefined;
    return !hasAny || hasBoth;
  },
  { message: 'Both lat and lng must be provided together', path: ['lat'] }
);

const createLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => req.user.id,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many reports submitted. Please try again later.' },
});

router.get('/', validate(listReportsSchema, 'query'), reportsController.listReports);

router.get(
  '/:id',
  validate(uuidParamSchema, 'params'),
  reportsController.getReport
);

router.post(
  '/',
  authRequired,
  createLimiter,
  uploadImage,
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
