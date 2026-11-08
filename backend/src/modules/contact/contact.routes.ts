import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { contactController } from './contact.controller';
import { validate } from '../../middleware/validate';
import { createContactSchema } from './contact.schema';

const router = Router();

// Rate limiter for contact inquiries (PRD §13.1, §14.4)
// Protects against unsolicited messaging abuse and flooding
export const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Max 10 messages per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many contact inquiries from this network. Please wait before submitting again.',
    },
  },
});

// POST /api/v1/contact
router.post(
  '/',
  contactLimiter,
  validate({ body: createContactSchema }),
  contactController.submitContact
);

export default router;

