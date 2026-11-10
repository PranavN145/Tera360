import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { reportController } from './report.controller';
import { validate } from '../../middleware/validate';
import {
  createPublicReportSchema,
  createAuthenticatedReportSchema,
  triageReportSchema,
  assignTaskSchema,
  getReportsQuerySchema,
} from './report.schema';
import { requireAuth, optionalAuth } from '../../middleware/requireAuth';
import { roleGuard } from '../../middleware/roleGuard';

const router = Router();

// Strict rate limiter for public danger reports (PRD §13.1, §14.4)
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

// GET /api/v1/reports/my and /api/v1/reports/mine (Authenticated Citizen's own submitted reports)
router.get('/my', requireAuth, reportController.listMyReports);
router.get('/mine', requireAuth, reportController.listMyReports);

// GET /api/v1/reports (Officers & Admins operational list)
router.get(
  '/',
  requireAuth,
  roleGuard('officer', 'admin', 'field_officer'),
  validate({ query: getReportsQuerySchema }),
  reportController.listReports
);

// POST /api/v1/reports (Authenticated Citizen report without CAPTCHA - PRD §14.4)
router.post(
  '/',
  requireAuth,
  validate({ body: createAuthenticatedReportSchema }),
  reportController.submitAuthenticatedReport
);

// POST /api/v1/reports/public (Public or Unauthenticated Citizen report with CAPTCHA)
router.post(
  '/public',
  publicReportLimiter,
  optionalAuth,
  validate({ body: createPublicReportSchema }),
  reportController.submitPublicReport
);

// GET /api/v1/reports/:id
router.get(
  '/:id',
  requireAuth,
  roleGuard('officer', 'admin', 'field_officer'),
  reportController.getReportById
);

// PATCH /api/v1/reports/:id/status (Triage report)
router.patch(
  '/:id/status',
  requireAuth,
  roleGuard('officer', 'admin', 'field_officer'),
  validate({ body: triageReportSchema }),
  reportController.triageReport
);

// POST /api/v1/reports/tasks (Assign inspection task to field officer)
router.post(
  '/tasks',
  requireAuth,
  roleGuard('officer', 'admin'),
  validate({ body: assignTaskSchema }),
  reportController.assignTask
);

export default router;

