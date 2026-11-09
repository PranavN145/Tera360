/**
 * Shared Village & Settlement Reference Data
 * Single source of truth for both Officer Command and Citizen Community Portals.
 */

export interface VillageContactPerson {
  name: string;
  phone: string;
  designation: string;
}

export interface VillageSafeShelter {
  name: string;
  capacity: number;
  distanceKm: number;
}

export interface VillageItem {
  id: string;
  name: string;
  district: string;
  state: string;
  currentRiskLevel: "Critical" | "High" | "Moderate" | "Low";
  populationEstimate: number;
  contactPerson: VillageContactPerson;
  safeShelter: VillageSafeShelter;
  lastRainfall: string;
}

export const DEMO_VILLAGES: VillageItem[] = [
  {
    id: "VIL-01",
    name: "Phesama",
    district: "Kohima",
    state: "Nagaland",
    currentRiskLevel: "Critical",
    populationEstimate: 3400,
    contactPerson: {
      name: "Toshitsungba Jamir",
      phone: "+91 98621 11204",
      designation: "Village Disaster Committee Head",
    },
    safeShelter: {
      name: "Phesama Community Hall (High Ground)",
      capacity: 450,
      distanceKm: 0.8,
    },
    lastRainfall: "164 mm / 24h",
  },
  {
    id: "VIL-02",
    name: "Jatinga",
    district: "Dima Hasao",
    state: "Assam",
    currentRiskLevel: "Moderate",
    populationEstimate: 2100,
    contactPerson: {
      name: "Debojit Hojai",
      phone: "+91 94350 78201",
      designation: "Gaon Burah (Village Elder)",
    },
    safeShelter: {
      name: "Jatinga High Secondary School Shelter",
      capacity: 320,
      distanceKm: 1.2,
    },
    lastRainfall: "62 mm / 24h",
  },
  {
    id: "VIL-03",
    name: "Melli Bazaar",
    district: "South Sikkim",
    state: "Sikkim",
    currentRiskLevel: "High",
    populationEstimate: 4200,
    contactPerson: {
      name: "Pemba Bhutia",
      phone: "+91 97330 45109",
      designation: "Panchayat Disaster Coordinator",
    },
    safeShelter: {
      name: "Melli Indoor Sports Complex",
      capacity: 600,
      distanceKm: 1.5,
    },
    lastRainfall: "112 mm / 24h",
  },
  {
    id: "VIL-04",
    name: "Cherrapunji (Sohra Outskirts)",
    district: "East Khasi Hills",
    state: "Meghalaya",
    currentRiskLevel: "Moderate",
    populationEstimate: 5100,
    contactPerson: {
      name: "Bah Kynmaw Lyndem",
      phone: "+91 98560 33219",
      designation: "Headman (Rangbah Shnong)",
    },
    safeShelter: {
      name: "Sohra Presbyterian Higher Secondary Hall",
      capacity: 500,
      distanceKm: 0.6,
    },
    lastRainfall: "84 mm / 24h",
  },
];

export function getAllVillages(): VillageItem[] {
  return DEMO_VILLAGES;
}

export function getVillageByName(name?: string): VillageItem | undefined {
  if (!name) return undefined;
  return DEMO_VILLAGES.find(
    (v) => v.name.toLowerCase().trim() === name.toLowerCase().trim()
  );
}

export function getVillagesByState(state?: string): VillageItem[] {
  if (!state || state === "All") return DEMO_VILLAGES;
  return DEMO_VILLAGES.filter(
    (v) => v.state.toLowerCase().trim() === state.toLowerCase().trim()
  );
}

export function getUniqueStates(): string[] {
  return Array.from(new Set(DEMO_VILLAGES.map((v) => v.state)));
}

