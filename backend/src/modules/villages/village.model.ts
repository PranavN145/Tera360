import mongoose, { Document, Schema, Model } from 'mongoose';

export type VillageRiskLevel = 'Low' | 'Moderate' | 'High' | 'Critical';
export type EvacuationStatus = 'Normal' | 'Advisory' | 'Evacuate';

export interface IVillageCoordinates {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

export interface IVillageContact {
  name: string;
  phone: string;
  designation: string;
}

export interface IVillage extends Document {
  _id: mongoose.Types.ObjectId;
  villageName: string;
  state: string;
  district: string;
  subdivision?: string;
  population: number;
  riskLevel: VillageRiskLevel;
  coordinates: IVillageCoordinates;
  rainfall24h: number; // in mm
  saturationIndex?: number; // percentage (0-100)
  evacuationStatus: EvacuationStatus;
  primaryShelterId?: mongoose.Types.ObjectId;
  contactPersons: IVillageContact[];
  notes?: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const VillageCoordinatesSchema = new Schema<IVillageCoordinates>(
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

const VillageContactSchema = new Schema<IVillageContact>(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    designation: { type: String, required: true },
  },
  { _id: false }
);

const VillageSchema = new Schema<IVillage>(
  {
    villageName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    state: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    district: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    subdivision: {
      type: String,
      trim: true,
    },
    population: {
      type: Number,
      required: true,
      default: 0,
    },
    riskLevel: {
      type: String,
      enum: ['Low', 'Moderate', 'High', 'Critical'],
      default: 'Low',
      index: true,
    },
    coordinates: {
      type: VillageCoordinatesSchema,
      required: true,
    },
    rainfall24h: {
      type: Number,
      default: 0,
    },
    saturationIndex: {
      type: Number,
      default: 0,
    },
    evacuationStatus: {
      type: String,
      enum: ['Normal', 'Advisory', 'Evacuate'],
      default: 'Normal',
      index: true,
    },
    primaryShelterId: {
      type: Schema.Types.ObjectId,
      ref: 'Shelter',
    },
    contactPersons: [VillageContactSchema],
    notes: String,
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

VillageSchema.index({ 'coordinates': '2dsphere' });
VillageSchema.index({ state: 1, district: 1 });

export const Village: Model<IVillage> =
  mongoose.models.Village || mongoose.model<IVillage>('Village', VillageSchema, 'villages');

