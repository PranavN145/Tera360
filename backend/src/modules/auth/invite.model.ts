import mongoose, { Document, Schema, Model } from 'mongoose';
import { UserRole } from '../../types/express';

export interface IInvite extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  role: Extract<UserRole, 'officer' | 'field_officer' | 'admin'>;
  tokenHash: string;
  invitedBy?: mongoose.Types.ObjectId;
  department?: string;
  assignedArea?: string;
  expiresAt: Date;
  usedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const InviteSchema = new Schema<IInvite>(
  {
    email: {
      type: String,
      required: [true, 'Invitee email is required'],
      lowercase: true,
      trim: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['officer', 'field_officer', 'admin'],
      required: [true, 'Staff role is required for invitation'],
    },
    tokenHash: {
      type: String,
      required: [true, 'Invite token hash is required'],
      index: true,
    },
    invitedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    department: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    assignedArea: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 }, // MongoDB TTL auto-cleanup
    },
    usedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to quickly find valid, unused invites by token hash
InviteSchema.index({ tokenHash: 1, usedAt: 1, expiresAt: 1 });

export const Invite: Model<IInvite> =
  mongoose.models.Invite || mongoose.model<IInvite>('Invite', InviteSchema);

