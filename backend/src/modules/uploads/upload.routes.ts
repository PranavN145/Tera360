import { Router } from 'express';
import express from 'express';
import rateLimit from 'express-rate-limit';
import { uploadController } from './upload.controller';
import { uploadGuard, MAX_FILE_SIZE } from '../../middleware/uploadGuard';
import { optionalAuth } from '../../middleware/requireAuth';

const router = Router();

// Rate limiter for upload endpoint: 30 uploads per 15 minutes per IP
const uploadRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many uploads requested. Please try again later.',
    },
  },
});

router.use(uploadRateLimiter);
router.use(optionalAuth);

// Allow raw buffer uploads up to 5MB for image MIME types
router.use(
  express.raw({
    type: ['image/jpeg', 'image/png', 'image/webp', 'application/octet-stream'],
    limit: `${MAX_FILE_SIZE}b`,
  })
);

// Allow json base64 payloads up to 7MB (to account for base64 encoding expansion)
router.use(
  express.json({
    limit: '7mb',
  })
);

// POST /api/v1/uploads
router.post('/', uploadGuard, uploadController.uploadFile);

// POST /api/v1/uploads/signed-url
router.post('/signed-url', uploadController.getSignedUrl);

export default router;

