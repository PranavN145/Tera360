import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';

export interface StandardErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    fields?: Record<string, string[]>;
  };
}

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Determine HTTP status code
  const statusCode = err.statusCode || (err.status && typeof err.status === 'number' ? err.status : 500);

  // Default error shape
  const response: StandardErrorResponse = {
    success: false,
    error: {
      code: err.code || (statusCode === 500 ? 'INTERNAL_SERVER_ERROR' : 'ERROR'),
      message: err.message || 'An unexpected error occurred',
    },
  };

  // Attach validation fields if present
  if (err.fields) {
    response.error.fields = err.fields;
  }

  // Handle MongoDB 11000 Duplicate Key errors
  if (err.code === 11000) {
    res.status(409).json({
      success: false,
      error: {
        code: 'CONFLICT',
        message: 'A record with this identifier already exists.',
      },
    });
    return;
  }

  // Hide internal server error details in production while preserving server-side operational logs
  if (statusCode === 500) {
    console.error('Unhandled internal server error:', err);
    if (env.NODE_ENV === 'production') {
      response.error.message = 'An unexpected internal server error occurred.';
    }
  }

  res.status(statusCode).json(response);
}

