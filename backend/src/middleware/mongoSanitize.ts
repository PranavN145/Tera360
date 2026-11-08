import { Request, Response, NextFunction } from 'express';

function sanitize(obj: any): any {
  if (obj && typeof obj === 'object') {
    if (Array.isArray(obj)) {
      return obj.map(sanitize);
    }
    const sanitized: Record<string, any> = {};
    for (const key of Object.keys(obj)) {
      if (!key.startsWith('$') && !key.includes('.')) {
        sanitized[key] = sanitize(obj[key]);
      }
    }
    return sanitized;
  }
  return obj;
}

/**
 * Strips MongoDB operator keys ($ prefix or . dots) from incoming payloads to prevent NoSQL injection
 */
export function mongoSanitize(req: Request, _res: Response, next: NextFunction): void {
  if (req.body) req.body = sanitize(req.body);
  if (req.params) req.params = sanitize(req.params);
  next();
}

