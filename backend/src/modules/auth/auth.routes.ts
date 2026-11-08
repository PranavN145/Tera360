import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authController } from './auth.controller';
import { validate } from '../../middleware/validate';
import {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from './auth.schema';

const router = Router();

// Strict rate limiter for authentication routes per PRD §13.1 & §15
const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 15, // Max 15 attempts per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many authentication attempts. Please try again in one minute.',
    },
  },
});

router.use(authLimiter);

// POST /api/v1/auth/register
router.post('/register', validate({ body: registerSchema }), authController.register);

// POST /api/v1/auth/login
router.post('/login', validate({ body: loginSchema }), authController.login);

// POST /api/v1/auth/refresh
router.post('/refresh', authController.refresh);

// POST /api/v1/auth/logout
router.post('/logout', authController.logout);

// POST /api/v1/auth/verify-email
router.post('/verify-email', validate({ body: verifyEmailSchema }), authController.verifyEmail);

// POST /api/v1/auth/forgot-password
router.post('/forgot-password', validate({ body: forgotPasswordSchema }), authController.forgotPassword);

// POST /api/v1/auth/reset-password
router.post('/reset-password', validate({ body: resetPasswordSchema }), authController.resetPassword);

export default router;

