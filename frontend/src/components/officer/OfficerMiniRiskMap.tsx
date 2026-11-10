"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type mapboxgl from "mapbox-gl";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  CloudRain,
  Info,
  Layers,
  LocateFixed,
  Map as MapIcon,
  MapPin,
  Minus,
  Mountain,
  MountainSnow,
  Plus,
  Route,
} from "lucide-react";
import RiskMap, {
  RiskMapHotspot,
  RiskMapLayerVisibility,
  RiskMapTerrainMode,
} from "@/components/RiskMap";
import { corridorRoutes, STATE_PRESETS } from "@/data/mockLandslideData";
import { PublicAlertItem, PublicRiskMapItem } from "@/types/public";

interface OfficerMiniRiskMapProps {
  corridors: PublicRiskMapItem[];
  alerts?: PublicAlertItem[];
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

const NORTHEAST_OVERVIEW_CENTER: [number, number] = [90.7, 25.5];
const NORTHEAST_OVERVIEW_ZOOM = 5.9;
const NORTHEAST_OVERVIEW_PITCH = 28;
const NORTHEAST_OVERVIEW_BEARING = 0;

const TERRAIN_OPTIONS: Array<{
  id: RiskMapTerrainMode;
  label: string;
  description: string;
}> = [
  { id: "terrain", label: "Terrain", description: "3D topographic relief" },
  { id: "satellite", label: "Satellite", description: "Aerial terrain imagery" },
  { id: "light", label: "Light 3D", description: "Operational vector base" },
  { id: "flat", label: "2D Flat", description: "Top-down sector view" },
];

const RISK_LEGEND_ITEMS: Array<{
  label: string;
  dotClass: string;
}> = [
  { label: "Critical", dotClass: "bg-[#DC2626]" },
  { label: "High", dotClass: "bg-[#EA580C]" },
  { label: "Caution", dotClass: "bg-[#EAB308]" },
  { label: "Normal", dotClass: "bg-[#16A34A]" },
];

const FALLBACK_SEEDED_CORRIDORS: PublicRiskMapItem[] = [
  {
    id: "fallback-nh29",
    name: "Dimapur – Kohima – Mao Highway",
    code: "NH-29",
    state: "Nagaland",
    stretch: "KM 38 to KM 52 (Phesama – Dzüdza)",
    geometry: { type: "Point", coordinates: [94.025, 25.685] },
    coordinatesText: "25.6850° N, 94.0250° E",
    status: "blocked",
    riskLevel: "Critical",
    statusReason:
      "Major slope failure and severe mud deposit near Dzüdza Bridge; clearance underway.",
    lastUpdated: new Date().toISOString(),
  },
  {
    id: "fallback-nh10",
    name: "Sevoke – Teesta Gorge – Rangpo Highway",
    code: "NH-10",
    state: "Sikkim",
    stretch: "KM 24 to KM 32 (29th Mile / Coronation Bridge)",
    geometry: { type: "Point", coordinates: [88.485, 27.05] },
    coordinatesText: "27.0500° N, 88.4850° E",
    status: "caution",
    riskLevel: "High",
    statusReason:
      "Active rockfall and riverbank slope cutting; heavy vehicles restricted.",
    lastUpdated: new Date().toISOString(),
  },
  {
    id: "fallback-nh27",
    name: "Haflong – Jatinga – Silchar Highway",
    code: "NH-27",
    state: "Assam",
    stretch: "KM 110 to KM 135 (Borail Hill Range)",
    geometry: { type: "Point", coordinates: [93.02, 25.17] },
    coordinatesText: "25.1700° N, 93.0200° E",
    status: "open",
    riskLevel: "Moderate",
    statusReason:
      "Normal transit operational; cautionary speed limits on mountain curves.",
    lastUpdated: new Date().toISOString(),
  },
];

function parseCoordinatesText(text?: string | null): [number, number] | null {
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

function resolveHotspotCoordinates(
  corridor: PublicRiskMapItem,
  matchedAlert?: PublicAlertItem
): [number, number] {
  const geom = corridor.geometry;
  if (geom?.type === "Point" && Array.isArray(geom.coordinates) && geom.coordinates.length >= 2) {
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

function isKmMarkerText(value: string): boolean {
  return /^km\s*\d+/i.test(value.trim());
}

function formatHotspotDisplay(
  corridor: PublicRiskMapItem,
  matchedAlert?: PublicAlertItem
): { title: string; region: string } {
  const code = (corridor.code || "").trim();
  const alertLocation = (matchedAlert?.location || "").trim();
  const alertTitle = (matchedAlert?.title || "").trim();
  const stretch = (corridor.stretch || "").trim();

  let landmark = "";
  let region = "";

  if (alertLocation) {
    const parenMatch = alertLocation.match(/\(([^)]+)\)/);
    if (parenMatch && !isKmMarkerText(parenMatch[1])) {
      region = parenMatch[1].trim();
    }

    const withoutParens = alertLocation.replace(/\([^)]*\)/g, "").trim();
    const parts = withoutParens
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);

    if (parts.length > 0 && !isKmMarkerText(parts[0])) {
      landmark = parts[0];
    }
    if (!region && parts.length > 1 && !isKmMarkerText(parts[1])) {
      region = parts[1];
    }
  }

  if (!region && alertTitle) {
    const titleParenMatch = alertTitle.match(/\(([^)]+)\)/);
    if (titleParenMatch && !isKmMarkerText(titleParenMatch[1])) {
      region = titleParenMatch[1].trim();
    }
  }

  if (!landmark && stretch) {
    const stretchParen = stretch.match(/\(([^)]+)\)/);
    if (stretchParen) {
      landmark = stretchParen[1].split("/")[0].trim();
    } else {
      landmark = stretch.replace(/^KM\s*\d+(\s*to\s*KM\s*\d+)?/i, "").trim();
    }
  }

  if (!landmark) {
    landmark = (corridor.name || "Monitored Corridor").split("–")[0].trim();
  }

  if (!region) {
    region = corridor.state || "Northeast Sector";
  }

  const title = code ? `${code} · ${landmark}` : landmark;
  return { title, region };
}

function normalizeHotspotSeverity(
  corridor: PublicRiskMapItem,
  matchedAlert?: PublicAlertItem
): "Critical" | "Warning" | "Normal" {
  const risk = (corridor.riskLevel || "").trim().toLowerCase();
  const status = (corridor.status || "").trim().toLowerCase();
  const alertSev = (matchedAlert?.severity || "").trim().toLowerCase();

  if (risk === "critical" || status === "blocked") {
    return "Critical";
  }
  if (
    risk === "high" ||
    risk === "moderate" ||
    risk === "warning" ||
    risk === "watch" ||
    status === "caution" ||
    status === "partial" ||
    alertSev === "critical" ||
    alertSev === "warning" ||
    alertSev === "watch"
  ) {
    return "Warning";
  }
  return "Normal";
}

interface LayerSwitchRowProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  icon: React.ReactNode;
}

function LayerSwitchRow({
  id,
  label,
  checked,
  onChange,
  icon,
}: LayerSwitchRowProps) {
  return (
    <label
      htmlFor={id}
      className="flex items-center justify-between gap-2 py-1 px-1.5 rounded-lg hover:bg-[#173D32]/5 transition-colors cursor-pointer select-none"
    >
      <span className="flex items-center gap-2 min-w-0">
        <span className="shrink-0 flex items-center justify-center">{icon}</span>
        <span className="text-[11.5px] font-semibold text-[#173D32] truncate">
          {label}
        </span>
      </span>

      <span className="relative inline-flex items-center shrink-0">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <span
          aria-hidden="true"
          className={`inline-flex h-[18px] w-[32px] items-center rounded-full p-0.5 transition-colors duration-200 ${
            checked ? "bg-[#173D32]" : "bg-[#CBD5CC]"
          }`}
        >
          <span
            className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-2xs transition-transform duration-200 ${
              checked ? "translate-x-3.5" : "translate-x-0"
            }`}
          />
        </span>
      </span>
    </label>
  );
}

export default function OfficerMiniRiskMap({
  corridors,
  alerts = [],
  isLoading = false,
  error = null,
  onRetry,
}: OfficerMiniRiskMapProps) {
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const terrainDropdownRef = useRef<HTMLDivElement | null>(null);

  const [filterMode, setFilterMode] = useState<"all" | "critical">("all");
  const [activeHotspotId, setActiveHotspotId] = useState<string | null>(null);
  const [layersOpenOverride, setLayersOpenOverride] = useState<boolean | null>(null);
  const [showRiskInfo, setShowRiskInfo] = useState<boolean>(false);
  const [terrainMode, setTerrainMode] = useState<RiskMapTerrainMode>("terrain");
  const [isTerrainMenuOpen, setIsTerrainMenuOpen] = useState<boolean>(false);

  const [layerVisibility, setLayerVisibility] = useState<RiskMapLayerVisibility>({
    hotspots: true,
    corridors: true,
    susceptibility: false,
    rainfall: false,
    slopeElevation: false,
  });

  const handleToggleLayersPanel = () => {
    setLayersOpenOverride((prev) => {
      if (prev === null) {
        const defaultOpen = typeof window !== "undefined" ? window.innerWidth >= 640 : true;
        return !defaultOpen;
      }
      return !prev;
    });
  };

  // Close terrain selector dropdown on outside click
  useEffect(() => {
    if (!isTerrainMenuOpen) return;
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        terrainDropdownRef.current &&
        !terrainDropdownRef.current.contains(event.target as Node)
      ) {
        setIsTerrainMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isTerrainMenuOpen]);

  // Build normalized hotspot objects from actual API corridors + alerts
  const allHotspots: RiskMapHotspot[] = useMemo(() => {
    const sourceItems =
      corridors && corridors.length > 0 ? corridors : FALLBACK_SEEDED_CORRIDORS;

    const mapped = sourceItems.map((corridor) => {
      const codeLower = (corridor.code || "").trim().toLowerCase();
      const matchedAlert = alerts.find(
        (a) => (a.corridor || "").trim().toLowerCase() === codeLower
      );
      const coordinates = resolveHotspotCoordinates(corridor, matchedAlert);
      const { title, region } = formatHotspotDisplay(corridor, matchedAlert);
      const severity = normalizeHotspotSeverity(corridor, matchedAlert);

      return {
        id: corridor.id,
        code: corridor.code,
        title,
        region,
        severity,
        riskLevel: corridor.riskLevel || severity,
        status: corridor.status || "open",
        coordinates,
        rainfall24h: matchedAlert?.rainfall24h || null,
        statusReason: corridor.statusReason || matchedAlert?.description || null,
      };
    });

    // Sort Critical first, then Warning, then Normal
    const rank: Record<RiskMapHotspot["severity"], number> = {
      Critical: 0,
      Warning: 1,
      Normal: 2,
    };
    return [...mapped].sort((a, b) => rank[a.severity] - rank[b.severity]);
  }, [corridors, alerts]);

  const activeHotspots = useMemo(
    () => allHotspots.filter((h) => h.severity === "Critical" || h.severity === "Warning"),
    [allHotspots]
  );

  const filteredActiveHotspots = useMemo(() => {
    if (filterMode === "critical") {
      return activeHotspots.filter((h) => h.severity === "Critical");
    }
    return activeHotspots;
  }, [activeHotspots, filterMode]);

  const previewHotspots = useMemo(
    () => filteredActiveHotspots.slice(0, 3),
    [filteredActiveHotspots]
  );

  const handleMapLoaded = useCallback((map: mapboxgl.Map) => {
    mapRef.current = map;
  }, []);

  const flyToOverview = useCallback(
    (clearSelection = true) => {
      if (clearSelection) {
        setActiveHotspotId(null);
      }
      const map = mapRef.current;
      if (!map) return;
      map.flyTo({
        center: NORTHEAST_OVERVIEW_CENTER,
        zoom: NORTHEAST_OVERVIEW_ZOOM,
        pitch: terrainMode === "flat" ? 0 : NORTHEAST_OVERVIEW_PITCH,
        bearing: NORTHEAST_OVERVIEW_BEARING,
        padding: { top: 0, right: 0, bottom: 0, left: 0 },
        duration: 1200,
        essential: true,
      });
    },
    [terrainMode]
  );

  const handleFocusHotspot = useCallback(
    (hotspot: RiskMapHotspot) => {
      setActiveHotspotId(hotspot.id);
      const map = mapRef.current;
      if (!map) return;

      const containerWidth = map.getContainer()?.clientWidth || 0;
      const isPanelCurrentlyOpen = layersOpenOverride ?? containerWidth >= 640;
      const leftPad = containerWidth >= 680 && isPanelCurrentlyOpen ? 220 : 24;

      map.flyTo({
        center: hotspot.coordinates,
        zoom: 12.2,
        pitch: terrainMode === "flat" ? 0 : 52,
        bearing: -12,
        padding: { top: 24, right: 44, bottom: 24, left: leftPad },
        duration: 1400,
        essential: true,
      });
    },
    [layersOpenOverride, terrainMode]
  );

  const handleFilterChange = (nextMode: "all" | "critical") => {
    setFilterMode(nextMode);
    if (nextMode === "critical" && activeHotspotId) {
      const current = allHotspots.find((h) => h.id === activeHotspotId);
      if (current && current.severity !== "Critical") {
        setActiveHotspotId(null);
      }
    }
    if (nextMode === "all" && activeHotspotId === null) {
      flyToOverview(false);
    }
  };

  const handleZoomIn = () => {
    mapRef.current?.zoomIn({ duration: 280 });
  };

  const handleZoomOut = () => {
    mapRef.current?.zoomOut({ duration: 280 });
  };

  const handleLocateControl = () => {
    const map = mapRef.current;
    if (!map) return;

    if (activeHotspotId) {
      flyToOverview(true);
      return;
    }

    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { longitude, latitude } = pos.coords;
          const withinNortheast =
            longitude >= 87.5 && longitude <= 97.6 && latitude >= 21.5 && latitude <= 29.8;
          if (withinNortheast) {
            map.flyTo({
              center: [longitude, latitude],
              zoom: 11.5,
              pitch: terrainMode === "flat" ? 0 : 45,
              duration: 1200,
              essential: true,
            });
          } else {
            flyToOverview(true);
          }
        },
        () => flyToOverview(true),
        { timeout: 2500 }
      );
      return;
    }

    flyToOverview(true);
  };

  const toggleLayer = (key: keyof RiskMapLayerVisibility, next: boolean) => {
    setLayerVisibility((prev) => ({ ...prev, [key]: next }));
  };

  const activeTerrainOption =
    TERRAIN_OPTIONS.find((opt) => opt.id === terrainMode) || TERRAIN_OPTIONS[0];

  const footerSummaryText = useMemo(() => {
    if (filteredActiveHotspots.length === 0) {
      return filterMode === "critical"
        ? "No critical hotspots active"
        : "No active hotspots";
    }
    if (filterMode === "critical") {
      return filteredActiveHotspots.length > 3
        ? `Showing 3 of ${filteredActiveHotspots.length} critical hotspots`
        : `Showing ${filteredActiveHotspots.length} critical hotspot${
            filteredActiveHotspots.length === 1 ? "" : "s"
          }`;
    }
    return filteredActiveHotspots.length > 3
      ? `Showing 3 of ${filteredActiveHotspots.length} active hotspots`
      : `Showing ${filteredActiveHotspots.length} active hotspot${
          filteredActiveHotspots.length === 1 ? "" : "s"
        }`;
  }, [filteredActiveHotspots.length, filterMode]);

  return (
    <div className="bg-[#FAF8F2] border border-[#173D32]/12 rounded-3xl p-4 sm:p-6 shadow-xs flex flex-col gap-4">
      {/* ── Top Header Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[#173D32]/75">
            <MapIcon className="w-3.5 h-3.5 text-[#173D32] shrink-0" strokeWidth={2.2} aria-hidden="true" />
            <span className="text-[11px] font-bold uppercase tracking-wider">
              GIS Radar Engine · Northeast Sector
            </span>
          </div>
          <h3 className="text-lg sm:text-xl font-extrabold text-[#173D32] tracking-tight mt-0.5">
            Current Risk Hotspots &amp; Corridors
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
          {/* All / Critical Only Filters */}
          <div
            role="group"
            aria-label="Filter map risk severity"
            className="flex items-center gap-1.5"
          >
            <button
              type="button"
              onClick={() => handleFilterChange("all")}
              aria-pressed={filterMode === "all"}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                filterMode === "all"
                  ? "bg-[#173D32] text-[#F6F4EC] shadow-2xs"
                  : "bg-white text-[#173D32] border border-[#173D32]/15 hover:bg-[#173D32]/5"
              }`}
            >
              All ({allHotspots.length})
            </button>

            <button
              type="button"
              onClick={() => handleFilterChange("critical")}
              aria-pressed={filterMode === "critical"}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                filterMode === "critical"
                  ? "bg-[#B91C1C] text-white border border-[#B91C1C] shadow-2xs"
                  : "bg-white text-[#B91C1C] border border-[#173D32]/15 hover:bg-red-50"
              }`}
            >
              Critical Only
            </button>
          </div>

          <Link
            href="/officer/map"
            className="px-3.5 py-1.5 rounded-full bg-[#173D32] hover:bg-[#1a4437] text-[#F6F4EC] text-xs font-bold transition-colors inline-flex items-center gap-1.5 shrink-0 shadow-2xs"
            title="Expand to Fullscreen GIS Map"
          >
            <span>Expand Map</span>
            <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={2.3} aria-hidden="true" />
          </Link>
        </div>
      </div>

      {/* ── Loading State ── */}
      {isLoading && (
        <div className="min-h-[400px] rounded-2xl bg-[#173D32]/5 border border-[#173D32]/10 flex flex-col items-center justify-center gap-3 p-8 animate-pulse">
          <div className="w-9 h-9 rounded-full border-2 border-[#173D32]/25 border-t-[#173D32] animate-spin" />
          <p className="text-xs font-semibold text-[#173D32]/70">
            Syncing spatial radar layers and active corridors...
          </p>
        </div>
      )}

      {/* ── Error State ── */}
      {!isLoading && error && (
        <div className="min-h-[260px] rounded-2xl bg-red-50 border border-red-200 p-6 flex flex-col items-center justify-center text-center gap-2.5">
          <AlertTriangle className="w-6 h-6 text-red-600" aria-hidden="true" />
          <p className="text-xs sm:text-sm font-bold text-red-900">{error}</p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-1 px-4 py-1.5 rounded-full bg-red-700 text-white text-xs font-bold hover:bg-red-800 transition-colors cursor-pointer"
            >
              Retry Hotspots Sync
            </button>
          )}
        </div>
      )}

      {/* ── Main Interactive Map & Compact Active Hotspots Preview ── */}
      {!isLoading && !error && (
        <>
          {/* Interactive Mapbox Section */}
          <div className="officer-radar-map relative rounded-2xl overflow-hidden border border-[#173D32]/15 shadow-xs h-[400px] sm:h-[430px] lg:h-[460px] bg-[#0F3124]">
            <RiskMap
              variant="mini"
              center={NORTHEAST_OVERVIEW_CENTER}
              zoom={NORTHEAST_OVERVIEW_ZOOM}
              pitch={NORTHEAST_OVERVIEW_PITCH}
              bearing={NORTHEAST_OVERVIEW_BEARING}
              showPlayback={false}
              showControls={false}
              showScaleControl={true}
              hotspots={allHotspots}
              activeHotspotId={activeHotspotId}
              onSelectHotspot={handleFocusHotspot}
              layerVisibility={layerVisibility}
              terrainMode={terrainMode}
              riskFilter={filterMode}
              onMapLoaded={handleMapLoaded}
              className="w-full h-full"
            />

            {/* Floating Left Map Layers Panel */}
            <aside
              aria-label="Map Layers and Risk Legend"
              className="absolute top-3.5 left-3.5 z-20 w-[202px] sm:w-[238px] max-h-[calc(100%-28px)] flex flex-col bg-[#FAF8F2]/95 backdrop-blur-md border border-[#173D32]/15 rounded-2xl shadow-[0_10px_28px_rgba(23,61,50,0.18)] text-[#173D32]"
            >
              <button
                type="button"
                onClick={handleToggleLayersPanel}
                aria-expanded={layersOpenOverride ?? true}
                className="w-full px-3.5 py-2.5 flex items-center justify-between gap-2 text-left cursor-pointer rounded-2xl hover:bg-[#173D32]/4 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-[#173D32]" strokeWidth={2.2} aria-hidden="true" />
                  <span className="text-xs font-extrabold text-[#173D32]">
                    Map Layers
                  </span>
                </span>
                {layersOpenOverride === null ? (
                  <>
                    <ChevronUp className="hidden sm:block w-3.5 h-3.5 text-[#173D32]/70" aria-hidden="true" />
                    <ChevronDown className="block sm:hidden w-3.5 h-3.5 text-[#173D32]/70" aria-hidden="true" />
                  </>
                ) : layersOpenOverride ? (
                  <ChevronUp className="w-3.5 h-3.5 text-[#173D32]/70" aria-hidden="true" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-[#173D32]/70" aria-hidden="true" />
                )}
              </button>

              <div
                className={`px-3 pb-3 pt-1 border-t border-[#173D32]/10 overflow-y-auto ${
                  layersOpenOverride === null
                    ? "hidden sm:block"
                    : layersOpenOverride
                    ? "block"
                    : "hidden"
                }`}
              >
                  <div className="space-y-0.5">
                    <LayerSwitchRow
                      id="layer-risk-hotspots"
                      label="Risk Hotspots"
                      checked={layerVisibility.hotspots}
                      onChange={(next) => toggleLayer("hotspots", next)}
                      icon={
                        <AlertTriangle
                          className="w-3.5 h-3.5 text-[#DC2626]"
                          strokeWidth={2.1}
                          aria-hidden="true"
                        />
                      }
                    />
                    <LayerSwitchRow
                      id="layer-road-corridors"
                      label="Road Corridors"
                      checked={layerVisibility.corridors}
                      onChange={(next) => toggleLayer("corridors", next)}
                      icon={
                        <Route
                          className="w-3.5 h-3.5 text-[#173D32]"
                          strokeWidth={2.1}
                          aria-hidden="true"
                        />
                      }
                    />
                    <LayerSwitchRow
                      id="layer-landslide-susceptibility"
                      label="Landslide Susceptibility"
                      checked={layerVisibility.susceptibility}
                      onChange={(next) => toggleLayer("susceptibility", next)}
                      icon={
                        <Mountain
                          className="w-3.5 h-3.5 text-[#16A34A]"
                          strokeWidth={2.1}
                          aria-hidden="true"
                        />
                      }
                    />
                    <LayerSwitchRow
                      id="layer-rainfall-24h"
                      label="Rainfall (24h)"
                      checked={layerVisibility.rainfall}
                      onChange={(next) => toggleLayer("rainfall", next)}
                      icon={
                        <CloudRain
                          className="w-3.5 h-3.5 text-[#2563EB]"
                          strokeWidth={2.1}
                          aria-hidden="true"
                        />
                      }
                    />
                    <LayerSwitchRow
                      id="layer-slope-elevation"
                      label="Slope / Elevation"
                      checked={layerVisibility.slopeElevation}
                      onChange={(next) => toggleLayer("slopeElevation", next)}
                      icon={
                        <MountainSnow
                          className="w-3.5 h-3.5 text-[#64756C]"
                          strokeWidth={2.1}
                          aria-hidden="true"
                        />
                      }
                    />
                  </div>

                  {/* Risk Level Legend */}
                  <div className="mt-2.5 pt-2.5 border-t border-[#173D32]/10">
                    <div className="flex items-center gap-1.5 mb-1.5 px-1">
                      <span className="text-[11px] font-extrabold text-[#173D32]">
                        Risk Level
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowRiskInfo((prev) => !prev)}
                        title="Critical: Blocked / active collapse • High: Severe slope stress • Caution: Restricted / watch • Normal: Stable"
                        aria-label="Risk level classification details"
                        className="text-[#173D32]/55 hover:text-[#173D32] transition-colors cursor-pointer"
                      >
                        <Info className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </div>

                    {showRiskInfo && (
                      <p className="text-[10px] leading-snug text-[#173D32]/75 bg-[#F6F4EC] border border-[#173D32]/10 rounded-lg px-2 py-1.5 mb-1.5">
                        Derived from slope saturation, pore pressure, and corridor clearance status.
                      </p>
                    )}

                    <ul className="space-y-1 px-1">
                      {RISK_LEGEND_ITEMS.map((item) => (
                        <li
                          key={item.label}
                          className="flex items-center gap-2 text-[11px] font-semibold text-[#173D32]/85"
                        >
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${item.dotClass}`}
                            aria-hidden="true"
                          />
                          <span>{item.label}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
            </aside>

            {/* Floating Top-Right Terrain Selector */}
            <div ref={terrainDropdownRef} className="absolute top-3.5 right-3.5 z-20">
              <button
                type="button"
                onClick={() => setIsTerrainMenuOpen((prev) => !prev)}
                aria-haspopup="listbox"
                aria-expanded={isTerrainMenuOpen}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FAF8F2]/95 backdrop-blur-md border border-[#173D32]/15 shadow-md text-xs font-bold text-[#173D32] hover:bg-white transition-colors cursor-pointer"
              >
                <Mountain className="w-3.5 h-3.5 text-[#173D32]" strokeWidth={2.1} aria-hidden="true" />
                <span>{activeTerrainOption.label}</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-[#173D32]/70 transition-transform ${
                    isTerrainMenuOpen ? "rotate-180" : ""
                  }`}
                  aria-hidden="true"
                />
              </button>

              {isTerrainMenuOpen && (
                <div
                  role="listbox"
                  aria-label="Select terrain view"
                  className="absolute right-0 mt-1.5 w-44 rounded-xl bg-[#FAF8F2]/98 backdrop-blur-md border border-[#173D32]/15 shadow-lg p-1 text-[#173D32]"
                >
                  {TERRAIN_OPTIONS.map((opt) => {
                    const isSelected = opt.id === terrainMode;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => {
                          setTerrainMode(opt.id);
                          setIsTerrainMenuOpen(false);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer flex flex-col ${
                          isSelected
                            ? "bg-[#173D32] text-[#F6F4EC]"
                            : "hover:bg-[#173D32]/8 text-[#173D32]"
                        }`}
                      >
                        <span className="text-xs font-bold leading-tight">{opt.label}</span>
                        <span
                          className={`text-[10px] leading-tight mt-0.5 ${
                            isSelected ? "text-[#F6F4EC]/80" : "text-[#173D32]/65"
                          }`}
                        >
                          {opt.description}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Floating Bottom-Right Zoom & Location Controls (above Scale Bar) */}
            <div className="absolute bottom-11 right-3.5 z-20 flex flex-col items-end gap-2">
              <div className="bg-[#FAF8F2]/95 backdrop-blur-md border border-[#173D32]/15 rounded-xl shadow-md overflow-hidden flex flex-col">
                <button
                  type="button"
                  onClick={handleZoomIn}
                  aria-label="Zoom in"
                  title="Zoom in"
                  className="w-8 h-8 flex items-center justify-center text-[#173D32] hover:bg-[#173D32]/8 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" strokeWidth={2.2} aria-hidden="true" />
                </button>
                <div className="border-t border-[#173D32]/12" />
                <button
                  type="button"
                  onClick={handleZoomOut}
                  aria-label="Zoom out"
                  title="Zoom out"
                  className="w-8 h-8 flex items-center justify-center text-[#173D32] hover:bg-[#173D32]/8 transition-colors cursor-pointer"
                >
                  <Minus className="w-4 h-4" strokeWidth={2.2} aria-hidden="true" />
                </button>
              </div>

              <button
                type="button"
                onClick={handleLocateControl}
                aria-label={
                  activeHotspotId
                    ? "Reset to Northeast Sector overview"
                    : "Center on current sector location"
                }
                title={
                  activeHotspotId
                    ? "Reset to Northeast Sector overview"
                    : "Center on current sector location"
                }
                className="w-8 h-8 rounded-xl bg-[#FAF8F2]/95 backdrop-blur-md border border-[#173D32]/15 shadow-md flex items-center justify-center text-[#173D32] hover:bg-[#173D32]/8 transition-colors cursor-pointer"
              >
                <LocateFixed className="w-4 h-4" strokeWidth={2.1} aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* ── Compact Active Hotspots Preview Section ── */}
          <div className="rounded-2xl bg-white/90 border border-[#173D32]/10 p-4 sm:p-5 shadow-[0_1px_4px_rgba(23,61,50,0.04)]">
            {/* Active Hotspots Header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span
                  className="w-9 h-9 rounded-xl bg-[#E4EDE0] border border-[#173D32]/10 flex items-center justify-center shrink-0 text-[#173D32]"
                  aria-hidden="true"
                >
                  <Mountain className="w-[18px] h-[18px]" strokeWidth={2.1} />
                </span>
                <div>
                  <h4 className="text-sm sm:text-[15px] font-extrabold text-[#173D32] leading-tight">
                    Active Hotspots
                  </h4>
                  <p className="text-xs text-[#173D32]/65 font-medium mt-0.5">
                    High-risk locations currently under watch
                  </p>
                </div>
              </div>

              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold whitespace-nowrap ${
                  activeHotspots.length > 0
                    ? "bg-[#FEF2F2] border-[#FECACA] text-[#B91C1C]"
                    : "bg-[#ECFDF5] border-[#A7F3D0] text-[#166534]"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    activeHotspots.length > 0 ? "bg-[#DC2626]" : "bg-[#16A34A]"
                  }`}
                  aria-hidden="true"
                />
                <span>{activeHotspots.length} Active</span>
              </span>
            </div>

            {/* Horizontal 3-Hotspot Summary Row */}
            <div className="mt-3.5 pt-3.5 border-t border-[#173D32]/8">
              {previewHotspots.length === 0 ? (
                <div className="py-3 px-3 rounded-xl bg-[#FAF8F2] border border-[#173D32]/8 text-xs font-semibold text-[#173D32]/70 text-center">
                  {filterMode === "critical"
                    ? "No critical hotspots active across monitored corridors."
                    : "No elevated risk hotspots currently under watch."}
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5 sm:gap-3">
                  {previewHotspots.map((hotspot) => {
                    const isCritical = hotspot.severity === "Critical";
                    const isFocused = activeHotspotId === hotspot.id;

                    return (
                      <button
                        key={hotspot.id}
                        type="button"
                        onClick={() => handleFocusHotspot(hotspot)}
                        aria-pressed={isFocused}
                        className={`w-full text-left flex items-center justify-between gap-2 sm:gap-2.5 px-2.5 sm:px-3 py-2.5 rounded-xl border transition-all cursor-pointer ${
                          isFocused
                            ? "bg-[#F6F4EC] border-[#173D32]/35 shadow-2xs"
                            : "bg-[#FAF8F2]/65 border-[#173D32]/8 hover:bg-[#F6F4EC] hover:border-[#173D32]/22"
                        }`}
                      >
                        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
                          <span
                            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 ${
                              isCritical
                                ? "bg-[#FDE8E8] text-[#DC2626]"
                                : "bg-[#FEF3C7] text-[#D97706]"
                            }`}
                            aria-hidden="true"
                          >
                            <MapPin className="w-4 h-4" strokeWidth={2.2} />
                          </span>

                          <div className="min-w-0 flex-1">
                            <span className="block text-[12.5px] sm:text-[13px] font-bold text-[#173D32] leading-snug line-clamp-2 xl:truncate">
                              {hotspot.title}
                            </span>
                            <span className="block text-[11.5px] sm:text-xs font-medium text-[#173D32]/65 truncate mt-0.5 leading-tight">
                              {hotspot.region}
                            </span>
                          </div>
                        </div>

                        <span
                          className={`shrink-0 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg text-[10.5px] sm:text-[11px] font-bold leading-none ${
                            isCritical
                              ? "bg-[#FDE8E8] text-[#B91C1C] border border-[#FECACA]/75"
                              : "bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]/85"
                          }`}
                        >
                          {hotspot.severity}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Compact Footer */}
            <div className="mt-3.5 pt-3 border-t border-[#173D32]/8 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-[#173D32]/65 font-medium">
                {footerSummaryText}
              </span>
              <Link
                href="/officer/map"
                className="inline-flex items-center gap-1 font-bold text-[#173D32] hover:underline"
              >
                <span>View all on map</span>
                <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.2} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
