import mongoose, { Document, Schema, Model } from 'mongoose';

export type AlertSeverity = 'Critical' | 'Warning' | 'Watch';
export type AlertStatus = 'draft' | 'published' | 'cancelled';

export interface IAlertCoordinates {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

export interface IAlert extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  severity: AlertSeverity;
  state: string;
  corridor: string;
  location?: string;
  description: string;
  coordinates?: IAlertCoordinates;
  coordinatesText?: string;
  rainfall24h?: string;
  saturation?: string;
  trafficStatus?: string;
  advisory: string;
  status: AlertStatus;
  publishedAt?: Date;
  createdBy?: mongoose.Types.ObjectId;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PointSchema = new Schema<IAlertCoordinates>(
  {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
      required: true,
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
      validate: {
        validator: function (val: number[]) {
          return (
            Array.isArray(val) &&
            val.length === 2 &&
            val[0] >= -180 &&
            val[0] <= 180 &&
            val[1] >= -90 &&
            val[1] <= 90
          );
        },
        message: 'Coordinates must be valid [longitude, latitude] within global bounds.',
      },
    },
  },
  { _id: false }
);

const AlertSchema = new Schema<IAlert>(
  {
    title: {
      type: String,
      required: [true, 'Alert title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    severity: {
      type: String,
      enum: {
        values: ['Critical', 'Warning', 'Watch'],
        message: 'Severity must be Critical, Warning, or Watch',
      },
      required: [true, 'Severity is required'],
      index: true,
    },
    state: {
      type: String,
      required: [true, 'State is required'],
      trim: true,
      index: true,
    },
    corridor: {
      type: String,
      required: [true, 'Corridor reference is required'],
      trim: true,
      maxlength: [200, 'Corridor cannot exceed 200 characters'],
      index: true,
    },
    location: {
      type: String,
      trim: true,
      maxlength: [200, 'Location cannot exceed 200 characters'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    coordinates: {
      type: PointSchema,
      required: false,
    },
    coordinatesText: {
      type: String,
      trim: true,
    },
    rainfall24h: {
      type: String,
      trim: true,
    },
    saturation: {
      type: String,
      trim: true,
    },
    trafficStatus: {
      type: String,
      trim: true,
    },
    advisory: {
      type: String,
      required: [true, 'Advisory instructions are required'],
      trim: true,
      maxlength: [1000, 'Advisory cannot exceed 1000 characters'],
    },
    status: {
      type: String,
      enum: {
        values: ['draft', 'published', 'cancelled'],
        message: 'Status must be draft, published, or cancelled',
      },
      default: 'draft',
      index: true,
    },
    publishedAt: {
      type: Date,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
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

// Geospatial 2dsphere index for location-based queries
AlertSchema.index({ coordinates: '2dsphere' }, { sparse: true });

// Compound indexes for public filter queries
AlertSchema.index({ status: 1, severity: 1, publishedAt: -1 });
AlertSchema.index({ state: 1, status: 1 });

// Clean response output
AlertSchema.set('toJSON', {
  transform: (_doc, ret: Record<string, any>) => {
    delete ret.__v;
    return ret;
  },
});

export const Alert: Model<IAlert> =
  mongoose.models.Alert || mongoose.model<IAlert>('Alert', AlertSchema, 'alerts');

