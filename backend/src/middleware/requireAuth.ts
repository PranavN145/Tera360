import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { User } from '../modules/users/user.model';

export class AuthError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, code = 'UNAUTHORIZED', statusCode = 401) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AuthError('Authentication required. Missing Bearer token.', 'UNAUTHORIZED', 401));
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = verifyAccessToken(token);

    const user = await User.findById(payload.sub).select('+isActive +isDeleted');
    if (!user || !user.isActive || user.isDeleted) {
      return next(new AuthError('User account not found or has been deactivated', 'UNAUTHORIZED', 401));
    }

    req.user = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      name: user.name,
      emailVerified: user.emailVerified,
      isActive: user.isActive,
      department: user.department,
      assignedArea: user.assignedArea,
      phone: user.phone,
      language: user.language,
    };

    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return next(new AuthError('Access token has expired', 'TOKEN_EXPIRED', 401));
    }
    return next(new AuthError('Invalid or corrupted access token', 'TOKEN_INVALID', 401));
  }
}

export async function optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = verifyAccessToken(token);

    const user = await User.findById(payload.sub).select('+isActive +isDeleted');
    if (user && user.isActive && !user.isDeleted) {
      req.user = {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
        name: user.name,
        emailVerified: user.emailVerified,
        isActive: user.isActive,
        department: user.department,
        assignedArea: user.assignedArea,
        phone: user.phone,
        language: user.language,
      };
    }
  } catch {
    // Token invalid or expired — proceed as unauthenticated without error
  }
  next();
}

