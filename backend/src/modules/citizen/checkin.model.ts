import mongoose, { Document, Schema, Model } from 'mongoose';

export type CheckInStatus = 'safe' | 'need_help';

export interface ICheckInCoordinates {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

export interface INotifiedContact {
  name: string;
  phone?: string;
  email?: string;
  channel: 'sms' | 'email' | 'push';
  deliveryStatus: 'sent' | 'pending' | 'failed';
}

export interface ICheckIn extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  status: CheckInStatus;
  message?: string;
  locationName?: string;
  coordinates?: ICheckInCoordinates;
  notifiedContacts: INotifiedContact[];
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CheckInCoordinatesSchema = new Schema<ICheckInCoordinates>(
  {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
      required: true,
    },
    coordinates: {
      type: [Number],
      required: true,
    },
  },
  { _id: false }
);

const NotifiedContactSchema = new Schema<INotifiedContact>(
  {
    name: { type: String, required: true },
    phone: String,
    email: String,
    channel: {
      type: String,
      enum: ['sms', 'email', 'push'],
      default: 'sms',
    },
    deliveryStatus: {
      type: String,
      enum: ['sent', 'pending', 'failed'],
      default: 'sent',
    },
  },
  { _id: false }
);

const CheckInSchema = new Schema<ICheckIn>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['safe', 'need_help'],
      required: true,
      index: true,
    },
    message: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    locationName: {
      type: String,
      trim: true,
    },
    coordinates: CheckInCoordinatesSchema,
    notifiedContacts: [NotifiedContactSchema],
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

CheckInSchema.index({ userId: 1, timestamp: -1 });

export const CheckIn: Model<ICheckIn> =
  mongoose.models.CheckIn ||
  mongoose.model<ICheckIn>('CheckIn', CheckInSchema, 'checkins');

