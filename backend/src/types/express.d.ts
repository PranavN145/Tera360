export type UserRole = 'citizen' | 'driver' | 'field_officer' | 'officer' | 'admin';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  emailVerified: boolean;
  isActive: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

