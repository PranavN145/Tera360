import { Request, Response, NextFunction } from 'express';

export class UploadError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, code = 'UPLOAD_ERROR', statusCode = 400) {
    super(message);
    this.name = 'UploadError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB (PRD §13.9)
export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Validates buffer magic bytes against authorized image signatures.
 * JPEG: FF D8 FF
 * PNG: 89 50 4E 47 0D 0A 1A 0A
 * WEBP: 52 49 46 46 (RIFF) ... 57 45 42 50 (WEBP)
 */
export function detectMagicBytes(buffer: Buffer): 'image/jpeg' | 'image/png' | 'image/webp' | null {
  if (!buffer || buffer.length < 3) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'image/png';
  }

  // WEBP: RIFF at 0..3 and WEBP at 8..11
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return 'image/webp';
  }

  return null;
}

/**
 * Strips EXIF metadata (specifically APP1 segment 0xFFE1) from JPEG buffer
 * to eliminate GPS tracking leak before public storage/display (PRD §13.9).
 */
export function stripJpegExif(buffer: Buffer): Buffer {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    return buffer;
  }

  let offset = 2;
  const pieces: Buffer[] = [buffer.subarray(0, 2)]; // Keep SOI (FF D8)

  while (offset < buffer.length - 1) {
    if (buffer[offset] !== 0xff) {
      break;
    }

    const marker = buffer[offset + 1];

    // SOS (Start of Scan) or EOI (End of Image) - stop looking for APP markers
    if (marker === 0xda || marker === 0xd9) {
      pieces.push(buffer.subarray(offset));
      break;
    }

    // Read marker length (2 bytes, big-endian)
    if (offset + 4 > buffer.length) break;
    const length = buffer.readUInt16BE(offset + 2);

    // APP1 (EXIF) marker is 0xE1
    if (marker === 0xe1) {
      // Skip APP1 EXIF segment
      offset += 2 + length;
    } else {
      // Retain other segments
      pieces.push(buffer.subarray(offset, offset + 2 + length));
      offset += 2 + length;
    }
  }

  return Buffer.concat(pieces);
}

/**
 * Express middleware for basic header validation of upload requests
 */
export function uploadGuard(req: Request, _res: Response, next: NextFunction): void {
  const contentLength = parseInt(req.headers['content-length'] || '0', 10);
  if (contentLength > MAX_FILE_SIZE) {
    return next(
      new UploadError(
        `Payload size (${Math.round(contentLength / 1024 / 1024)}MB) exceeds maximum allowed limit of 5 MB`,
        'PAYLOAD_TOO_LARGE',
        413
      )
    );
  }

  const contentType = req.headers['content-type'] || '';
  if (
    contentType &&
    !contentType.includes('multipart/form-data') &&
    !contentType.includes('application/json') &&
    !contentType.includes('application/octet-stream') &&
    !ALLOWED_MIME_TYPES.some((mime) => contentType.includes(mime))
  ) {
    return next(
      new UploadError(
        `Unsupported media type '${contentType}'. Only JPEG, PNG, and WebP images are allowed.`,
        'UNSUPPORTED_MEDIA',
        422
      )
    );
  }

  next();
}
