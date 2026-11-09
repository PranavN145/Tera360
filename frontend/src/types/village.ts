export type VillageRiskLevel = "Critical" | "High" | "Medium" | "Low";

export interface VillageContact {
  name: string;
  phone: string;
  designation: string;
}

export interface VillageShelter {
  id?: string;
  name: string;
  capacity?: number;
  distanceKm?: number;
  type?: string;
  status?: string;
  address?: string;
  amenities?: string[];
  helpline?: string;
}

export interface VillageEvacuationRoute {
  id?: string;
  name: string;
  corridor: string;
  bypassStretch?: string;
  status: "clear" | "caution" | "blocked" | "restricted" | "unknown";
  distanceKm?: number;
  estimatedTransitTime?: string;
  vehicleEligibility?: string;
  advisoryNote?: string;
  lastInspected?: string;
}

export interface VillageRiskEvent {
  date: string;
  level: VillageRiskLevel;
  trigger: string;
  source?: string;
}

export interface VillageItem {
  id: string;
  name: string;
  district: string;
  state: string;
  corridor: string;
  baseRiskLevel: VillageRiskLevel;
  currentRiskLevel: VillageRiskLevel;
  populationEstimate: number;
  householdsEstimate?: number;
  vulnerableGroups?: {
    elderlyChildrenPct?: number;
    notes?: string;
  };
  contactPerson?: VillageContact | null;
  safeShelter?: VillageShelter | null;
  evacuationRoute?: VillageEvacuationRoute | null;
  riskHistory?: VillageRiskEvent[];
  lastRainfall?: string;
  coordinatesText?: string;
}

export interface VillageOverviewMetrics {
  totalMonitored: number;
  highRiskCount: number;
  populationAtRisk: number;
  villagesWithActiveAlerts: number;
}
