import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { reportController } from './report.controller';
import { validate } from '../../middleware/validate';
import { createPublicReportSchema } from './report.schema';
import { requireAuth } from '../../middleware/requireAuth';
import { roleGuard } from '../../middleware/roleGuard';

const router = Router();

// Strict rate limiter for public danger reports (PRD §13.1, §14.4)
// Prevents automated spam and distributed denial-of-service
export const publicReportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Max 10 submissions per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many hazard reports submitted from this network. Please wait before submitting again.',
    },
  },
});

// GET /api/v1/reports (Officers & Admins operational list)
router.get(
  '/',
  requireAuth,
  roleGuard('officer', 'admin', 'field_officer'),
  reportController.listReports
);

// POST /api/v1/reports/public
router.post(
  '/public',
  publicReportLimiter,
  validate({ body: createPublicReportSchema }),
  reportController.submitPublicReport
);

export default router;

