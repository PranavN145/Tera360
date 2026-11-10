/**
 * Terra360 Field Officer Portal - Mongoose Schemas & Models
 * Schema definitions for tasks, road status sync logs, and alert acknowledgments.
 */

import mongoose, { Schema, Document, Model } from 'mongoose';
import {
  TaskRiskLevel,
  TaskStatus,
  RoadCondition,
} from './fieldOfficer.mockData';

// ── Field Officer Task Document ─────────────────────────────────────────────
export interface IFieldOfficerTask extends Document {
  taskId: string;
  sector: string;
  location: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
    chainageName: string;
    landmark?: string;
  };
  riskLevel: TaskRiskLevel;
  reason: string;
  deadline: Date;
  status: TaskStatus;
  assignedBy: string;
  assignedTo?: mongoose.Types.ObjectId;
  assignedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  completionNotes?: string;
  escalatedAt?: Date;
  escalationReason?: string;
  escalationPriority?: string;
  createdAt: Date;
  updatedAt: Date;
}

const FieldOfficerTaskSchema = new Schema<IFieldOfficerTask>(
  {
    taskId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    sector: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        required: true,
      },
      chainageName: {
        type: String,
        required: true,
        trim: true,
      },
      landmark: {
        type: String,
        trim: true,
      },
    },
    riskLevel: {
      type: String,
      enum: ['Low', 'Moderate', 'High', 'Critical'],
      required: true,
      index: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    deadline: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['Assigned', 'In_Progress', 'Completed', 'Escalated'],
      default: 'Assigned',
      index: true,
    },
    assignedBy: {
      type: String,
      required: true,
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    assignedAt: {
      type: Date,
      default: Date.now,
    },
    startedAt: Date,
    completedAt: Date,
    completionNotes: String,
    escalatedAt: Date,
    escalationReason: String,
    escalationPriority: String,
  },
  {
    timestamps: true,
  }
);

FieldOfficerTaskSchema.index({ 'location.coordinates': '2dsphere' });

// ── Road Condition Update Log ───────────────────────────────────────────────
export interface IRoadStatusUpdate extends Document {
  roadSegmentId: string;
  stretchName: string;
  condition: RoadCondition;
  reason: string;
  photoUrl?: string;
  updatedBy: string;
  officerId?: mongoose.Types.ObjectId;
  sector: string;
  timestamp: Date;
  dashboardSyncStatus: string;
  createdAt: Date;
  updatedAt: Date;
}

const RoadStatusUpdateSchema = new Schema<IRoadStatusUpdate>(
  {
    roadSegmentId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    stretchName: {
      type: String,
      required: true,
      trim: true,
    },
    condition: {
      type: String,
      enum: ['Open', 'Caution', 'Partially Blocked', 'Blocked'],
      required: true,
      index: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    photoUrl: String,
    updatedBy: {
      type: String,
      required: true,
    },
    officerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    sector: {
      type: String,
      required: true,
      index: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    dashboardSyncStatus: {
      type: String,
      default: 'SYNCED',
    },
  },
  {
    timestamps: true,
  }
);

// ── Alert Acknowledgment Log ────────────────────────────────────────────────
export interface IAlertAcknowledgment extends Document {
  alertId: string;
  officerId: string;
  acknowledgedAt: Date;
  targetSector: string;
}

const AlertAcknowledgmentSchema = new Schema<IAlertAcknowledgment>(
  {
    alertId: { type: String, required: true, index: true },
    officerId: { type: String, required: true },
    acknowledgedAt: { type: Date, default: Date.now },
    targetSector: { type: String, required: true },
  },
  { timestamps: true }
);

export const FieldOfficerTaskModel: Model<IFieldOfficerTask> =
  mongoose.models.FieldOfficerTask ||
  mongoose.model<IFieldOfficerTask>('FieldOfficerTask', FieldOfficerTaskSchema);

export const RoadStatusUpdateModel: Model<IRoadStatusUpdate> =
  mongoose.models.RoadStatusUpdate ||
  mongoose.model<IRoadStatusUpdate>('RoadStatusUpdate', RoadStatusUpdateSchema);

export const AlertAcknowledgmentModel: Model<IAlertAcknowledgment> =
  mongoose.models.AlertAcknowledgment ||
  mongoose.model<IAlertAcknowledgment>('AlertAcknowledgment', AlertAcknowledgmentSchema);

