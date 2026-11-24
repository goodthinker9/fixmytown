// Auth routes (/api/auth). Rate-limited to blunt brute-force attempts.
const express = require('express');
const rateLimit = require('express-rate-limit');
const z = require('zod');

const authController = require('../controllers/authController');
const authRequired = require('../middleware/authRequired');
const validate = require('../middleware/validate');
const { sanitizeBody } = require('../utils/sanitize');

const router = express.Router();

// --- Validation schemas ---
const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50),
  email: z.string().email('Invalid email').toLowerCase(), // normalise email
  password: z.string().min(6, 'Password must be at least 6 characters').max(72),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email').toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

// --- Rate limit: 20 auth requests per IP every 15 minutes ---
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many auth attempts. Please try again later.' },
});

router.use(authLimiter);

router.post(
  '/register',
  validate(registerSchema),
  sanitizeBody,
  authController.register
);
router.post('/login', validate(loginSchema), sanitizeBody, authController.login);
router.get('/me', authRequired, authController.me);

module.exports = router;
