import mongoose, { Document, Schema, Model } from 'mongoose';

export type DeliveryChannel = 'sms' | 'ivrs' | 'push' | 'app';
export type DeliveryStatus = 'queued' | 'delivered' | 'failed';

export interface IAlertDelivery extends Document {
  _id: mongoose.Types.ObjectId;
  alertId: mongoose.Types.ObjectId;
  recipientId?: mongoose.Types.ObjectId;
  recipientContact: string; // Phone number, email, or device identifier
  recipientRole?: string;
  channel: DeliveryChannel;
  status: DeliveryStatus;
  sentAt?: Date;
  deliveredAt?: Date;
  failureReason?: string;
  retryCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const AlertDeliverySchema = new Schema<IAlertDelivery>(
  {
    alertId: {
      type: Schema.Types.ObjectId,
      ref: 'Alert',
      required: true,
      index: true,
    },
    recipientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    recipientContact: {
      type: String,
      required: true,
      trim: true,
    },
    recipientRole: {
      type: String,
      trim: true,
    },
    channel: {
      type: String,
      enum: ['sms', 'ivrs', 'push', 'app'],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['queued', 'delivered', 'failed'],
      default: 'queued',
      index: true,
    },
    sentAt: Date,
    deliveredAt: Date,
    failureReason: String,
    retryCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

AlertDeliverySchema.index({ alertId: 1, status: 1 });

export const AlertDelivery: Model<IAlertDelivery> =
  mongoose.models.AlertDelivery ||
  mongoose.model<IAlertDelivery>('AlertDelivery', AlertDeliverySchema, 'alert_deliveries');

