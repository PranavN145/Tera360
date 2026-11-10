import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IShelterCoordinates {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

export interface IShelter extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  villageName?: string;
  villageId?: mongoose.Types.ObjectId;
  district: string;
  state: string;
  address: string;
  capacity: number;
  currentOccupancy: number;
  status: 'Operational' | 'Staging Ready' | 'Standby' | 'Full';
  coordinates: IShelterCoordinates;
  helpline: string;
  amenities: string[];
  walkingDirections?: string;
  drivingDirections?: string;
  contactPersonName?: string;
  contactPersonPhone?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ShelterCoordinatesSchema = new Schema<IShelterCoordinates>(
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

const ShelterSchema = new Schema<IShelter>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    villageName: {
      type: String,
      trim: true,
      index: true,
    },
    villageId: {
      type: Schema.Types.ObjectId,
      ref: 'Village',
      index: true,
    },
    district: {
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
    address: {
      type: String,
      required: true,
      trim: true,
    },
    capacity: {
      type: Number,
      required: true,
      default: 100,
    },
    currentOccupancy: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['Operational', 'Staging Ready', 'Standby', 'Full'],
      default: 'Operational',
      index: true,
    },
    coordinates: {
      type: ShelterCoordinatesSchema,
      required: true,
    },
    helpline: {
      type: String,
      required: true,
      trim: true,
    },
    amenities: [{ type: String }],
    walkingDirections: String,
    drivingDirections: String,
    contactPersonName: String,
    contactPersonPhone: String,
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

ShelterSchema.index({ coordinates: '2dsphere' });

export const Shelter: Model<IShelter> =
  mongoose.models.Shelter || mongoose.model<IShelter>('Shelter', ShelterSchema, 'shelters');

