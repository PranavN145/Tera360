export type UserRole = 'citizen' | 'driver' | 'field_officer' | 'officer' | 'admin';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  emailVerified: boolean;
  isActive: boolean;
  department?: string;
  assignedArea?: string;
  phone?: string;
  language?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}


