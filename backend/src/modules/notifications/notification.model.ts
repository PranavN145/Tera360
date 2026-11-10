import mongoose, { Document, Schema, Model } from 'mongoose';

export type NotificationType = 'alert' | 'task' | 'report' | 'checkin' | 'system';

export interface INotification extends Document {
  _id: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId; // null for broadcast
  targetRole?: string;
  targetVillage?: string;
  title: string;
  message: string;
  type: NotificationType;
  entityId?: string;
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    targetRole: {
      type: String,
      trim: true,
      index: true,
    },
    targetVillage: {
      type: String,
      trim: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['alert', 'task', 'report', 'checkin', 'system'],
      default: 'system',
      index: true,
    },
    entityId: String,
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: Date,
  },
  {
    timestamps: true,
  }
);

NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

export const Notification: Model<INotification> =
  mongoose.models.Notification ||
  mongoose.model<INotification>('Notification', NotificationSchema, 'notifications');

