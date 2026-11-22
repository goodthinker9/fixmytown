// Admin routes (/api/admin). Every route requires an authenticated admin.
const express = require('express');
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

// Apply auth + admin guard to every route below.
router.use(authRequired, adminOnly);

router.patch('/reports/:id/status', validate(updateStatusSchema), adminController.updateStatus);
router.get('/stats', adminController.getStats);

module.exports = router;
