import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { detectMagicBytes, stripJpegExif, UploadError, MAX_FILE_SIZE } from '../../middleware/uploadGuard';
import { env } from '../../config/env';

const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

export class UploadController {
  /**
   * POST /api/v1/uploads
   * Accepts image upload (binary or base64 JSON payload), validates magic bytes,
   * strips EXIF metadata from JPEGs, and stores safely.
   */
  async uploadFile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      let buffer: Buffer | null = null;
      let originalName = 'upload';

      if (Buffer.isBuffer(req.body)) {
        buffer = req.body;
      } else if (req.body && typeof req.body.base64 === 'string') {
        const base64Data = req.body.base64.replace(/^data:image\/\w+;base64,/, '');
        buffer = Buffer.from(base64Data, 'base64');
        if (req.body.name) originalName = String(req.body.name);
      } else if (req.body && typeof req.body.dataUrl === 'string') {
        const base64Data = req.body.dataUrl.replace(/^data:image\/\w+;base64,/, '');
        buffer = Buffer.from(base64Data, 'base64');
      }

      if (!buffer || buffer.length === 0) {
        throw new UploadError('No file data provided in request body.', 'INVALID_FILE_PAYLOAD', 400);
      }

      if (buffer.length > MAX_FILE_SIZE) {
        throw new UploadError('File size exceeds maximum allowed limit of 5 MB', 'PAYLOAD_TOO_LARGE', 413);
      }

      // Magic byte verification
      const detectedMime = detectMagicBytes(buffer);
      if (!detectedMime) {
        throw new UploadError(
          'File signature validation failed. Only legitimate JPEG, PNG, and WebP images are permitted.',
          'UNSUPPORTED_MEDIA',
          422
        );
      }

      // Strip EXIF metadata from JPEGs
      let finalBuffer = buffer;
      if (detectedMime === 'image/jpeg') {
        finalBuffer = stripJpegExif(buffer);
      }

      // Generate secure unique filename
      const extension = detectedMime === 'image/jpeg' ? 'jpg' : detectedMime === 'image/png' ? 'png' : 'webp';
      const fileId = crypto.randomBytes(16).toString('hex');
      const filename = `${fileId}.${extension}`;
      const filePath = path.join(UPLOADS_DIR, filename);

      fs.writeFileSync(filePath, finalBuffer);

      const host = req.get('host') || 'localhost:5000';
      const protocol = req.protocol || 'http';
      const publicUrl = `${protocol}://${host}/uploads/${filename}`;

      res.status(201).json({
        success: true,
        data: {
          fileId,
          filename,
          originalName,
          mimeType: detectedMime,
          size: finalBuffer.length,
          url: publicUrl,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/uploads/signed-url
   * Generates a pre-signed upload URL for direct cloud/storage upload.
   */
  async getSignedUrl(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { filename, contentType: _contentType } = req.body;
      const fileId = crypto.randomBytes(16).toString('hex');
      const ext = path.extname(filename || '.jpg') || '.jpg';
      const uploadKey = `photos/${fileId}${ext}`;
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

      // HMAC signature using ENCRYPTION_KEY or JWT_ACCESS_SECRET
      const hmac = crypto.createHmac('sha256', env.ENCRYPTION_KEY || 'default-secret');
      hmac.update(`${uploadKey}:${expiresAt.toISOString()}`);
      const signature = hmac.digest('hex');

      const host = req.get('host') || 'localhost:5000';
      const protocol = req.protocol || 'http';
      const uploadUrl = `${protocol}://${host}/api/v1/uploads?token=${signature}&key=${uploadKey}`;
      const finalPublicUrl = `${protocol}://${host}/uploads/${fileId}${ext}`;

      res.status(200).json({
        success: true,
        data: {
          uploadUrl,
          uploadKey,
          publicUrl: finalPublicUrl,
          expiresAt: expiresAt.toISOString(),
          maxBytes: MAX_FILE_SIZE,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const uploadController = new UploadController();
