import mongoose, { Document, Schema, Model } from 'mongoose';

export type RoadStatus = 'open' | 'caution' | 'partial' | 'blocked';
export type RoadRiskLevel = 'Low' | 'Moderate' | 'High' | 'Critical';

export interface IRoadGeometry {
  type: 'Point' | 'LineString';
  coordinates: any; // [lng, lat] for Point or [[lng, lat], ...] for LineString
}

export interface IRoad extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  code: string;
  state: string;
  stretch: string;
  geometry?: IRoadGeometry;
  coordinatesText?: string;
  mapCoordinates?: {
    x: number; // Percentage coordinate (0-100) for visual map positioning
    y: number; // Percentage coordinate (0-100) for visual map positioning
  };
  status: RoadStatus;
  riskLevel: RoadRiskLevel;
  statusReason?: string;
  isMajorNH: boolean;
  lastUpdated: Date;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const RoadGeometrySchema = new Schema(
  {
    type: {
      type: String,
      enum: ['Point', 'LineString'],
      default: 'Point',
      required: true,
    },
    coordinates: {
      type: Schema.Types.Mixed,
      required: true,
    },
  },
  { _id: false }
);

const RoadSchema = new Schema<IRoad>(
  {
    name: {
      type: String,
      required: [true, 'Road or corridor name is required'],
      trim: true,
      maxlength: [200, 'Name cannot exceed 200 characters'],
    },
    code: {
      type: String,
      required: [true, 'Road code (e.g. NH-29) is required'],
      trim: true,
      uppercase: true,
      maxlength: [50, 'Code cannot exceed 50 characters'],
      index: true,
    },
    state: {
      type: String,
      required: [true, 'State is required'],
      trim: true,
      index: true,
    },
    stretch: {
      type: String,
      required: [true, 'Corridor stretch/mile marker is required'],
      trim: true,
      maxlength: [250, 'Stretch cannot exceed 250 characters'],
    },
    geometry: {
      type: RoadGeometrySchema,
      required: false,
    },
    coordinatesText: {
      type: String,
      trim: true,
    },
    mapCoordinates: {
      x: { type: Number, min: 0, max: 100 },
      y: { type: Number, min: 0, max: 100 },
    },
    status: {
      type: String,
      enum: {
        values: ['open', 'caution', 'partial', 'blocked'],
        message: 'Status must be open, caution, partial, or blocked',
      },
      default: 'open',
      index: true,
    },
    riskLevel: {
      type: String,
      enum: {
        values: ['Low', 'Moderate', 'High', 'Critical'],
        message: 'Risk level must be Low, Moderate, High, or Critical',
      },
      default: 'Low',
      index: true,
    },
    statusReason: {
      type: String,
      trim: true,
      maxlength: [500, 'Status reason cannot exceed 500 characters'],
    },
    isMajorNH: {
      type: Boolean,
      default: true,
      index: true,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
      index: true,
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

// Indexes
RoadSchema.index({ geometry: '2dsphere' }, { sparse: true });
RoadSchema.index({ state: 1, status: 1 });
RoadSchema.index({ isMajorNH: 1, riskLevel: 1 });

RoadSchema.set('toJSON', {
  transform: (_doc, ret: Record<string, any>) => {
    delete ret.__v;
    return ret;
  },
});

export const Road: Model<IRoad> =
  mongoose.models.Road || mongoose.model<IRoad>('Road', RoadSchema, 'roads');

