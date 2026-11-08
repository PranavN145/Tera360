import mongoose, { Document, Schema, Model } from 'mongoose';
import bcrypt from 'bcryptjs';
import { UserRole } from '../../types/express';

export type SessionStatus = 'active' | 'rotated' | 'revoked';
export type RevocationReason =
  | 'password_change'
  | 'user_revoked'
  | 'logout'
  | 'account_deletion'
  | 'token_reuse'
  | 'reset_password';

export interface IRefreshTokenSession {
  _id?: mongoose.Types.ObjectId;
  hash: string;
  status: SessionStatus;
  createdAt: Date;
  expiresAt: Date;
  userAgent?: string;
  ip?: string;
  revokedAt?: Date;
  revocationReason?: RevocationReason;
  replacedByTokenHash?: string;
}

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  phone?: string;
  language: string;
  emailVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationExpiresAt?: Date;
  passwordResetToken?: string;
  passwordResetExpiresAt?: Date;
  isActive: boolean;
  failedLogins: number;
  lockedUntil?: Date;
  refreshTokens: IRefreshTokenSession[];
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(plain: string): Promise<boolean>;
  isLocked(): boolean;
}

const RefreshTokenSchema = new Schema<IRefreshTokenSession>(
  {
    hash: { type: String, required: true },
    status: {
      type: String,
      enum: ['active', 'rotated', 'revoked'],
      default: 'active',
      index: true,
    },
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
    userAgent: { type: String },
    ip: { type: String },
    revokedAt: { type: Date },
    revocationReason: {
      type: String,
      enum: [
        'password_change',
        'user_revoked',
        'logout',
        'account_deletion',
        'token_reuse',
        'reset_password',
      ],
    },
    replacedByTokenHash: { type: String },
  },
  { _id: true }
);

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false, // Do not expose passwordHash by default
    },
    role: {
      type: String,
      enum: ['citizen', 'driver', 'field_officer', 'officer', 'admin'],
      default: 'citizen',
      index: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    language: {
      type: String,
      default: 'en',
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: {
      type: String,
      select: false,
    },
    emailVerificationExpiresAt: {
      type: Date,
      select: false,
    },
    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetExpiresAt: {
      type: Date,
      select: false,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    failedLogins: {
      type: Number,
      default: 0,
    },
    lockedUntil: {
      type: Date,
    },
    refreshTokens: {
      type: [RefreshTokenSchema],
      select: false,
      default: [],
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Method to verify password
UserSchema.methods.comparePassword = async function (plain: string): Promise<boolean> {
  return bcrypt.compare(plain, this.passwordHash);
};

// Method to check if account is locked
UserSchema.methods.isLocked = function (): boolean {
  return !!(this.lockedUntil && this.lockedUntil.getTime() > Date.now());
};

// Transform to remove sensitive internal fields on toJSON()
UserSchema.set('toJSON', {
  transform: (_doc, ret: Record<string, any>) => {
    delete ret.passwordHash;
    delete ret.refreshTokens;
    delete ret.emailVerificationToken;
    delete ret.emailVerificationExpiresAt;
    delete ret.passwordResetToken;
    delete ret.passwordResetExpiresAt;
    delete ret.__v;
    return ret;
  },
});

export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
