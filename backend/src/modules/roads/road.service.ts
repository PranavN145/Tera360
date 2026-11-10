import mongoose from 'mongoose';
import { Road, IRoad, RoadStatus, RoadRiskLevel } from './road.model';
import { AuditLog } from '../audit/auditLog.model';

export class RoadServiceError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, code = 'ROAD_ERROR', statusCode = 400) {
    super(message);
    this.name = 'RoadServiceError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class RoadService {
  async updateStatus(
    id: string,
    payload: {
      status: RoadStatus;
      riskLevel?: RoadRiskLevel;
      statusReason?: string;
    },
    officerUser?: any
  ): Promise<IRoad> {
    const road = await Road.findOne({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(id) ? id : null },
        { code: id },
      ].filter(Boolean),
      isDeleted: false,
    });

    if (!road) {
      throw new RoadServiceError(`Road '${id}' not found`, 'NOT_FOUND', 404);
    }

    road.status = payload.status;
    if (payload.riskLevel) road.riskLevel = payload.riskLevel;
    if (payload.statusReason !== undefined) road.statusReason = payload.statusReason;
    road.lastUpdated = new Date();
    await road.save();

    await AuditLog.create({
      userId: officerUser?._id,
      userEmail: officerUser?.email,
      role: officerUser?.role || 'officer',
      action: 'ROAD_STATUS_UPDATED',
      resourceType: 'Road',
      resourceId: road.code,
      details: {
        status: road.status,
        riskLevel: road.riskLevel,
        statusReason: road.statusReason,
      },
      timestamp: new Date(),
    });

    return road;
  }

  async getImpactedRoads(): Promise<IRoad[]> {
    return Road.find({
      status: { $in: ['blocked', 'caution', 'partial'] },
      isDeleted: false,
    })
      .sort({ riskLevel: -1, code: 1 })
      .lean() as unknown as IRoad[];
  }

  async computeSafeRoute(payload: {
    origin: string;
    destination: string;
    state?: string;
  }): Promise<{
    routeId: string;
    origin: string;
    destination: string;
    recommendedPath: string;
    distanceKm: number;
    estimatedMinutes: number;
    avoidedCorridors: string[];
    safetyScore: number;
    turnByTurn: string[];
  }> {
    const blockedRoads = await Road.find({
      status: 'blocked',
      isDeleted: false,
    }).lean();

    const avoided = blockedRoads.map((r) => `${r.code} (${r.stretch})`);

    return {
      routeId: `SAFE-RT-${Date.now().toString(36).toUpperCase()}`,
      origin: payload.origin,
      destination: payload.destination,
      recommendedPath: 'Via Peducha – Tsiesema Bypass Corridors (Certified Stable High-Ground Transit)',
      distanceKm: 46.5,
      estimatedMinutes: 65,
      avoidedCorridors: avoided.length > 0 ? avoided : ['NH-29 Dzüdza active blockage sector'],
      safetyScore: 92,
      turnByTurn: [
        'Depart origin onto secondary bypass corridor with asphalt surface',
        'Follow NSDMA orange safety markers through Peducha junction',
        'Maintain maximum speed 40 km/h along Tsiesema high-ridge contour',
        'Rejoin primary highway at KM 52 north staging depot',
      ],
    };
  }

  async listSafeRoutes(): Promise<any[]> {
    const blocked = await Road.find({ status: 'blocked', isDeleted: false }).lean();
    const blockedCodes = blocked.map((b) => b.code);

    return [
      {
        id: 'route-nh29-alt1',
        title: 'Peducha – Tsiesema Bypass (NH-29 Emergency Alternative)',
        state: 'Nagaland',
        status: 'Operational',
        distance: '48 km',
        estimatedTravelTime: '1 hr 15 mins',
        roadCondition: 'Paved, 2-lane, monitored slope',
        avoidedBlockages: blockedCodes.includes('NH-29') ? ['NH-29 KM 38-52 (Dzüdza Bridge)'] : [],
        recommendedFor: 'Light vehicles, Ambulances, Essential Relief Convoys',
        checkpoints: ['Peducha Staging Post', 'Tsiesema Ridge Outpost', 'High School Junction'],
      },
      {
        id: 'route-nh10-alt1',
        title: 'Lava – Algarah – Reshi Bypass (NH-10 Emergency Alternative)',
        state: 'Sikkim',
        status: 'Operational',
        distance: '62 km',
        estimatedTravelTime: '2 hrs 10 mins',
        roadCondition: 'Hilly contour, pilot escorts during daylight',
        avoidedBlockages: ['NH-10 29th Mile Teesta river cutting'],
        recommendedFor: 'Light and medium commercial vehicles',
        checkpoints: ['Coronation Bridge Post', 'Lava Bazar Junction', 'Rangpo Border Check'],
      },
    ];
  }
}

export const roadService = new RoadService();

