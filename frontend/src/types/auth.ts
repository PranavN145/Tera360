export type UserRole = 'citizen' | 'driver' | 'field_officer' | 'officer' | 'admin';

export interface FamilyContact {
  _id?: string;
  id?: string;
  name: string;
  phone: string;
  relationship?: string;
}

export interface UserVillage {
  state?: string;
  district?: string;
  villageName?: string;
}

export interface AlertPreferences {
  ivrs: boolean;
  sms: boolean;
  app: boolean;
}

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
  village?: UserVillage;
  familyContacts?: FamilyContact[];
  alertPreferences?: AlertPreferences;
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
}

export interface RegisterSuccessData {
  user: User;
  message: string;
}

export interface RefreshSuccessData {
  accessToken: string;
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
  village?: UserVillage;
  familyContacts?: FamilyContact[];
  alertPreferences?: AlertPreferences;
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
    village?: UserVillage | null;
    familyContacts?: FamilyContact[];
    alertPreferences?: AlertPreferences;
    createdAt: string;
    updatedAt: string;
  };
  reports: Array<Record<string, unknown>>;
}
