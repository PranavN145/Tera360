import mongoose, { Document, Schema, Model } from 'mongoose';

export type ReportSeverity = 'Critical' | 'Warning' | 'Watch';
export type ReportStatus = 'submitted' | 'under_review' | 'verified' | 'rejected';
export type ReportSource = 'public' | 'citizen' | 'field_officer';

export interface IReportLocationPoint {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

export interface IReport extends Document {
  _id: mongoose.Types.ObjectId;
  reportId: string;
  state: string;
  location: string;
  hazardType: string;
  severity: ReportSeverity;
  description: string;
  reporterName?: string;
  reporterPhone?: string;
  photoUrl?: string;
  status: ReportStatus;
  source: ReportSource;
  reporterId?: mongoose.Types.ObjectId;
  coordinates?: IReportLocationPoint;
  ipAddress?: string;
  userAgent?: string;
  verifiedBy?: mongoose.Types.ObjectId;
  verifiedAt?: Date;
  verificationNotes?: string;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ReportPointSchema = new Schema<IReportLocationPoint>(
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

const ReportSchema = new Schema<IReport>(
  {
    reportId: {
      type: String,
      required: [true, 'Unique report identifier is required'],
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    state: {
      type: String,
      required: [true, 'State is required'],
      trim: true,
      index: true,
    },
    location: {
      type: String,
      required: [true, 'Location details or corridor stretch are required'],
      trim: true,
      maxlength: [300, 'Location cannot exceed 300 characters'],
    },
    hazardType: {
      type: String,
      required: [true, 'Hazard type is required'],
      trim: true,
      index: true,
    },
    severity: {
      type: String,
      enum: {
        values: ['Critical', 'Warning', 'Watch'],
        message: 'Severity must be Critical, Warning, or Watch',
      },
      default: 'Warning',
      index: true,
    },
    description: {
      type: String,
      required: [true, 'Incident description is required'],
      trim: true,
      maxlength: [3000, 'Description cannot exceed 3000 characters'],
    },
    reporterName: {
      type: String,
      trim: true,
      maxlength: [100, 'Reporter name cannot exceed 100 characters'],
    },
    reporterPhone: {
      type: String,
      trim: true,
      maxlength: [20, 'Phone number cannot exceed 20 characters'],
    },
    photoUrl: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: {
        values: ['submitted', 'under_review', 'verified', 'rejected'],
        message: 'Status must be submitted, under_review, verified, or rejected',
      },
      default: 'submitted',
      index: true,
    },
    source: {
      type: String,
      enum: {
        values: ['public', 'citizen', 'field_officer'],
        message: 'Source must be public, citizen, or field_officer',
      },
      default: 'public',
      index: true,
    },
    reporterId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      index: true,
    },
    coordinates: {
      type: ReportPointSchema,
      required: false,
    },
    ipAddress: {
      type: String,
      trim: true,
    },
    userAgent: {
      type: String,
      trim: true,
    },
    verifiedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    verifiedAt: {
      type: Date,
    },
    verificationNotes: {
      type: String,
      trim: true,
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
ReportSchema.index({ coordinates: '2dsphere' }, { sparse: true });
ReportSchema.index({ status: 1, createdAt: -1 });
ReportSchema.index({ state: 1, hazardType: 1 });

ReportSchema.set('toJSON', {
  transform: (_doc, ret: Record<string, any>) => {
    delete ret.__v;
    return ret;
  },
});

export const Report: Model<IReport> =
  mongoose.models.Report || mongoose.model<IReport>('Report', ReportSchema, 'reports');

