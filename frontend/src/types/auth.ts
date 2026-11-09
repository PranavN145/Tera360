export type UserRole = 'citizen' | 'driver' | 'field_officer' | 'officer' | 'admin';

export interface User {
  _id: string;
  id?: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  language?: string;
  emailVerified?: boolean;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiError {
  code: string;
  message: string;
  fields?: Record<string, string[]>;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export interface AuthSuccessData {
  user: User;
  accessToken: string;
  refreshToken?: string;
}

export interface RegisterSuccessData {
  user: User;
  message: string;
}

export interface RefreshSuccessData {
  accessToken: string;
  refreshToken?: string;
}

export interface UserProfileSuccessData {
  user: User;
}

export interface MessageSuccessData {
  message: string;
}

export interface UserSession {
  id: string;
  createdAt: string;
  expiresAt: string;
  userAgent: string;
  ip: string;
  isCurrent?: boolean;
}

export interface SessionsSuccessData {
  sessions: UserSession[];
}

export interface UpdateProfilePayload {
  name?: string;
  phone?: string;
  language?: 'en' | 'as' | 'bn' | 'hi' | 'mni' | 'lus';
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
  confirmPassword?: string;
}

export interface DeleteAccountPayload {
  confirmationText: string;
}

export interface UserExportData {
  exportedAt: string;
  account: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    phone: string | null;
    language: string;
    emailVerified: boolean;
    createdAt: string;
    updatedAt: string;
  };
  reports: Array<Record<string, unknown>>;
}
