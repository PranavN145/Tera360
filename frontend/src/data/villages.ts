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
  address?: string;
  status?: "Operational" | "Staging Ready" | "Standby" | string;
  helpline?: string;
  amenities?: string[];
  coordinates?: [number, number]; // [longitude, latitude]
  walkingDirections?: string;
  drivingDirections?: string;
}

export interface VerifiedShelterItem {
  id: string;
  name: string;
  villageName?: string;
  district: string;
  state: string;
  address: string;
  capacity: number;
  distanceKm?: number;
  status: "Operational" | "Staging Ready" | "Standby" | string;
  contactPerson?: VillageContactPerson;
  helpline: string;
  amenities: string[];
  coordinates?: [number, number]; // [longitude, latitude]
  walkingDirections?: string;
  drivingDirections?: string;
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
      address: "Upper Phesama Sector A, Ridge Line, Kohima District",
      status: "Operational",
      helpline: "+91 98621 11204",
      amenities: ["Drinking Water Storage", "Emergency Solar Backup", "First Aid Station", "Satellite Phone Link"],
      coordinates: [94.11, 25.64],
      walkingDirections: "Proceed uphill past the Baptist Church toward Upper Phesama Ridge. Follow marked yellow evacuation ribbons away from stream gullies.",
      drivingDirections: "Ascend via NH-29 bypass link road to upper community ground. Avoid lower mud cut during active rainfall.",
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
      address: "Station Road High Ridge, Jatinga, Dima Hasao",
      status: "Operational",
      helpline: "+91 94350 78201",
      amenities: ["Covered Dormitory Hall", "Dry Ration Reserves", "Paramedic Kit", "Rainwater Harvesting Tank"],
      coordinates: [93.04, 25.12],
      walkingDirections: "Ascend via the paved North-East pathway toward Station Ridge. Do not use the railway cutting track during downpours.",
      drivingDirections: "Follow the paved ridge access road from Jatinga Junction. Low clearance vehicles should park at base staging.",
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
      address: "Melli-Nayabazar Bypass Ridge, South Sikkim",
      status: "Operational",
      helpline: "+91 97330 45109",
      amenities: ["High Elevation Concrete Structure", "Medical Post", "Generator Backup", "Radio VHF Base"],
      coordinates: [88.46, 27.09],
      walkingDirections: "Follow elevated bypass trail away from the Teesta river bed toward the hilltop sporting complex.",
      drivingDirections: "Use the reinforced concrete bypass road to the sports complex. Riverfront road is prohibited during landslide alert.",
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
      address: "Sohra Outskirts Stable Bedrock Zone, East Khasi Hills",
      status: "Operational",
      helpline: "+91 98560 33219",
      amenities: ["Reinforced Stone Masonry", "Filtered Water Reservoirs", "Community Kitchen", "Emergency Generator"],
      coordinates: [91.73, 25.27],
      walkingDirections: "Take the Upper Sohra market bypass trail directly to the campus gate on the solid sandstone plateau.",
      drivingDirections: "Direct access via Sohra-Shella arterial link onto the high plateau. Road remains open during monsoon.",
    },
    lastRainfall: "84 mm / 24h",
  },
];

export const REGIONAL_CIVIL_DEFENSE_SHELTERS: VerifiedShelterItem[] = [
  {
    id: "CD-01",
    name: "Kohima Local Ground Community Hall",
    district: "Kohima",
    state: "Nagaland",
    address: "Khuochiezie, Midlane Kohima, Nagaland",
    capacity: 600,
    status: "Operational",
    helpline: "+91 370 2290022",
    amenities: ["Food Reserves", "First Aid Kit", "Thermal Blankets", "Satellite Comms"],
    coordinates: [94.10, 25.67],
    walkingDirections: "Follow municipal evacuation signs toward Khuochiezie central sports complex.",
    drivingDirections: "Access from NH-29 main artery via TCP Gate to Local Ground parking area.",
  },
  {
    id: "CD-02",
    name: "Haflong District Sports Complex Shelter",
    district: "Dima Hasao",
    state: "Assam",
    address: "Upper Haflong Ridge (Elevation 960m), Assam",
    capacity: 450,
    status: "Operational",
    helpline: "+91 3673 236222",
    amenities: ["Emergency Power", "Potable Water", "Medical Staging", "Satellite Comms"],
    coordinates: [93.02, 25.18],
    walkingDirections: "Ascend via the Circuit House ridge path to the sports stadium summit.",
    drivingDirections: "Use Haflong hill circular road. Heavy vehicles must stage at lower gate.",
  },
  {
    id: "CD-03",
    name: "Rangpo Community Relief Shelter",
    district: "Pakyong",
    state: "Sikkim",
    address: "Mining Ground Sector, High Bank, Rangpo, Sikkim",
    capacity: 350,
    status: "Operational",
    helpline: "+91 3592 202111",
    amenities: ["Emergency Rations", "Water Tankers", "Paramedic Post", "Power Backup"],
    coordinates: [88.53, 27.18],
    walkingDirections: "Cross via the elevated footbridge to Mining Ground plateau away from flood boundary.",
    drivingDirections: "NH-10 Rangpo checkpoint detour onto upper staging terrace.",
  },
  {
    id: "CD-04",
    name: "Shillong Civil Defense Evacuation Center",
    district: "East Khasi Hills",
    state: "Meghalaya",
    address: "Laban Sports Club Compound, Shillong, Meghalaya",
    capacity: 500,
    status: "Operational",
    helpline: "+91 364 2225289",
    amenities: ["Generator Backup", "Thermal Blankets", "Child Care Facility", "Mobile Clinic"],
    coordinates: [91.87, 25.56],
    walkingDirections: "Follow Laban central avenue to the sports club complex entrance.",
    drivingDirections: "Approach via Howell Road from Police Point. Traffic police manage one-way evacuation flow.",
  },
];

export function getAllVerifiedShelters(): VerifiedShelterItem[] {
  // Combine village safe shelters and regional civil defense shelters into unified verified directory
  const villageShelters: VerifiedShelterItem[] = DEMO_VILLAGES.map((v) => ({
    id: `VS-${v.id}`,
    name: v.safeShelter.name,
    villageName: v.name,
    district: v.district,
    state: v.state,
    address: v.safeShelter.address || `${v.name} Village High Ridge, ${v.district}`,
    capacity: v.safeShelter.capacity,
    distanceKm: v.safeShelter.distanceKm,
    status: v.safeShelter.status || "Operational",
    contactPerson: v.contactPerson,
    helpline: v.safeShelter.helpline || v.contactPerson.phone,
    amenities: v.safeShelter.amenities || ["Drinking Water", "First Aid", "Covered Hall"],
    coordinates: v.safeShelter.coordinates,
    walkingDirections: v.safeShelter.walkingDirections,
    drivingDirections: v.safeShelter.drivingDirections,
  }));

  return [...villageShelters, ...REGIONAL_CIVIL_DEFENSE_SHELTERS];
}

export function getShelterForVillage(villageName?: string): VerifiedShelterItem | undefined {
  if (!villageName) return undefined;
  const all = getAllVerifiedShelters();
  return all.find(
    (s) => s.villageName?.toLowerCase().trim() === villageName.toLowerCase().trim()
  );
}

export function getSheltersByState(state?: string): VerifiedShelterItem[] {
  const all = getAllVerifiedShelters();
  if (!state || state === "All" || state === "All States") return all;
  return all.filter((s) => s.state.toLowerCase().trim() === state.toLowerCase().trim());
}

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

