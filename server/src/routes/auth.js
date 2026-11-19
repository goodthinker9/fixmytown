// Auth routes (/api/auth). Rate-limited to blunt brute-force attempts.
const express = require('express');
const rateLimit = require('express-rate-limit');
const z = require('zod');

const authController = require('../controllers/authController');
const authRequired = require('../middleware/authRequired');
const validate = require('../middleware/validate');

const router = express.Router();

// --- Validation schemas (kept here because they belong to these routes) ---
const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50),
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters').max(72),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email'),
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

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.get('/me', authRequired, authController.me);

module.exports = router;
