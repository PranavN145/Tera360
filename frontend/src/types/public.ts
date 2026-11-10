import { AlertDetail } from '@/context/AppContext';

export interface PublicRiskMapItem {
  id: string;
  name: string;
  code: string;
  state: string;
  stretch: string;
  status: 'open' | 'caution' | 'partial' | 'blocked' | string;
  riskLevel: 'Low' | 'Moderate' | 'High' | 'Critical' | string;
  statusReason?: string | null;
  geometry?: { type?: string; coordinates?: number[] | number[][] } | null;
  coordinatesText?: string | null;
  mapCoordinates?: { x: number; y: number } | null;
  lastUpdated: string;
}

export interface PublicAlertItem {
  id: string;
  title: string;
  severity: 'Critical' | 'Warning' | 'Watch' | string;
  state: string;
  corridor: string;
  location?: string | null;
  description: string;
  coordinates?: { type?: string; coordinates?: [number, number] } | null;
  coordinatesText?: string | null;
  rainfall24h?: string | null;
  saturation?: string | null;
  trafficStatus?: string | null;
  advisory: string;
  status: string;
  publishedAt: string;
  createdAt: string;
  confidence?: number | null;
  modelName?: string | null;
}

export interface PublicRoadStatusItem {
  id: string;
  name: string;
  code: string;
  state: string;
  stretch: string;
  status: 'open' | 'caution' | 'partial' | 'blocked' | string;
  riskLevel: 'Low' | 'Moderate' | 'High' | 'Critical' | string;
  statusReason?: string | null;
  isMajorNH: boolean;
  coordinatesText?: string | null;
  lastUpdated: string;
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
  modelStatus?: string | null;
  modelActive?: boolean | null;
}

export interface PublicPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PublicAlertsResponse {
  alerts: PublicAlertItem[];
  pagination: PublicPagination;
}

export interface CreateHazardReportPayload {
  state: string;
  location: string;
  hazardType: string;
  description: string;
  severity?: 'Critical' | 'Warning' | 'Watch';
  reporterName?: string;
  reporterPhone?: string;
  photoUrl?: string;
  coordinates?: {
    type: 'Point';
    coordinates: [number, number];
  };
  captchaToken?: string;
}

export interface HazardReportOutput {
  reportId: string;
  state: string;
  location: string;
  hazardType: string;
  severity: string;
  description: string;
  reporterName?: string;
  reporterPhone?: string;
  photoUrl?: string;
  coordinates?: {
    type: 'Point';
    coordinates: [number, number];
  };
  status: string;
  source: string;
  createdAt: string;
}

export interface CreateContactPayload {
  name: string;
  email: string;
  state: string;
  message: string;
  phone?: string;
}

export interface ContactOutput {
  id: string;
  name: string;
  email: string;
  state: string;
  message: string;
  phone?: string;
  status: string;
  createdAt: string;
}

/**
 * Format relative time (e.g., "12 mins ago", "2 hours ago", "Yesterday")
 */
export function formatRelativeTime(dateInput?: string | Date | null): string {
  if (!dateInput) return 'Recently';

  try {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(date.getTime())) return 'Recently';

    if (typeof window === 'undefined') {
      return 'Recently';
    }

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (diffMs < 0) return 'Just now';

    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins === 1 ? '' : 's'} ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;

    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return 'Recently';
  }
}

/**
 * Maps a public API alert to the AlertDetail modal model
 */
export function alertItemToAlertDetail(item: PublicAlertItem): AlertDetail {
  const validSeverity =
    item.severity === 'Critical' || item.severity === 'Warning' || item.severity === 'Watch'
      ? item.severity
      : 'Watch';

  return {
    id: item.id,
    severity: validSeverity,
    location: item.location || item.title || `${item.corridor} (${item.state})`,
    state: item.state || 'Northeast Region',
    corridor: item.corridor || 'Regional Highway',
    timestamp: item.publishedAt || item.createdAt || 'Recently',
    description: item.description || 'Active landslide advisory issued by monitoring authorities.',
    coordinates: item.coordinatesText || (item.coordinates?.coordinates ? `${item.coordinates.coordinates[1]}° N, ${item.coordinates.coordinates[0]}° E` : 'Coordinates on file'),
    rainfall24h: item.rainfall24h || 'Monitored',
    saturation: item.saturation || 'Monitored',
    trafficStatus: item.trafficStatus || 'Active Advisory',
    advisory: item.advisory || 'Exercise caution when transiting through this corridor.',
  };
}

/**
 * Maps a public API road to the AlertDetail modal model
 */
export function riskMapItemToAlertDetail(road: PublicRiskMapItem): AlertDetail {
  let severity: 'Critical' | 'Warning' | 'Watch' = 'Watch';
  const risk = (road.riskLevel || '').toLowerCase();
  const status = (road.status || '').toLowerCase();

  if (risk === 'critical' || status === 'blocked') {
    severity = 'Critical';
  } else if (risk === 'high' || risk === 'moderate' || status === 'caution' || status === 'partial') {
    severity = 'Warning';
  }

  const trafficStatus =
    status === 'blocked'
      ? 'Blocked · Diversion in effect'
      : status === 'caution'
      ? 'Caution · Single lane / slow'
      : status === 'partial'
      ? 'Partial clearance operational'
      : 'Open to vehicular traffic';

  return {
    id: road.id,
    severity,
    location: `${road.name} (${road.code})`,
    state: road.state,
    corridor: road.stretch,
    timestamp: road.lastUpdated || 'Recently',
    description:
      road.statusReason ||
      `Monitored highway stretch on ${road.code}. Current risk level evaluated as ${road.riskLevel}.`,
    coordinates: road.coordinatesText || 'GIS Monitored Segment',
    rainfall24h: 'Telemetry Active',
    saturation: `Risk: ${road.riskLevel}`,
    trafficStatus,
    advisory:
      severity === 'Critical'
        ? 'Avoid travel on this corridor. Emergency clearance operations may be underway.'
        : severity === 'Warning'
        ? 'Proceed with extreme vigilance. Watch for loose rockfall or debris.'
        : 'Maintain hill speed limits and adhere to traffic police directives.',
  };
}

/**
 * Maps a public API road status to the AlertDetail modal model
 */
export function roadStatusItemToAlertDetail(road: PublicRoadStatusItem): AlertDetail {
  return riskMapItemToAlertDetail(road as unknown as PublicRiskMapItem);
}

