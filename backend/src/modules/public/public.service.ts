import { Alert } from '../alerts/alert.model';
import { Road } from '../roads/road.model';
import { Report } from '../reports/report.model';
import { GetRiskMapQuery, GetAlertsQuery, GetRoadStatusQuery } from './public.schema';

export interface PublicRiskMapItem {
  id: string;
  name: string;
  code: string;
  state: string;
  stretch: string;
  status: string;
  riskLevel: string;
  statusReason?: string | null;
  geometry?: any;
  coordinatesText?: string | null;
  mapCoordinates?: { x: number; y: number } | null;
  lastUpdated: Date;
}

export interface PublicAlertItem {
  id: string;
  title: string;
  severity: string;
  state: string;
  corridor: string;
  location?: string | null;
  description: string;
  coordinates?: any;
  coordinatesText?: string | null;
  rainfall24h?: string | null;
  saturation?: string | null;
  trafficStatus?: string | null;
  advisory: string;
  status: string;
  publishedAt: Date;
  createdAt: Date;
}

export interface PublicRoadStatusItem {
  id: string;
  name: string;
  code: string;
  state: string;
  stretch: string;
  status: string;
  riskLevel: string;
  statusReason?: string | null;
  isMajorNH: boolean;
  coordinatesText?: string | null;
  lastUpdated: Date;
}

export interface PublicStats {
  publishedAlerts: number;
  criticalAlerts: number;
  blockedRoads: number;
  roadsUnderCaution: number;
  openRoads: number;
  totalMonitoredCorridors: number;
  communityReportsSubmitted: number;
  lastUpdated: string;
}

export class PublicService {
  /**
   * 1. GET /api/v1/public/risk-map
   * Returns road corridors with geometry/map coordinates for live risk mapping.
   */
  async getRiskMap(query: GetRiskMapQuery): Promise<PublicRiskMapItem[]> {
    const filter: Record<string, any> = { isDeleted: false };
    if (query.state) {
      filter.state = new RegExp(`^${query.state.trim()}$`, 'i');
    }

    const roads = await Road.find(filter)
      .sort({ code: 1, name: 1 })
      .lean();

    return roads.map((road) => ({
      id: road._id.toString(),
      name: road.name,
      code: road.code,
      state: road.state,
      stretch: road.stretch,
      status: road.status,
      riskLevel: road.riskLevel,
      statusReason: road.statusReason || null,
      geometry: road.geometry || null,
      coordinatesText: road.coordinatesText || null,
      mapCoordinates: road.mapCoordinates || null,
      lastUpdated: road.lastUpdated || (road as any).updatedAt,
    }));
  }

  /**
   * 2. GET /api/v1/public/alerts
   * Returns paginated published alerts, sorted newest first. Never exposes createdBy.
   */
  async getPublishedAlerts(query: GetAlertsQuery): Promise<{
    alerts: PublicAlertItem[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    const filter: Record<string, any> = {
      status: 'published',
      isDeleted: false,
    };

    if (query.state) {
      filter.state = new RegExp(`^${query.state.trim()}$`, 'i');
    }

    if (query.severity) {
      filter.severity = query.severity;
    }

    const page = query.page;
    const limit = query.limit;
    const skip = (page - 1) * limit;

    const [alerts, total] = await Promise.all([
      Alert.find(filter)
        .sort({ publishedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Alert.countDocuments(filter),
    ]);

    const sanitizedAlerts: PublicAlertItem[] = alerts.map((alert) => ({
      id: alert._id.toString(),
      title: alert.title,
      severity: alert.severity,
      state: alert.state,
      corridor: alert.corridor,
      location: alert.location || null,
      description: alert.description,
      coordinates: alert.coordinates || null,
      coordinatesText: alert.coordinatesText || null,
      rainfall24h: alert.rainfall24h || null,
      saturation: alert.saturation || null,
      trafficStatus: alert.trafficStatus || null,
      advisory: alert.advisory,
      status: alert.status,
      publishedAt: alert.publishedAt || (alert as any).createdAt,
      createdAt: (alert as any).createdAt,
    }));

    return {
      alerts: sanitizedAlerts,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * 3. GET /api/v1/public/road-status
   * Returns current highway/corridor clearance status.
   */
  async getRoadStatus(query: GetRoadStatusQuery): Promise<PublicRoadStatusItem[]> {
    const filter: Record<string, any> = { isDeleted: false };

    if (query.state) {
      filter.state = new RegExp(`^${query.state.trim()}$`, 'i');
    }

    if (query.status) {
      filter.status = query.status;
    }

    const roads = await Road.find(filter)
      .sort({ lastUpdated: -1, code: 1 })
      .lean();

    return roads.map((road) => ({
      id: road._id.toString(),
      name: road.name,
      code: road.code,
      state: road.state,
      stretch: road.stretch,
      status: road.status,
      riskLevel: road.riskLevel,
      statusReason: road.statusReason || null,
      isMajorNH: road.isMajorNH,
      coordinatesText: road.coordinatesText || null,
      lastUpdated: road.lastUpdated || (road as any).updatedAt,
    }));
  }

  /**
   * 4. GET /api/v1/public/stats
   * Returns aggregated platform counts directly from live MongoDB data.
   */
  async getStats(): Promise<PublicStats> {
    const [
      publishedAlerts,
      criticalAlerts,
      blockedRoads,
      roadsUnderCaution,
      openRoads,
      totalMonitoredCorridors,
      communityReportsSubmitted,
    ] = await Promise.all([
      Alert.countDocuments({ status: 'published', isDeleted: false }),
      Alert.countDocuments({ status: 'published', severity: 'Critical', isDeleted: false }),
      Road.countDocuments({ status: 'blocked', isDeleted: false }),
      Road.countDocuments({ status: { $in: ['caution', 'partial'] }, isDeleted: false }),
      Road.countDocuments({ status: 'open', isDeleted: false }),
      Road.countDocuments({ isDeleted: false }),
      Report.countDocuments({ isDeleted: false }),
    ]);

    return {
      publishedAlerts,
      criticalAlerts,
      blockedRoads,
      roadsUnderCaution,
      openRoads,
      totalMonitoredCorridors,
      communityReportsSubmitted,
      lastUpdated: new Date().toISOString(),
    };
  }
}

export const publicService = new PublicService();

