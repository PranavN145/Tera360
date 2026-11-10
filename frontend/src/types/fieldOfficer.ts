/**
 * Terra360 Field Officer Portal Types
 * Shared data contracts for field officer operations, tasks, map data, reports, and road statuses.
 */

export type TaskRiskLevel = 'Low' | 'Moderate' | 'High' | 'Critical';
export type TaskStatus = 'Assigned' | 'In_Progress' | 'Completed' | 'Escalated';
export type RoadCondition = 'Open' | 'Caution' | 'Partially Blocked' | 'Blocked';
export type VillagerReportStatus = 'Pending' | 'Verified' | 'Rejected' | 'Escalated';
export type AlertSeverityLevel = 'Advisory' | 'Warning' | 'Critical';

export interface FieldOfficerProfile {
  id: string;
  name: string;
  department: string;
  assignedArea: string;
  sectorCode?: string;
  phone: string;
  language: string;
  activeDutyStatus: boolean;
  badgeNumber: string;
  jurisdictionVillages?: string[];
  jurisdictionRoads?: string[];
  postLocation?: {
    name: string;
    coordinates: [number, number];
  };
}

export interface FieldOfficerTask {
  id: string;
  title?: string;
  sector?: string;
  location: {
    coordinates: [number, number]; // [lng, lat] or [lat, lng]
    chainageName?: string;
    name?: string;
    landmark?: string;
  };
  riskLevel: TaskRiskLevel;
  priority?: 'Critical' | 'High' | 'Moderate' | 'Low' | string;
  reason: string;
  deadline: string;
  status: TaskStatus;
  assignedBy?: string;
  assignedOfficerId?: string;
  assignedAt?: string;
  startedAt?: string | null;
  completedAt?: string | null;
  completionNotes?: string | null;
  notes?: string | null;
  escalatedAt?: string | null;
  escalationReason?: string | null;
  escalationPriority?: string | null;
  escalation?: {
    reason: string;
    priority: string;
    escalatedAt: string;
    escalatedBy: string;
  } | null;
}

export interface VillagerReportItem {
  id: string;
  sector?: string;
  villagerName: string;
  contact: string;
  timestamp: string;
  coordinates: [number, number]; // [lng, lat]
  locationDescription: string;
  hazardType: string;
  photoUrl: string;
  status: VillagerReportStatus;
  fieldNotes?: string | null;
  inspectorPhotoUrl?: string | null;
  verifiedAt?: string | null;
  verifiedBy?: string | null;
  rejectionReason?: string | null;
  rejectedAt?: string | null;
  rejectedBy?: string | null;
  escalationMetadata?: {
    urgency: 'Immediate' | 'High' | 'Critical';
    escalationReason: string;
    recommendedAction?: string;
    escalatedBy: string;
    escalatedAt: string;
  } | null;
}

export interface RoadStatusSegment {
  roadSegmentId: string;
  stretchName: string;
  condition: RoadCondition;
  reason: string;
  photoUrl?: string | null;
  timestamp: string;
  updatedBy: string;
  sector?: string;
}

export interface SectorAlertItem {
  id: string;
  severity: AlertSeverityLevel;
  title: string;
  instructions: string;
  createdAt: string;
  acknowledged: boolean;
  acknowledgedAt?: string | null;
  acknowledgedBy?: string | null;
  targetSector?: string;
}

export interface DangerZoneItem {
  zoneId: string;
  name: string;
  coordinates: [number, number];
  riskWeight: number;
  landslideSusceptibility: string;
  slopeAngleDeg: number;
  soilMoisturePercent: number;
  recentRainfall24hMm: number;
  radiusMeters: number;
  historicalIncidents: number;
  status: string;
}

export interface NavigationRouteItem {
  taskId: string;
  targetLocation: string;
  origin: {
    name: string;
    coordinates: [number, number];
  };
  destination: {
    name: string;
    coordinates: [number, number];
  };
  distanceKm: number;
  estimatedTravelTimeMin: number;
  routeWaypoints: [number, number][];
}

export interface FieldOfficerMapData {
  sector: string;
  sectorCenter: [number, number];
  zoomLevel: number;
  boundaries?: {
    type: 'FeatureCollection';
    features: any[];
  };
  villages?: {
    type: 'FeatureCollection';
    features: any[];
  };
  roadStretches?: any[];
  highRiskHazardZones?: any[];
  dangerZones?: DangerZoneItem[];
  hazardReports?: {
    reportId: string;
    villagerName: string;
    coordinates: [number, number];
    hazardType: string;
    status: string;
    locationDescription: string;
    timestamp: string;
    photoUrl: string;
  }[];
  activeReports?: any[];
  navigationRoutes?: NavigationRouteItem[];
}

