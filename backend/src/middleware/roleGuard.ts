import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../types/express';
import { AuthError } from './requireAuth';

export class ForbiddenError extends Error {
  statusCode = 403;
  code = 'FORBIDDEN';

  constructor(message = 'Access forbidden: Insufficient role permissions') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

/**
 * Role-based access control middleware
 */
export function roleGuard(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AuthError('Authentication required prior to role verification', 'UNAUTHORIZED', 401));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ForbiddenError(
          `Access forbidden: Role '${req.user.role}' lacks sufficient privileges for this endpoint`
        )
      );
    }

    next();
  };
}

