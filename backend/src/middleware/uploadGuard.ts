import { Request, Response, NextFunction } from 'express';

export class UploadError extends Error {
  statusCode = 400;
  code = 'UPLOAD_ERROR';
  constructor(message: string) {
    super(message);
    this.name = 'UploadError';
  }
}

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'audio/webm', 'audio/mp4'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

/**
 * Basic upload guard ensuring payload type and size constraints
 */
export function uploadGuard(req: Request, _res: Response, next: NextFunction): void {
  const contentLength = parseInt(req.headers['content-length'] || '0', 10);
  if (contentLength > MAX_FILE_SIZE) {
    return next(new UploadError(`Payload size exceeds maximum allowed limit of 5 MB`));
  }

  const contentType = req.headers['content-type'] || '';
  if (
    contentType &&
    !contentType.includes('multipart/form-data') &&
    !contentType.includes('application/json') &&
    !ALLOWED_MIME_TYPES.some((mime) => contentType.includes(mime))
  ) {
    return next(new UploadError(`Unsupported media content type: ${contentType}`));
  }

  next();
}

