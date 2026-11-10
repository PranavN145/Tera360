/**
 * Centralized Demo Data Layer & Offline Persistence Manager
 *
 * Provides complete, resilient local data storage for Terra360 Frontend-First
 * Development Mode when the local backend server (port 5000) or MongoDB
 * is offline or unreachable.
 *
 * Guarantees:
 * 1. Persistent session state across page reloads without unhandled fetch failures.
 * 2. Cross-portal state synchronization (Citizen reports visible to Officer & Field).
 * 3. LocalStorage persistence for user profile, village, family emergency contacts,
 *    alert preferences, and hazard reports.
 * 4. Distinct demo data separation from live intelligence without altering existing
 *    API schemas or backend security boundaries.
 */

import {
  User,
  UserSession,
  UpdateProfilePayload,
  ChangePasswordPayload,
  UserExportData,
} from '@/types/auth';
import {
  PublicRiskMapItem,
  PublicAlertItem,
  PublicRoadStatusItem,
  PublicStats,
  PublicAlertsResponse,
  CreateHazardReportPayload,
  HazardReportOutput,
  CreateContactPayload,
  ContactOutput,
} from '@/types/public';

// ==========================================
// LocalStorage Persistence Keys
// ==========================================
const STORAGE_KEYS = {
  ACTIVE_USER: 'terra360_active_demo_user',
  USERS_MAP: 'terra360_demo_users_map',
  REPORTS: 'terra360_demo_reports',
  ALERTS: 'terra360_demo_alerts',
  ROADS: 'terra360_demo_roads',
  CONTACTS: 'terra360_demo_contacts',
  SESSIONS: 'terra360_demo_sessions',
  OFFLINE_FLAG: 'terra360_backend_offline_detected',
} as const;

// In-memory fallback cache for Node.js / SSR environments when window is undefined
const inMemoryStore: Record<string, string> = {};

// Safe window.localStorage access with in-memory fallback
function getFromStorage<T>(key: string, defaultValue: T): T {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return defaultValue;
      return JSON.parse(raw) as T;
    } catch {
      return defaultValue;
    }
  }
  const cached = inMemoryStore[key];
  if (!cached) return defaultValue;
  try {
    return JSON.parse(cached) as T;
  } catch {
    return defaultValue;
  }
}

function setToStorage<T>(key: string, value: T): void {
  const serialized = JSON.stringify(value);
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(key, serialized);
    } catch {
      // quota exceeded or private mode
    }
  }
  inMemoryStore[key] = serialized;
}

function removeFromStorage(key: string): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }
  delete inMemoryStore[key];
}

// ==========================================
// Baseline Seed Data
// ==========================================
export const SEED_DEMO_USERS: Record<string, User> = {
  'citizen@terra360.in': {
    _id: 'demo-citizen-id',
    name: 'Temjen Ao',
    email: 'citizen@terra360.in',
    role: 'citizen',
    phone: '+91 94360 12345',
    language: 'en',
    emailVerified: true,
    isActive: true,
    village: {
      state: 'Nagaland',
      district: 'Kohima',
      villageName: 'Phesama',
    },
    familyContacts: [
      {
        name: 'Arenla Ao',
        phone: '+91 94360 98765',
        relationship: 'Spouse',
      },
      {
        name: 'Keviseto Ao',
        phone: '+91 94360 88776',
        relationship: 'Brother',
      },
    ],
    alertPreferences: {
      ivrs: true,
      sms: true,
      app: true,
    },
    createdAt: '2026-01-15T08:30:00.000Z',
  },
  'officer@terra360.in': {
    _id: 'demo-officer-id',
    name: 'Vikram Sen (SDMA Officer)',
    email: 'officer@terra360.in',
    role: 'officer',
    phone: '+91 98765 43210',
    language: 'en',
    emailVerified: true,
    isActive: true,
    createdAt: '2026-01-10T09:00:00.000Z',
  },
  'field@terra360.in': {
    _id: 'demo-field-id',
    name: 'Lhokhoto Sema',
    email: 'field@terra360.in',
    role: 'field_officer',
    phone: '+91 94361 98765',
    language: 'en',
    emailVerified: true,
    isActive: true,
    createdAt: '2026-01-12T10:15:00.000Z',
  },
  'driver@terra360.in': {
    _id: 'demo-driver-id',
    name: 'Raju Sharma',
    email: 'driver@terra360.in',
    role: 'driver',
    phone: '+91 98620 54321',
    language: 'hi',
    emailVerified: true,
    isActive: true,
    createdAt: '2026-01-14T11:45:00.000Z',
  },
  'admin@terra360.in': {
    _id: 'demo-admin-id',
    name: 'System Administrator',
    email: 'admin@terra360.in',
    role: 'admin',
    phone: '+91 98000 00000',
    language: 'en',
    emailVerified: true,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
};

export const SEED_DEMO_ALERTS: PublicAlertItem[] = [
  {
    id: 'ALT-2026-001',
    title: 'RED ALERT: Impending Debris Flow & Slope Instability',
    severity: 'Critical',
    state: 'Nagaland',
    corridor: 'NH-29 Dimapur – Kohima Highway',
    location: 'KM 44 Dzüdza Bridge & Pherima Ridge Sector',
    description:
      'Continuous torrential rainfall exceeding 164 mm in past 24 hours has pushed subsurface soil pore pressures above threshold limits. Active rockfall and mudflows reported.',
    rainfall24h: '164 mm / 24h',
    saturation: '92% (Severe Hydrostatic Pore Pressure)',
    trafficStatus: 'CORRIDOR BLOCKED — Heavy Transit Diverted via Peducha Bypass',
    advisory:
      'Evacuate lower mud gullies immediately. Head toward Phesama Community Hall or Upper Ridge Shelter.',
    status: 'published',
    publishedAt: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
  },
  {
    id: 'ALT-2026-002',
    title: 'WARNING: Teesta Riverbank Scour & Retaining Wall Movement',
    severity: 'Warning',
    state: 'Sikkim',
    corridor: 'NH-10 Siliguri – Gangtok Highway',
    location: '29th Mile & Teesta Low Dam Sector',
    description:
      'High river discharge eroding road toe support. Retaining wall showing lateral displacement of 8 cm. One-way piloted transit enforced.',
    rainfall24h: '112 mm / 24h',
    saturation: '78% (High Saturation)',
    trafficStatus: 'ONE-WAY RESTRICTED — Light Passenger Vehicles Only',
    advisory:
      'Commercial carriers to divert via Sevoke – Mungpoo – Reshi route. Maintain 20 km/h and obey traffic marshals.',
    status: 'published',
    publishedAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
  },
  {
    id: 'ALT-2026-003',
    title: 'WATCH: Geological Incline Saturation Advisory',
    severity: 'Watch',
    state: 'Assam',
    corridor: 'NH-27 Lumding – Haflong – Silchar Highway',
    location: 'Jatinga Valley Cutting & Harangajao Sector',
    description:
      'Moderate hillside soil creep detected along railway cutting slopes. Ground surveillance teams deployed for continuous tilt monitoring.',
    rainfall24h: '62 mm / 24h',
    saturation: '64% (Elevated Incline Saturation)',
    trafficStatus: 'OPEN WITH CAUTION — Slow Transit Advised',
    advisory:
      'Night transit restricted for passenger buses between 10 PM and 5 AM as a precautionary measure.',
    status: 'published',
    publishedAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
  },
  {
    id: 'ALT-2026-004',
    title: 'WATCH: High Precipitation Hill Slope Saturation',
    severity: 'Watch',
    state: 'Meghalaya',
    corridor: 'Sohra – Shella Road',
    location: 'Cherrapunji Outskirts Bedrock Ridge',
    description:
      'Periodic high-intensity cloudbursts. Surface runoff draining along highway culverts. Watch for loose rock fragments on bends.',
    rainfall24h: '85 mm / 24h',
    saturation: '58% (Moderate Incline Saturation)',
    trafficStatus: 'OPEN — Normal Highway Operation',
    advisory:
      'Maintain headlights during heavy fog and avoid parking near cut slopes.',
    status: 'published',
    publishedAt: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 9 * 3600 * 1000).toISOString(),
  },
];

export const SEED_DEMO_ROADS: PublicRoadStatusItem[] = [
  {
    id: 'road-nh29',
    name: 'NH-29 Dimapur – Kohima – Mao Corridor',
    code: 'NH-29',
    state: 'Nagaland',
    stretch: 'KM 40 – KM 55 (Dzüdza Bridge / Pherima)',
    status: 'blocked',
    riskLevel: 'Critical',
    statusReason: 'Debris flow burying 60m roadbed. Border Roads Organisation (BRO) clearing active.',
    isMajorNH: true,
    coordinatesText: '25.72° N, 94.02° E',
    lastUpdated: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
  },
  {
    id: 'road-nh10',
    name: 'NH-10 Siliguri – Gangtok Highway',
    code: 'NH-10',
    state: 'Sikkim',
    stretch: '29th Mile – Melli Corridor',
    status: 'caution',
    riskLevel: 'High',
    statusReason: 'River toe scour. Single-lane piloted convoy for LMVs only under police supervision.',
    isMajorNH: true,
    coordinatesText: '27.09° N, 88.46° E',
    lastUpdated: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
  },
  {
    id: 'road-nh27',
    name: 'NH-27 Lumding – Haflong – Silchar Highway',
    code: 'NH-27',
    state: 'Assam',
    stretch: 'Haflong Hill Section & Jatinga Bypass',
    status: 'open',
    riskLevel: 'Moderate',
    statusReason: 'Open for all vehicular transit. Geotechnical ground patrol active.',
    isMajorNH: true,
    coordinatesText: '25.12° N, 93.04° E',
    lastUpdated: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'road-nh102',
    name: 'NH-102 Imphal – Moreh Border Highway',
    code: 'NH-102',
    state: 'Manipur',
    stretch: 'Tengnoupal Hill Crest',
    status: 'caution',
    riskLevel: 'Moderate',
    statusReason: 'Minor hillside debris cleared; gravel surfacing on curves.',
    isMajorNH: true,
    coordinatesText: '24.38° N, 94.15° E',
    lastUpdated: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
  },
  {
    id: 'road-nh208',
    name: 'NH-208 Agartala – Sabroom Highway',
    code: 'NH-208',
    state: 'Tripura',
    stretch: 'Udaipur – Belonia Section',
    status: 'open',
    riskLevel: 'Low',
    statusReason: 'Full corridor operational with clear drainage culverts.',
    isMajorNH: true,
    coordinatesText: '23.53° N, 91.48° E',
    lastUpdated: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
  },
  {
    id: 'road-nh6',
    name: 'NH-6 Shillong – Jowai – Sonapur Tunnel',
    code: 'NH-6',
    state: 'Meghalaya',
    stretch: 'KM 78 to KM 92 (East Jaintia Hills)',
    status: 'caution',
    riskLevel: 'High',
    statusReason: 'Periodic mud accumulation near Sonapur tunnel entrance; single-lane convoy active.',
    isMajorNH: true,
    coordinatesText: '25.1050° N, 92.3600° E',
    lastUpdated: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
  {
    id: 'road-nh415',
    name: 'NH-415 Banderdewa – Itanagar Expressway',
    code: 'NH-415',
    state: 'Arunachal Pradesh',
    stretch: 'KM 12 to KM 28 (Papum Pare Sector)',
    status: 'open',
    riskLevel: 'Watch',
    statusReason: 'Minor tension cracks monitored; clear transit with speed precautions.',
    isMajorNH: true,
    coordinatesText: '27.1200° N, 93.8100° E',
    lastUpdated: new Date(Date.now() - 50 * 60 * 1000).toISOString(),
  },
  {
    id: 'road-nh54',
    name: 'NH-54 Silchar – Vairengte – Aizawl Highway',
    code: 'NH-54',
    state: 'Mizoram',
    stretch: 'KM 55 to KM 80 (Hmuifang Sector)',
    status: 'open',
    riskLevel: 'Low',
    statusReason: 'Dry conditions; normal vehicular transit operating on schedule.',
    isMajorNH: true,
    coordinatesText: '23.4500° N, 92.7500° E',
    lastUpdated: new Date(Date.now() - 70 * 60 * 1000).toISOString(),
  },
];

export const SEED_DEMO_REPORTS: HazardReportOutput[] = [
  {
    reportId: 'TR-2026-0891',
    state: 'Nagaland',
    location: 'NH-29 KM 44, Dzüdza Bridge Culvert',
    hazardType: 'Landslide',
    severity: 'Critical',
    description:
      'Large mud and boulder slide covering both highway lanes. Mud continues to flow from upper terrace. Traffic halted.',
    reporterName: 'Keviseto Angami',
    reporterPhone: '+91 94360 88776',
    status: 'under_review',
    source: 'citizen',
    createdAt: new Date(Date.now() - 75 * 60 * 1000).toISOString(),
    coordinates: {
      type: 'Point',
      coordinates: [94.02, 25.72],
    },
  },
  {
    reportId: 'TR-2026-0842',
    state: 'Sikkim',
    location: 'NH-10 Mile 29 Riverbank Approach',
    hazardType: 'Road blockage',
    severity: 'Warning',
    description:
      'Road edge subsidence caused by high Teesta river water level. Police managing one-way traffic.',
    reporterName: 'Pemba Bhutia',
    reporterPhone: '+91 97330 45109',
    status: 'verified',
    source: 'citizen',
    createdAt: new Date(Date.now() - 180 * 60 * 1000).toISOString(),
    coordinates: {
      type: 'Point',
      coordinates: [88.46, 27.09],
    },
  },
  {
    reportId: 'TR-2026-0789',
    state: 'Assam',
    location: 'Jatinga Ridge Paved Link Road',
    hazardType: 'Slope instability',
    severity: 'Watch',
    description:
      'Minor rock loosening observed on the upper embankment above the village school access path.',
    reporterName: 'Debojit Hojai',
    reporterPhone: '+91 94350 78201',
    status: 'submitted',
    source: 'citizen',
    createdAt: new Date(Date.now() - 360 * 60 * 1000).toISOString(),
    coordinates: {
      type: 'Point',
      coordinates: [93.04, 25.12],
    },
  },
  {
    reportId: 'TR-2026-0714',
    state: 'Nagaland',
    location: 'Phesama Upper Ridge, Sector A Path',
    hazardType: 'Retaining wall damage',
    severity: 'Warning',
    description:
      'Dry stone retaining wall behind the community hall developed diagonal fracture following heavy rainfall.',
    reporterName: 'Temjen Ao',
    reporterPhone: '+91 94360 12345',
    status: 'under_review',
    source: 'citizen',
    createdAt: new Date(Date.now() - 540 * 60 * 1000).toISOString(),
    coordinates: {
      type: 'Point',
      coordinates: [94.11, 25.64],
    },
  },
];

export const SEED_DEMO_RISK_MAP: PublicRiskMapItem[] = [
  {
    id: 'corridor-nh29',
    name: 'NH-29 Dimapur – Kohima – Mao Corridor',
    code: 'NH-29',
    state: 'Nagaland',
    stretch: 'KM 40 – KM 55 (Dzüdza Bridge / Pherima)',
    status: 'blocked',
    riskLevel: 'Critical',
    statusReason: 'Debris flow burying 60m roadbed. BRO clearing active.',
    coordinatesText: '25.72° N, 94.02° E',
    mapCoordinates: { x: 94.02, y: 25.72 },
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'corridor-nh10',
    name: 'NH-10 Siliguri – Gangtok Highway',
    code: 'NH-10',
    state: 'Sikkim',
    stretch: '29th Mile – Melli Corridor',
    status: 'caution',
    riskLevel: 'High',
    statusReason: 'River toe scour. Single-lane piloted convoy for LMVs only.',
    coordinatesText: '27.09° N, 88.46° E',
    mapCoordinates: { x: 88.46, y: 27.09 },
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'corridor-nh27',
    name: 'NH-27 Lumding – Haflong – Silchar Highway',
    code: 'NH-27',
    state: 'Assam',
    stretch: 'Haflong Hill Section & Jatinga Bypass',
    status: 'open',
    riskLevel: 'Moderate',
    statusReason: 'Open for all vehicular transit.',
    coordinatesText: '25.12° N, 93.04° E',
    mapCoordinates: { x: 93.04, y: 25.12 },
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'corridor-nh6',
    name: 'NH-6 Shillong – Jowai – Silchar Highway',
    code: 'NH-6',
    state: 'Meghalaya',
    stretch: 'KM 78 to KM 92 (East Jaintia Hills)',
    status: 'caution',
    riskLevel: 'High',
    statusReason: 'Periodic mud accumulation near Sonapur tunnel entrance; single-lane convoy active.',
    coordinatesText: '25.1050° N, 92.3600° E',
    mapCoordinates: { x: 92.36, y: 25.105 },
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'corridor-nh415',
    name: 'NH-415 Banderdewa – Itanagar Expressway',
    code: 'NH-415',
    state: 'Arunachal Pradesh',
    stretch: 'KM 12 to KM 28 (Papum Pare Sector)',
    status: 'open',
    riskLevel: 'Watch',
    statusReason: 'Minor tension cracks monitored; clear transit with speed precautions.',
    coordinatesText: '27.1200° N, 93.8100° E',
    mapCoordinates: { x: 93.81, y: 27.12 },
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'corridor-nh37',
    name: 'NH-37 Imphal – Tupul – Jiribam Highway',
    code: 'NH-37',
    state: 'Manipur',
    stretch: 'KM 45 to KM 62 (Noney Hill Pass)',
    status: 'open',
    riskLevel: 'Watch',
    statusReason: 'Routine slope stabilization works; clear vehicular movement.',
    coordinatesText: '24.8400° N, 93.6300° E',
    mapCoordinates: { x: 93.63, y: 24.84 },
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'corridor-nh54',
    name: 'NH-54 Aizawl – Thenzawl – Lunglei Mountain Road',
    code: 'NH-54',
    state: 'Mizoram',
    stretch: 'KM 55 to KM 80 (Hmuifang Sector)',
    status: 'open',
    riskLevel: 'Low',
    statusReason: 'Dry conditions; normal vehicular transit operating on schedule.',
    coordinatesText: '23.4500° N, 92.7500° E',
    mapCoordinates: { x: 92.75, y: 23.45 },
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'corridor-nh8',
    name: 'NH-8 Agartala – Udaipur National Corridor',
    code: 'NH-8',
    state: 'Tripura',
    stretch: 'KM 18 to KM 44 (Gomati River Sector)',
    status: 'open',
    riskLevel: 'Low',
    statusReason: 'Optimal transit condition. All drainage culverts inspected and clear.',
    coordinatesText: '23.5300° N, 91.4800° E',
    mapCoordinates: { x: 91.48, y: 23.53 },
    lastUpdated: new Date().toISOString(),
  },
];

function matchesStateQuery(stateName?: string, queryState?: string): boolean {
  if (!queryState || queryState === 'All' || queryState === 'All States' || queryState === 'Default') return true;
  if (!stateName) return false;
  const a = stateName.toLowerCase().trim();
  const b = queryState.toLowerCase().trim();
  if (a === b) return true;
  if (a.includes('arunachal') && b.includes('arunachal')) return true;
  return a.includes(b) || b.includes(a);
}

// ==========================================
// Centralized DemoDataManager Class
// ==========================================
class DemoDataManager {
  private isOfflineDetected = false;
  private changeListeners: Set<() => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      this.isOfflineDetected = getFromStorage(STORAGE_KEYS.OFFLINE_FLAG, false);
    }
  }

  // --- Offline Mode Detection & Notification ---
  public markBackendOffline(isOffline = true): void {
    if (this.isOfflineDetected !== isOffline) {
      this.isOfflineDetected = isOffline;
      setToStorage(STORAGE_KEYS.OFFLINE_FLAG, isOffline);
      this.notifyListeners();
    }
  }

  public isDemoModeActive(): boolean {
    if (process.env.NEXT_PUBLIC_DEMO_MODE === 'false') {
      return false;
    }
    if (typeof window === 'undefined') {
      return !!this.getActiveDemoUser() || process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
    }
    // Always active if backend was flagged offline, or if an active demo user exists
    return this.isOfflineDetected || !!this.getActiveDemoUser();
  }

  public subscribe(listener: () => void): () => void {
    this.changeListeners.add(listener);
    return () => this.changeListeners.delete(listener);
  }

  private notifyListeners(): void {
    this.changeListeners.forEach((fn) => {
      try {
        fn();
      } catch {
        // ignore listener errors
      }
    });
  }

  // --- Demo User & Session Management ---
  public getDemoUsersMap(): Record<string, User> {
    const customUsers = getFromStorage<Record<string, User>>(STORAGE_KEYS.USERS_MAP, {});
    return { ...SEED_DEMO_USERS, ...customUsers };
  }

  public getActiveDemoUser(): User | null {
    return getFromStorage<User | null>(STORAGE_KEYS.ACTIVE_USER, null);
  }

  public setActiveDemoUser(user: User | null): void {
    if (user) {
      setToStorage(STORAGE_KEYS.ACTIVE_USER, user);
      // Also update in users map
      const usersMap = this.getDemoUsersMap();
      usersMap[user.email.toLowerCase()] = user;
      setToStorage(STORAGE_KEYS.USERS_MAP, usersMap);
    } else {
      removeFromStorage(STORAGE_KEYS.ACTIVE_USER);
    }
    this.notifyListeners();
  }

  public findDemoUserByEmail(email: string): User | null {
    const normalized = email.trim().toLowerCase();
    const map = this.getDemoUsersMap();
    return map[normalized] || null;
  }

  public updateDemoProfile(payload: UpdateProfilePayload): User {
    const active = this.getActiveDemoUser() || SEED_DEMO_USERS['citizen@terra360.in'];
    const updated: User = {
      ...active,
      name: payload.name !== undefined ? payload.name : active.name,
      phone: payload.phone !== undefined ? payload.phone : active.phone,
      language: payload.language !== undefined ? payload.language : active.language,
      village: payload.village !== undefined ? payload.village : active.village,
      familyContacts:
        payload.familyContacts !== undefined ? payload.familyContacts : active.familyContacts,
      alertPreferences:
        payload.alertPreferences !== undefined ? payload.alertPreferences : active.alertPreferences,
    };

    this.setActiveDemoUser(updated);
    return updated;
  }

  public changeDemoPassword(_payload: ChangePasswordPayload): { message: string } {
    void _payload;
    return { message: 'Password has been updated successfully (Demo Storage).' };
  }

  public getDemoSessions(): UserSession[] {
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'Mozilla/5.0';
    return [
      {
        id: 'session-demo-current',
        userAgent,
        ip: '127.0.0.1 (Local Workstation)',
        expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
        createdAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
        isCurrent: true,
      },
    ];
  }

  public revokeDemoSession(_sessionId: string): { message: string } {
    void _sessionId;
    return { message: 'Session revoked successfully (Demo Mode).' };
  }

  public exportDemoData(): UserExportData {
    const active = this.getActiveDemoUser() || SEED_DEMO_USERS['citizen@terra360.in'];
    const myReports = this.getMyDemoReports(active._id);
    return {
      exportedAt: new Date().toISOString(),
      account: {
        id: active._id,
        name: active.name,
        email: active.email,
        role: active.role,
        phone: active.phone || null,
        language: active.language || 'en',
        emailVerified: !!active.emailVerified,
        village: active.village || null,
        familyContacts: active.familyContacts || [],
        alertPreferences: active.alertPreferences,
        createdAt: active.createdAt || new Date().toISOString(),
        updatedAt: active.updatedAt || new Date().toISOString(),
      },
      reports: myReports as unknown as Array<Record<string, unknown>>,
    };
  }

  public deleteDemoAccount(): { message: string } {
    this.setActiveDemoUser(null);
    return { message: 'Account deactivated and session cleared.' };
  }

  // --- Hazard Reports Management ---
  public getDemoReports(): HazardReportOutput[] {
    return getFromStorage<HazardReportOutput[]>(STORAGE_KEYS.REPORTS, SEED_DEMO_REPORTS);
  }

  public getMyDemoReports(userIdOrEmail?: string): HazardReportOutput[] {
    const all = this.getDemoReports();
    const active = this.getActiveDemoUser();
    const targetName = active?.name?.toLowerCase();
    const targetPhone = active?.phone;

    return all.filter((r) => {
      if (userIdOrEmail && r.reportId === userIdOrEmail) return true;
      if (targetPhone && r.reporterPhone === targetPhone) return true;
      if (targetName && r.reporterName?.toLowerCase() === targetName) return true;
      return false;
    });
  }

  public addDemoReport(payload: CreateHazardReportPayload): HazardReportOutput {
    const reports = this.getDemoReports();
    const active = this.getActiveDemoUser();

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const newReport: HazardReportOutput = {
      reportId: `TR-2026-${randomSuffix}`,
      state: payload.state,
      location: payload.location,
      hazardType: payload.hazardType,
      severity: payload.severity || 'Warning',
      description: payload.description,
      reporterName: payload.reporterName || active?.name || 'Local Citizen',
      reporterPhone: payload.reporterPhone || active?.phone || '+91 94360 00000',
      photoUrl: payload.photoUrl,
      coordinates: payload.coordinates,
      status: 'submitted',
      source: active?.role || 'citizen',
      createdAt: new Date().toISOString(),
    };

    const updated = [newReport, ...reports];
    setToStorage(STORAGE_KEYS.REPORTS, updated);
    this.notifyListeners();
    return newReport;
  }

  public filterReports(query?: {
    state?: string;
    status?: string;
    limit?: number;
  }): HazardReportOutput[] {
    let result = this.getDemoReports();
    if (query?.state && query.state !== 'All' && query.state !== 'All States') {
      result = result.filter((r) => r.state.toLowerCase() === query.state!.toLowerCase());
    }
    if (query?.status && query.status !== 'All') {
      result = result.filter((r) => r.status.toLowerCase() === query.status!.toLowerCase());
    }
    if (query?.limit && query.limit > 0) {
      result = result.slice(0, query.limit);
    }
    return result;
  }

  // --- Alerts Management ---
  public getDemoAlerts(): PublicAlertItem[] {
    return getFromStorage<PublicAlertItem[]>(STORAGE_KEYS.ALERTS, SEED_DEMO_ALERTS);
  }

  public filterAlerts(query?: {
    state?: string;
    severity?: string;
    page?: number;
    limit?: number;
  }): PublicAlertsResponse {
    let list = this.getDemoAlerts();

    if (query?.state) {
      list = list.filter((a) => matchesStateQuery(a.state, query.state));
    }
    if (query?.severity && query.severity !== 'All') {
      list = list.filter((a) => a.severity.toLowerCase() === query.severity!.toLowerCase());
    }

    const total = list.length;
    const page = query?.page || 1;
    const limit = query?.limit || 20;
    const startIndex = (page - 1) * limit;
    const paginated = list.slice(startIndex, startIndex + limit);

    return {
      alerts: paginated,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  // --- Roads Management ---
  public getDemoRoads(): PublicRoadStatusItem[] {
    return getFromStorage<PublicRoadStatusItem[]>(STORAGE_KEYS.ROADS, SEED_DEMO_ROADS);
  }

  public filterRoads(query?: { state?: string; status?: string }): PublicRoadStatusItem[] {
    let list = this.getDemoRoads();
    if (query?.state) {
      list = list.filter((r) => matchesStateQuery(r.state, query.state));
    }
    if (query?.status && query.status !== 'All') {
      list = list.filter((r) => r.status.toLowerCase() === query.status!.toLowerCase());
    }
    return list;
  }

  // --- Risk Map Management ---
  public getDemoRiskMap(query?: { state?: string }): PublicRiskMapItem[] {
    let list = SEED_DEMO_RISK_MAP;
    if (query?.state) {
      list = list.filter((item) => matchesStateQuery(item.state, query.state));
    }
    return list;
  }

  // --- Stats Computation ---
  public getDemoStats(): PublicStats {
    const alerts = this.getDemoAlerts();
    const roads = this.getDemoRoads();
    const reports = this.getDemoReports();

    return {
      publishedAlerts: alerts.length,
      criticalAlerts: alerts.filter((a) => a.severity === 'Critical').length,
      blockedRoads: roads.filter((r) => r.status === 'blocked').length,
      roadsUnderCaution: roads.filter((r) => r.status === 'caution').length,
      openRoads: roads.filter((r) => r.status === 'open').length,
      totalMonitoredCorridors: roads.length,
      communityReportsSubmitted: reports.length,
      lastUpdated: new Date().toISOString(),
    };
  }

  // --- Contact Submissions ---
  public addDemoContact(payload: CreateContactPayload): { contact: ContactOutput; message: string } {
    const contacts = getFromStorage<ContactOutput[]>(STORAGE_KEYS.CONTACTS, []);
    const newContact: ContactOutput = {
      id: `cnt-${Date.now()}`,
      name: payload.name,
      email: payload.email,
      state: payload.state,
      message: payload.message,
      phone: payload.phone,
      status: 'received',
      createdAt: new Date().toISOString(),
    };

    setToStorage(STORAGE_KEYS.CONTACTS, [newContact, ...contacts]);
    return {
      contact: newContact,
      message: 'Your inquiry has been recorded locally in Development Mode. Thank you.',
    };
  }
}

// Global Singleton Instance
export const demoDataManager = new DemoDataManager();
