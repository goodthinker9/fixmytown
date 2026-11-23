// Admin routes (/api/admin). Every route requires an authenticated admin.
const express = require('express');
const rateLimit = require('express-rate-limit');
const z = require('zod');

const adminController = require('../controllers/adminController');
const authRequired = require('../middleware/authRequired');
const adminOnly = require('../middleware/adminOnly');
const validate = require('../middleware/validate');

const router = express.Router();

const updateStatusSchema = z.object({
  status: z.enum(['reported', 'in_progress', 'resolved']),
  note: z.string().max(500).optional(),
});

// AI endpoints are more expensive than DB queries. Rate-limit separately:
// 10 requests per 10 minutes per IP is generous for a human clicking a button
// but blocks accidental loops or automated abuse.
const aiLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many AI requests. Please wait a few minutes.' },
});

// Apply auth + admin guard to every route below.
router.use(authRequired, adminOnly);

router.patch('/reports/:id/status', validate(updateStatusSchema), adminController.updateStatus);
router.get('/stats', adminController.getStats);
router.get('/weekly-summary', aiLimiter, adminController.getWeeklySummary);

module.exports = router;
