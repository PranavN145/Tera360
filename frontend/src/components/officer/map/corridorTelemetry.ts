import { corridorRoutes, rescueRoute, STATE_PRESETS } from "@/data/mockLandslideData";
import { RiskMapHotspot } from "@/components/RiskMap";
import { AlertDraftData } from "@/components/officer/alerts/AlertReviewModal";
import { PublicAlertItem, PublicRiskMapItem } from "@/types/public";

export const NORTHEAST_STATES = [
  "All States",
  "Assam",
  "Nagaland",
  "Sikkim",
  "Meghalaya",
  "Arunachal Pradesh",
  "Manipur",
  "Mizoram",
  "Tripura",
] as const;

export function parseCoordinatesText(text?: string | null): [number, number] | null {
  if (!text) return null;
  const match = text.match(
    /(-?\d+(?:\.\d+)?)\s*°?\s*([NS])?[,\s]+(-?\d+(?:\.\d+)?)\s*°?\s*([EW])?/i
  );
  if (!match) return null;
  let lat = parseFloat(match[1]);
  let lng = parseFloat(match[3]);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  if (match[2]?.toUpperCase() === "S") lat = -Math.abs(lat);
  if (match[4]?.toUpperCase() === "W") lng = -Math.abs(lng);
  return [lng, lat];
}

export function resolveCorridorLineCoordinates(
  corridor: PublicRiskMapItem
): [number, number][] | undefined {
  const geom = corridor.geometry;
  if (
    geom?.type === "LineString" &&
    Array.isArray(geom.coordinates) &&
    geom.coordinates.length >= 2
  ) {
    return geom.coordinates as [number, number][];
  }
  return undefined;
}

export function resolveCorridorCoordinates(
  corridor: PublicRiskMapItem,
  matchedAlert?: PublicAlertItem | null
): [number, number] {
  const geom = corridor.geometry;
  if (
    geom?.type === "Point" &&
    Array.isArray(geom.coordinates) &&
    geom.coordinates.length >= 2
  ) {
    const [lng, lat] = geom.coordinates;
    if (typeof lng === "number" && typeof lat === "number") return [lng, lat];
  }
  if (
    geom?.type === "LineString" &&
    Array.isArray(geom.coordinates) &&
    geom.coordinates.length > 0
  ) {
    const mid = geom.coordinates[Math.floor(geom.coordinates.length / 2)];
    if (Array.isArray(mid) && mid.length >= 2) return [mid[0], mid[1]];
  }

  const parsedFromRoad = parseCoordinatesText(corridor.coordinatesText);
  if (parsedFromRoad) return parsedFromRoad;

  if (
    matchedAlert?.coordinates?.type === "Point" &&
    Array.isArray(matchedAlert.coordinates.coordinates) &&
    matchedAlert.coordinates.coordinates.length >= 2
  ) {
    const [lng, lat] = matchedAlert.coordinates.coordinates;
    if (typeof lng === "number" && typeof lat === "number") return [lng, lat];
  }

  const parsedFromAlert = parseCoordinatesText(matchedAlert?.coordinatesText);
  if (parsedFromAlert) return parsedFromAlert;

  const codeUpper = (corridor.code || "").trim().toUpperCase();
  const routeFeature = corridorRoutes.features.find(
    (f) => String(f.properties?.corridor || "").toUpperCase() === codeUpper
  );
  if (routeFeature?.geometry?.coordinates?.length) {
    const coords = routeFeature.geometry.coordinates;
    const mid = coords[Math.floor(coords.length / 2)];
    if (Array.isArray(mid) && mid.length >= 2) return [mid[0], mid[1]];
  }

  const stateKey = Object.keys(STATE_PRESETS).find(
    (k) => k.toLowerCase() === (corridor.state || "").trim().toLowerCase()
  );
  if (stateKey) {
    return STATE_PRESETS[stateKey as keyof typeof STATE_PRESETS].center as [number, number];
  }

  return [92.93, 25.8];
}

export function formatCoordinatesDisplay(
  corridor: PublicRiskMapItem,
  matchedAlert?: PublicAlertItem | null
): string | null {
  if (corridor.coordinatesText && corridor.coordinatesText.trim()) {
    return corridor.coordinatesText.trim();
  }
  if (matchedAlert?.coordinatesText && matchedAlert.coordinatesText.trim()) {
    return matchedAlert.coordinatesText.trim();
  }
  const geom = corridor.geometry;
  if (
    geom?.type === "Point" &&
    Array.isArray(geom.coordinates) &&
    geom.coordinates.length >= 2
  ) {
    const [lng, lat] = geom.coordinates;
    if (typeof lng === "number" && typeof lat === "number") {
      return `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? "N" : "S"}, ${Math.abs(lng).toFixed(4)}° ${lng >= 0 ? "E" : "W"}`;
    }
  }
  return null;
}

const ALERT_SEVERITY_RANK: Record<string, number> = {
  critical: 0,
  warning: 1,
  watch: 2,
};

export function matchAlertForCorridor(
  corridor: PublicRiskMapItem | null,
  alerts: PublicAlertItem[]
): PublicAlertItem | null {
  if (!corridor || alerts.length === 0) return null;
  const codeLower = (corridor.code || "").trim().toLowerCase();
  const stateLower = (corridor.state || "").trim().toLowerCase();

  const matches = alerts.filter((a) => {
    const alertCode = (a.corridor || "").trim().toLowerCase();
    if (codeLower && alertCode === codeLower) return true;
    if (codeLower && alertCode.includes(codeLower)) return true;
    return false;
  });

  if (matches.length === 0) return null;

  return [...matches].sort((a, b) => {
    const aStateMatch = (a.state || "").toLowerCase() === stateLower ? 0 : 1;
    const bStateMatch = (b.state || "").toLowerCase() === stateLower ? 0 : 1;
    if (aStateMatch !== bStateMatch) return aStateMatch - bStateMatch;

    const aRank = ALERT_SEVERITY_RANK[(a.severity || "").toLowerCase()] ?? 3;
    const bRank = ALERT_SEVERITY_RANK[(b.severity || "").toLowerCase()] ?? 3;
    if (aRank !== bRank) return aRank - bRank;

    return (
      new Date(b.publishedAt || b.createdAt).getTime() -
      new Date(a.publishedAt || a.createdAt).getTime()
    );
  })[0];
}

export function classifyCorridorSeverity(
  corridor: PublicRiskMapItem,
  matchedAlert?: PublicAlertItem | null
): "Critical" | "Warning" | "Normal" {
  const risk = (corridor.riskLevel || "").trim().toLowerCase();
  const status = (corridor.status || "").trim().toLowerCase();
  const alertSev = (matchedAlert?.severity || "").trim().toLowerCase();

  if (risk === "critical" || status === "blocked") {
    return "Critical";
  }
  if (
    risk === "high" ||
    risk === "warning" ||
    status === "caution" ||
    status === "partial" ||
    alertSev === "critical" ||
    alertSev === "warning"
  ) {
    return "Warning";
  }
  return "Normal";
}

export function corridorToHotspot(
  corridor: PublicRiskMapItem,
  matchedAlert?: PublicAlertItem | null
): RiskMapHotspot {
  const severity = classifyCorridorSeverity(corridor, matchedAlert);
  const coordinates = resolveCorridorCoordinates(corridor, matchedAlert);
  const routeCoordinates = resolveCorridorLineCoordinates(corridor);

  return {
    id: corridor.id,
    code: corridor.code,
    title: `${corridor.code} · ${corridor.name}`,
    region: `${corridor.stretch} (${corridor.state})`,
    state: corridor.state,
    severity,
    riskLevel: corridor.riskLevel || severity,
    status: corridor.status || "open",
    coordinates,
    routeCoordinates,
    rainfall24h: matchedAlert?.rainfall24h || null,
    statusReason: corridor.statusReason || matchedAlert?.description || null,
  };
}

export function getAlternateRouteSummary(
  corridor: PublicRiskMapItem | null,
  matchedAlert?: PublicAlertItem | null
): {
  statusLabel: string;
  isActive: boolean;
  description: string;
} {
  if (!corridor) {
    return {
      statusLabel: "STANDBY",
      isActive: false,
      description: "Select a corridor to inspect bypass availability.",
    };
  }

  const statusLower = (corridor.status || "").toLowerCase();
  const isDisrupted =
    statusLower === "blocked" || statusLower === "caution" || statusLower === "partial";

  if (matchedAlert?.trafficStatus) {
    return {
      statusLabel: isDisrupted ? "ACTIVE" : "NOMINAL",
      isActive: isDisrupted,
      description: matchedAlert.trafficStatus,
    };
  }

  const codeUpper = (corridor.code || "").trim().toUpperCase();
  const matchedRescue = rescueRoute.features.find((f) =>
    String(f.properties?.corridor || "").toUpperCase().includes(codeUpper)
  );
  if (matchedRescue && isDisrupted) {
    return {
      statusLabel: "ACTIVE",
      isActive: true,
      description: matchedRescue.properties?.name || "Emergency Bypass Active",
    };
  }

  if (isDisrupted) {
    return {
      statusLabel: "ADVISORY",
      isActive: true,
      description: "Diversion / regulated convoy guidance in effect.",
    };
  }

  return {
    statusLabel: "CLEAR",
    isActive: false,
    description: "Primary highway corridor open for standard transit.",
  };
}

export function formatAlertDraftFromCorridor(
  corridor: PublicRiskMapItem,
  matchedAlert?: PublicAlertItem | null
): AlertDraftData {
  const riskLower = (corridor.riskLevel || "").toLowerCase();
  const statusLower = (corridor.status || "").toLowerCase();

  let severity: "Critical" | "Warning" | "Watch" = "Watch";
  if (riskLower === "critical" || statusLower === "blocked") {
    severity = "Critical";
  } else if (
    riskLower === "high" ||
    riskLower === "warning" ||
    statusLower === "caution" ||
    statusLower === "partial"
  ) {
    severity = "Warning";
  }

  const title =
    severity === "Critical"
      ? `Critical Hazard & Road Closure Advisory on ${corridor.code} (${corridor.state})`
      : severity === "Warning"
      ? `Slope Instability & Restricted Transit Warning on ${corridor.code}`
      : `Geotechnical Monitoring Watch on ${corridor.code} (${corridor.state})`;

  const description =
    corridor.statusReason ||
    matchedAlert?.description ||
    `Active telemetry monitoring on ${corridor.code} (${corridor.name}) along ${corridor.stretch}. Current risk level assessed as ${corridor.riskLevel}.`;

  const advisory =
    matchedAlert?.advisory ||
    (severity === "Critical"
      ? `Avoid travel along ${corridor.code} (${corridor.stretch}). Follow traffic police and BRO diversion directives immediately.`
      : severity === "Warning"
      ? `Exercise extreme vigilance along ${corridor.stretch}. Heavy vehicles and night transit may be restricted.`
      : `Maintain safe speed limits along ${corridor.stretch} and report visible slope cracks or rockfall.`);

  const localizedText = `Official Landslide Alert [${severity}]: ${title} - Target: ${corridor.code} (${corridor.state}). ${description} Mandatory Advisory: ${advisory}`;

  return {
    severity,
    targetType: "corridor",
    state: corridor.state,
    targetLocation: `${corridor.code} - ${corridor.name}`,
    audiences: ["Villagers", "Drivers", "Field Teams"],
    channels: ["App Notification", "SMS"],
    title,
    locationDetails: corridor.stretch,
    description,
    advisory,
    localLanguage: "English",
    localizedText,
  };
}

export function formatSyncedTimestamp(isoDate?: string | null): string {
  if (!isoDate) return "Live";
  try {
    const d = new Date(isoDate);
    if (Number.isNaN(d.getTime())) return "Live";
    return d.toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "Live";
  }
}
