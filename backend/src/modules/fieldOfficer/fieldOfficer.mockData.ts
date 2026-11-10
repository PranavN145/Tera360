/**
 * Terra360 Field Officer Portal - Mock Data
 * Seed data for inspection tasks, spatial boundaries, road status, villager reports, and sector alerts.
 */

export interface FieldOfficerProfile {
  id: string;
  name: string;
  department: string;
  assignedArea: string;
  sectorCode: string;
  phone: string;
  language: string;
  activeDutyStatus: boolean;
  badgeNumber: string;
  jurisdictionVillages: string[];
  jurisdictionRoads: string[];
  postLocation: {
    name: string;
    coordinates: [number, number]; // [lng, lat]
  };
}

export type TaskRiskLevel = 'Low' | 'Moderate' | 'High' | 'Critical';
export type TaskStatus = 'Assigned' | 'In_Progress' | 'Completed' | 'Escalated';

export interface FieldOfficerTask {
  id: string;
  sector: string;
  location: {
    coordinates: [number, number]; // [lng, lat]
    chainageName: string;
    landmark?: string;
  };
  riskLevel: TaskRiskLevel;
  reason: string;
  deadline: string;
  status: TaskStatus;
  assignedBy: string;
  assignedAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
  completionNotes?: string | null;
  escalatedAt?: string | null;
  escalationReason?: string | null;
  escalationPriority?: string | null;
}

export type VillagerReportStatus = 'Pending' | 'Verified' | 'Rejected' | 'Escalated';

export interface VillagerReportItem {
  id: string;
  sector: string;
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

export type RoadCondition = 'Open' | 'Caution' | 'Partially Blocked' | 'Blocked';

export interface RoadStatusSegment {
  roadSegmentId: string;
  stretchName: string;
  condition: RoadCondition;
  reason: string;
  photoUrl?: string | null;
  timestamp: string;
  updatedBy: string;
  sector: string;
}

export type AlertSeverityLevel = 'Advisory' | 'Warning' | 'Critical';

export interface SectorAlertItem {
  id: string;
  severity: AlertSeverityLevel;
  title: string;
  instructions: string;
  createdAt: string;
  acknowledged: boolean;
  acknowledgedAt?: string | null;
  acknowledgedBy?: string | null;
  targetSector: string;
}

export const INITIAL_OFFICER_PROFILE: FieldOfficerProfile = {
  id: 'fo-nh29-042',
  name: 'Temsu Jamir',
  department: 'Nagaland State Disaster Management Authority (NSDMA) - Field Inspection Unit',
  assignedArea: 'Sector 4 - Kohima-Phesama NH-29 Corridor',
  sectorCode: 'SEC-4',
  phone: '+91 98765 00003',
  language: 'en',
  activeDutyStatus: true,
  badgeNumber: 'NSDMA-FO-2024-042',
  jurisdictionVillages: ['Phesama', 'Dzüdza', 'Jotsoma', 'Khonoma'],
  jurisdictionRoads: ['NH-29 (KM 38 to KM 52)', 'SH-6 (Kohima-Khonoma Heritage Link)'],
  postLocation: {
    name: 'Kohima South Emergency Post',
    coordinates: [94.032, 25.678],
  },
};

export const INITIAL_TASKS: FieldOfficerTask[] = [
  {
    id: 'TSK-NH29-001',
    sector: 'Sector 4 - Kohima-Phesama NH-29 Corridor',
    location: {
      coordinates: [94.025, 25.685],
      chainageName: 'NH-29 KM 42+300 (Dzüdza Bridge Approach)',
      landmark: 'Near Dzüdza Bridge slope shoulder',
    },
    riskLevel: 'Critical',
    reason: 'Active slope deformation and tensile ground cracks extending across 35m of mountain slope after continuous monsoon precipitation.',
    deadline: new Date(Date.now() + 86400000).toISOString(),
    status: 'In_Progress',
    assignedBy: 'Vikram Sharma (Central Disaster Officer)',
    assignedAt: new Date(Date.now() - 7200000).toISOString(),
    startedAt: new Date(Date.now() - 3600000).toISOString(),
    completedAt: null,
    completionNotes: null,
    escalatedAt: null,
    escalationReason: null,
    escalationPriority: null,
  },
  {
    id: 'TSK-NH29-002',
    sector: 'Sector 4 - Kohima-Phesama NH-29 Corridor',
    location: {
      coordinates: [94.041, 25.662],
      chainageName: 'NH-29 KM 48+800 (Phesama Hillside Cut)',
      landmark: 'Above highway drainage culvert C-14',
    },
    riskLevel: 'High',
    reason: 'Rockfall trajectory assessment required; loose basalt boulders perched on upper berm above highway culvert.',
    deadline: new Date(Date.now() + 172800000).toISOString(),
    status: 'Assigned',
    assignedBy: 'Vikram Sharma (Central Disaster Officer)',
    assignedAt: new Date(Date.now() - 3600000).toISOString(),
    startedAt: null,
    completedAt: null,
    completionNotes: null,
    escalatedAt: null,
    escalationReason: null,
    escalationPriority: null,
  },
  {
    id: 'TSK-NH29-003',
    sector: 'Sector 4 - Kohima-Phesama NH-29 Corridor',
    location: {
      coordinates: [94.015, 25.698],
      chainageName: 'SH-6 KM 6+200 (Jotsoma Bypass)',
      landmark: 'Near Jotsoma community reservoir',
    },
    riskLevel: 'Moderate',
    reason: 'Culvert inlet siltation causing minor water ponding on road shoulder; inspect drainage channel after flash flood warning.',
    deadline: new Date(Date.now() - 10000000).toISOString(),
    status: 'Completed',
    assignedBy: 'Vikram Sharma (Central Disaster Officer)',
    assignedAt: new Date(Date.now() - 86400000).toISOString(),
    startedAt: new Date(Date.now() - 72000000).toISOString(),
    completedAt: new Date(Date.now() - 50000000).toISOString(),
    completionNotes: 'Debris cleared by local PWD road gang. Water flowing freely through 900mm culvert. No structural subsidence detected.',
    escalatedAt: null,
    escalationReason: null,
    escalationPriority: null,
  },
];

export const INITIAL_REPORTS: VillagerReportItem[] = [
  {
    id: 'VREP-2026-104',
    sector: 'Sector 4 - Kohima-Phesama NH-29 Corridor',
    villagerName: 'Keviletuo Angami',
    contact: '+91 98160 54321',
    timestamp: new Date(Date.now() - 14400000).toISOString(),
    coordinates: [94.027, 25.683],
    locationDescription: '150 meters downhill from Dzüdza primary school terrace, near power pylon 14',
    hazardType: 'Mudflow & Silt Runoff',
    photoUrl: 'https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=800&q=80',
    status: 'Pending',
    fieldNotes: null,
    inspectorPhotoUrl: null,
    verifiedAt: null,
    verifiedBy: null,
    rejectionReason: null,
    rejectedAt: null,
    rejectedBy: null,
    escalationMetadata: null,
  },
  {
    id: 'VREP-2026-105',
    sector: 'Sector 4 - Kohima-Phesama NH-29 Corridor',
    villagerName: 'Vitsonuo Suokhrie',
    contact: '+91 98765 88990',
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    coordinates: [94.039, 25.665],
    locationDescription: 'Phesama agricultural terrace border, noticeable 4-inch crack on retaining wall',
    hazardType: 'Slope Fissure',
    photoUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
    status: 'Pending',
    fieldNotes: null,
    inspectorPhotoUrl: null,
    verifiedAt: null,
    verifiedBy: null,
    rejectionReason: null,
    rejectedAt: null,
    rejectedBy: null,
    escalationMetadata: null,
  },
  {
    id: 'VREP-2026-098',
    sector: 'Sector 4 - Kohima-Phesama NH-29 Corridor',
    villagerName: 'Neisalhou Solo',
    contact: '+91 98765 44332',
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    coordinates: [94.018, 25.695],
    locationDescription: 'Jotsoma stream junction road culvert overflow',
    hazardType: 'Blocked Culvert',
    photoUrl: 'https://images.unsplash.com/photo-1508873696983-2df5703bc2e0?auto=format&fit=crop&w=800&q=80',
    status: 'Verified',
    fieldNotes: 'Inspected and verified. Culvert throat choked with branches and shale gravel. Assigned to maintenance team.',
    inspectorPhotoUrl: 'https://images.unsplash.com/photo-1584467735871-8e85353a8413?auto=format&fit=crop&w=800&q=80',
    verifiedAt: new Date(Date.now() - 72000000).toISOString(),
    verifiedBy: 'Temsu Jamir',
    rejectionReason: null,
    rejectedAt: null,
    rejectedBy: null,
    escalationMetadata: null,
  },
];

export const INITIAL_ROAD_STATUSES: RoadStatusSegment[] = [
  {
    roadSegmentId: 'ROAD-NH29-S4',
    stretchName: 'NH-29 KM 38 to KM 52 (Phesama – Dzüdza)',
    condition: 'Partially Blocked',
    reason: 'Single lane operation due to minor landslide mud deposit at KM 42+300. Earthmovers working on outer lane.',
    photoUrl: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?auto=format&fit=crop&w=800&q=80',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    updatedBy: 'Temsu Jamir (Field Officer)',
    sector: 'Sector 4 - Kohima-Phesama NH-29 Corridor',
  },
  {
    roadSegmentId: 'ROAD-SH6-S4',
    stretchName: 'SH-6 KM 0 to KM 15 (Kohima to Khonoma Heritage Route)',
    condition: 'Open',
    reason: 'Normal mountain transit operational; road surface clear with standard wet pavement precautions.',
    photoUrl: null,
    timestamp: new Date(Date.now() - 14400000).toISOString(),
    updatedBy: 'Temsu Jamir (Field Officer)',
    sector: 'Sector 4 - Kohima-Phesama NH-29 Corridor',
  },
  {
    roadSegmentId: 'ROAD-NH29-S5',
    stretchName: 'NH-29 KM 52 to KM 68 (Mao Gate Border Section)',
    condition: 'Caution',
    reason: 'Dense fog and intermittent falling pebbles reported near KM 57.',
    photoUrl: null,
    timestamp: new Date(Date.now() - 10800000).toISOString(),
    updatedBy: 'K. Angami (Field Officer)',
    sector: 'Sector 5 - Mao Gate Border',
  },
];

export const INITIAL_ALERTS: SectorAlertItem[] = [
  {
    id: 'ALT-SEC4-2026-01',
    severity: 'Critical',
    title: 'Red Alert: Imminent Mass Movement Warning - Dzüdza Escarpment',
    instructions: '1. Immediately erect diversion barriers at KM 39 check-post.\n2. Reroute heavy freight via SH-6 bypass.\n3. Verify all villager dwellings within 300m downslope radius.\n4. Maintain radio contact with Central Disaster Desk on Channel 4.',
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    acknowledged: false,
    acknowledgedAt: null,
    acknowledgedBy: null,
    targetSector: 'Sector 4 - Kohima-Phesama NH-29 Corridor',
  },
  {
    id: 'ALT-SEC4-2026-02',
    severity: 'Warning',
    title: 'High Rainfall Threshold Exceeded: Phesama Catchment (>120mm/24h)',
    instructions: 'Conduct foot reconnaissance of weep holes along highway retaining walls between KM 47 and KM 50. Report any hydrostatic pressure bulging.',
    createdAt: new Date(Date.now() - 18000000).toISOString(),
    acknowledged: true,
    acknowledgedAt: new Date(Date.now() - 17000000).toISOString(),
    acknowledgedBy: 'fo-nh29-042',
    targetSector: 'Sector 4 - Kohima-Phesama NH-29 Corridor',
  },
  {
    id: 'ALT-SEC4-2026-03',
    severity: 'Advisory',
    title: 'Night Travel Advisory: Heavy Fog and Wet Road Slippage',
    instructions: 'Ensure emergency beacon lights operational at KM 44 curve checkpoint. Advise passenger vehicles to slow below 25 km/h.',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    acknowledged: true,
    acknowledgedAt: new Date(Date.now() - 85000000).toISOString(),
    acknowledgedBy: 'fo-nh29-042',
    targetSector: 'Sector 4 - Kohima-Phesama NH-29 Corridor',
  },
];

