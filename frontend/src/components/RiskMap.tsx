"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import {
  corridorRoutes,
  rescueRoute,
  STATE_PRESETS,
  computeSimulatedCorridorRoutes,
  nh29FieldSensors,
  computeSimulatedSensors,
} from "../data/mockLandslideData.js";

// Read token securely from environment variable (Next.js or Vite)
const MAPBOX_ACCESS_TOKEN: string =
  process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ||
  (typeof import.meta !== "undefined" &&
    (import.meta as Record<string, any>)?.env?.VITE_MAPBOX_ACCESS_TOKEN
    ? (import.meta as Record<string, any>).env.VITE_MAPBOX_ACCESS_TOKEN
    : "");

const hasValidToken = Boolean(
  MAPBOX_ACCESS_TOKEN &&
  MAPBOX_ACCESS_TOKEN.trim().length > 0 &&
  !MAPBOX_ACCESS_TOKEN.includes("your_mapbox_access_token")
);

export const isMapboxTokenConfigured = hasValidToken;

export interface RiskMapHotspot {
  id: string;
  code: string;
  title: string;
  region: string;
  state?: string;
  severity: "Critical" | "Warning" | "Normal";
  riskLevel: string;
  status: string;
  coordinates: [number, number]; // [lng, lat]
  routeCoordinates?: [number, number][]; // optional real LineString path
  rainfall24h?: string | null;
  statusReason?: string | null;
}

export interface RiskMapLayerVisibility {
  hotspots: boolean;
  corridors: boolean;
  susceptibility: boolean;
  rainfall: boolean;
  slopeElevation: boolean;
  hillshade?: boolean;
  hazardHeatmap?: boolean;
  rescueRoute?: boolean;
  fieldSensors?: boolean;
}

export type RiskMapTerrainMode = "terrain" | "satellite" | "light" | "flat";

const TERRAIN_STYLE_MAP: Record<RiskMapTerrainMode, string> = {
  terrain: "mapbox://styles/mapbox/outdoors-v12",
  satellite: "mapbox://styles/mapbox/satellite-streets-v12",
  light: "mapbox://styles/mapbox/light-v11",
  flat: "mapbox://styles/mapbox/outdoors-v12",
};

const REGIONAL_CORRIDOR_ARCS = [
  {
    id: "reg-nh29",
    code: "NH-29",
    name: "Dimapur – Kohima – Mao Highway",
    defaultRisk: "critical",
    coordinates: [
      [93.72, 25.91],
      [93.88, 25.78],
      [94.025, 25.685],
      [94.11, 25.67],
      [94.15, 25.52],
    ],
  },
  {
    id: "reg-nh10",
    code: "NH-10",
    name: "Sevoke – Teesta Gorge – Gangtok Highway",
    defaultRisk: "warning",
    coordinates: [
      [88.43, 26.86],
      [88.485, 27.05],
      [88.54, 27.20],
      [88.61, 27.33],
    ],
  },
  {
    id: "reg-nh27",
    code: "NH-27",
    name: "Guwahati – Haflong – Jatinga – Silchar Highway",
    defaultRisk: "warning",
    coordinates: [
      [91.78, 26.14],
      [92.42, 25.95],
      [92.95, 25.55],
      [93.02, 25.17],
      [92.80, 24.83],
    ],
  },
  {
    id: "reg-nh6",
    code: "NH-6",
    name: "Shillong – Jowai – Sonapur – Silchar Highway",
    defaultRisk: "warning",
    coordinates: [
      [91.89, 25.57],
      [92.20, 25.44],
      [92.36, 25.105],
      [92.62, 24.92],
      [92.80, 24.83],
    ],
  },
];

const SUSCEPTIBILITY_BASELINE_ZONES: Array<{
  coordinates: [number, number];
  weight: number;
  label: string;
}> = [
  { coordinates: [94.025, 25.685], weight: 0.95, label: "Kohima – Pherima Belt" },
  { coordinates: [88.485, 27.05], weight: 0.9, label: "Teesta Gorge Shear Zone" },
  { coordinates: [93.02, 25.17], weight: 0.82, label: "Barail Hill Range" },
  { coordinates: [92.36, 25.105], weight: 0.78, label: "East Jaintia Escarpment" },
  { coordinates: [93.81, 27.12], weight: 0.65, label: "Papum Pare Foothills" },
  { coordinates: [93.63, 24.84], weight: 0.68, label: "Noney – Tupul Valley" },
  { coordinates: [92.72, 23.73], weight: 0.6, label: "Aizawl Steep Ridge" },
];

function parseRainfallMm(rainfallText?: string | null, severity?: string): number {
  if (rainfallText) {
    const match = rainfallText.match(/(\d+(?:\.\d+)?)/);
    if (match) return Number(match[1]);
  }
  if (severity === "Critical") return 168;
  if (severity === "Warning") return 112;
  return 42;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export interface RiskMapProps {
  /**
   * Layout presentation variant:
   * - "full": Full GIS interactive workstation with HUD, simulation playback, controls, popups (Default)
   * - "dashboard": Operational portal map with collapsible HUD & navigation controls
   * - "mini": Compact embedded widget for dashboard cards (Officer Dashboard Mini Map, Citizen My Area)
   * - "simple": Clean map canvas without floating overlays
   */
  variant?: "full" | "dashboard" | "mini" | "simple";
  /** Center coordinates [longitude, latitude]. Defaults to NH-29 Dimapur–Kohima Corridor, Nagaland [94.02, 25.72] */
  center?: [number, number];
  /** Initial zoom level. Defaults to 13.5 */
  zoom?: number;
  /** Camera pitch in degrees (0-85). Defaults to 60 */
  pitch?: number;
  /** Camera bearing in degrees (-180 to 180). Defaults to -20 */
  bearing?: number;
  /** Optional state filter to trigger camera fly-to */
  selectedState?: string;
  /** Override visibility of top-left Live Corridor HUD (defaults to true for 'full' and 'dashboard', false for 'mini') */
  showHud?: boolean;
  /** Optional legacy showPlayback flag (kept for backwards compatibility) */
  showPlayback?: boolean;
  /** Override visibility of Mapbox Navigation Controls (defaults to true) */
  showControls?: boolean;
  /** Optional Mapbox ScaleControl (defaults to false) */
  showScaleControl?: boolean;
  /** Position of Mapbox ScaleControl when enabled (defaults to 'bottom-right') */
  scalePosition?: "bottom-left" | "bottom-right";
  /** Optional corridor click callback */
  onSelectCorridor?: (corridorId: string, properties: Record<string, any>) => void;
  /** Optional hotspots to display as interactive regional markers */
  hotspots?: RiskMapHotspot[];
  /** Currently focused hotspot id */
  activeHotspotId?: string | null;
  /** Callback when a regional hotspot marker is clicked */
  onSelectHotspot?: (hotspot: RiskMapHotspot) => void;
  /** Controlled layer visibility flags (optional; when provided, overrides internal HUD layer toggles) */
  layerVisibility?: Partial<RiskMapLayerVisibility>;
  /** Controlled terrain/base-map mode */
  terrainMode?: RiskMapTerrainMode;
  /** Optional risk filter applied to hotspots and corridor layers */
  riskFilter?: "all" | "critical";
  /** Optional container CSS class name */
  className?: string;
  /** Optional callback triggered once map style has loaded */
  onMapLoaded?: (map: mapboxgl.Map) => void;
  /** Optional callback triggered if Mapbox GL reports an initialization/runtime error */
  onMapError?: (message: string) => void;
}

/**
 * RiskMap — High-fidelity 3D Mapbox GL JS map for Terra360:
 * - Center: [94.02, 25.72] (NH-29 Dimapur–Kohima Corridor, Nagaland)
 * - Camera: zoom 13.5, pitch 60°, bearing -20°
 * - 3D Terrain: mapbox-dem raster-dem with exaggeration 1.5 & hillshade
 * - Fill-extrusion 3D buildings (#e8e5df) with directional lighting ([1.5, 90, 45], 0.35)
 * - Custom layer tints: water #98ddf2, greenways #d7ebd6
 * - Corridor Line Layer: 6px width, status-colored (safe: #00E676, warning: #FFA500, critical: #FF0000)
 * - Rescue Detour Line Layer: Bright electric blue dashed line (#00B0FF, line-dasharray: [2, 2])
 * - Interactive Telemetry Popups: Soil moisture, pore-water pressure, tilt rate, and risk status
 * - Floating Top-Left Dashboard Overlay Card:
 *     - Active Corridor Alert (NH-29 Pherima Segment - BLOCKED)
 *     - Rainfall Intensity (84 mm/h Torrential)
 *     - Alternate Rescue Route Status (ACTIVE)
 *     - Layer visibility toggle switches: 3D Terrain Hillshade, Hazard Risk Heatmap, Emergency Rescue Reroute
 */
export default function RiskMap({
  variant = "full",
  center = [94.02, 25.72],
  zoom = 13.5,
  pitch = 60,
  bearing = -20,
  selectedState,
  showHud,
  showPlayback,
  showControls = true,
  showScaleControl = false,
  scalePosition = "bottom-right",
  onSelectCorridor,
  hotspots,
  activeHotspotId = null,
  onSelectHotspot,
  layerVisibility,
  terrainMode,
  riskFilter = "all",
  className = "",
  onMapLoaded,
  onMapError,
}: RiskMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<mapboxgl.Map | null>(null);
  const obstacleMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const hotspotMarkersRef = useRef<Map<string, { marker: mapboxgl.Marker; el: HTMLDivElement }>>(new Map());
  const activeStyleUrlRef = useRef<string>(
    terrainMode ? TERRAIN_STYLE_MAP[terrainMode] : "mapbox://styles/mapbox/light-v11"
  );
  const prevSelectedStateRef = useRef<string | undefined>(selectedState);

  const effectiveShowHud =
    showHud !== undefined
      ? showHud
      : variant !== "mini" && variant !== "simple";

<<<<<<< HEAD
  // Layer visibility toggle states
=======
  const effectiveShowPlayback =
    showPlayback !== undefined
      ? showPlayback
      : variant === "full";

  // Layer visibility toggle states (used by internal HUD when layerVisibility prop is not supplied)
>>>>>>> 9292949ba14fffa77dea0826286adf1f373c2c96
  const [terrainEnabled, setTerrainEnabled] = useState<boolean>(true);
  const [riskHeatmapEnabled, setRiskHeatmapEnabled] = useState<boolean>(true);
  const [rescueRouteEnabled, setRescueRouteEnabled] = useState<boolean>(true);
  const [fieldSensorsEnabled, setFieldSensorsEnabled] = useState<boolean>(true);
  const [isHudCollapsed, setIsHudCollapsed] = useState<boolean>(false);

<<<<<<< HEAD
  // Compute live simulated corridor routes GeoJSON along NH-29 Pherima slope (peak conditions)
  const simulatedCorridorData = useMemo(() => {
    return computeSimulatedCorridorRoutes(14);
  }, []);
=======
  const isControlledLayers = layerVisibility !== undefined;
  const effectiveLayers: RiskMapLayerVisibility = useMemo(
    () => ({
      hotspots: layerVisibility?.hotspots ?? true,
      corridors: layerVisibility?.corridors ?? riskHeatmapEnabled,
      susceptibility: layerVisibility?.susceptibility ?? false,
      rainfall: layerVisibility?.rainfall ?? false,
      slopeElevation: layerVisibility?.slopeElevation ?? false,
      hillshade: layerVisibility?.hillshade,
      hazardHeatmap: layerVisibility?.hazardHeatmap,
      rescueRoute: layerVisibility?.rescueRoute,
      fieldSensors: layerVisibility?.fieldSensors,
    }),
    [layerVisibility, riskHeatmapEnabled]
  );

  // Refs so style.load and map callbacks always observe latest controlled props
  const effectiveLayersRef = useRef(effectiveLayers);
  const isControlledLayersRef = useRef(isControlledLayers);
  const terrainModeRef = useRef(terrainMode);
  const riskFilterRef = useRef(riskFilter);
  const hotspotsRef = useRef(hotspots);
  const activeHotspotIdRef = useRef(activeHotspotId);
  const onSelectHotspotRef = useRef(onSelectHotspot);
  const onSelectCorridorRef = useRef(onSelectCorridor);
  const onMapLoadedRef = useRef(onMapLoaded);
  const onMapErrorRef = useRef(onMapError);
  const terrainEnabledRef = useRef(terrainEnabled);
  const riskHeatmapEnabledRef = useRef(riskHeatmapEnabled);
  const rescueRouteEnabledRef = useRef(rescueRouteEnabled);
  const fieldSensorsEnabledRef = useRef(fieldSensorsEnabled);

  // ── Monsoon Simulation Playback State ─────────────────────────
  const [simulationHour, setSimulationHour] = useState<number>(14); // 00:00 to 24:00 (default peak hour 14)
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const playbackIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Compute dynamic simulated corridor routes GeoJSON based on simulation hour (or sync live backend statuses when hotspots are supplied without playback)
  const simulatedCorridorData = useMemo(() => {
    const base = computeSimulatedCorridorRoutes(simulationHour);
    if (effectiveShowPlayback || hotspots === undefined) {
      return base;
    }

    const activeStateLower = (selectedState || "").trim().toLowerCase();
    const isStateFiltered = Boolean(activeStateLower && activeStateLower !== "all states");

    const filteredFeatures = base.features
      .filter((feat: any) => {
        if (!isStateFiltered) return true;
        const featState = String(feat.properties?.state || "").toLowerCase();
        return featState === activeStateLower || activeStateLower.startsWith(featState);
      })
      .map((feat: any) => {
        const props = feat.properties || {};
        const codeUpper = String(props.corridor || "").toUpperCase();
        const matched = hotspots.find((h) => h.code.toUpperCase() === codeUpper);
        if (!matched) return feat;

        // Preserve NH-29's multi-segment hazard gradient when NH-29 is Critical
        if (codeUpper === "NH-29" && matched.severity === "Critical") {
          return feat;
        }

        const syncedStatus =
          matched.severity === "Critical"
            ? "critical"
            : matched.severity === "Warning"
            ? "warning"
            : "safe";

        return {
          ...feat,
          properties: {
            ...props,
            status: syncedStatus,
            riskStatus: matched.severity === "Normal" ? "Safe" : matched.severity,
          },
        };
      });

    return {
      ...base,
      features: filteredFeatures,
    };
  }, [simulationHour, effectiveShowPlayback, hotspots, selectedState]);
>>>>>>> 9292949ba14fffa77dea0826286adf1f373c2c96

  // Compute live simulated field sensor telemetry along NH-29 Pherima slope
  const simulatedSensorsData = useMemo(() => {
    return computeSimulatedSensors(14);
  }, []);

  const simulatedCorridorDataRef = useRef(simulatedCorridorData);
  const simulatedSensorsDataRef = useRef(simulatedSensorsData);

  // Regional highway arcs colored by matching live hotspot risk level
  const regionalCorridorsGeoJson = useMemo(() => {
    const list = hotspots || [];
    const activeStateLower = (selectedState || "").trim().toLowerCase();
    const isStateFiltered = Boolean(activeStateLower && activeStateLower !== "all states");

    // Include real LineString geometries from backend hotspots when present
    const customFeatures = list
      .filter((h) => Array.isArray(h.routeCoordinates) && h.routeCoordinates.length >= 2)
      .map((h) => ({
        type: "Feature" as const,
        properties: {
          id: h.id,
          code: h.code,
          name: h.title,
          riskLevel:
            h.severity === "Critical"
              ? "critical"
              : h.severity === "Warning"
              ? "warning"
              : "safe",
        },
        geometry: {
          type: "LineString" as const,
          coordinates: h.routeCoordinates as [number, number][],
        },
      }));

    const customCodes = new Set(customFeatures.map((f) => f.properties.code.toUpperCase()));

    const arcFeatures = REGIONAL_CORRIDOR_ARCS.filter((arc) => {
      if (customCodes.has(arc.code.toUpperCase())) return false;
      if (!isStateFiltered) return true;
      return list.some((h) => h.code.toUpperCase() === arc.code.toUpperCase());
    }).map((arc) => {
      const matched = list.find(
        (h) => h.code.toUpperCase() === arc.code.toUpperCase()
      );
      const risk = matched
        ? matched.severity === "Critical"
          ? "critical"
          : matched.severity === "Warning"
          ? "warning"
          : "safe"
        : arc.defaultRisk;

      return {
        type: "Feature" as const,
        properties: {
          id: arc.id,
          code: arc.code,
          name: arc.name,
          riskLevel: risk,
        },
        geometry: {
          type: "LineString" as const,
          coordinates: arc.coordinates,
        },
      };
    });

    return {
      type: "FeatureCollection" as const,
      features: [...customFeatures, ...arcFeatures],
    };
  }, [hotspots, selectedState]);

  const regionalCorridorsRef = useRef(regionalCorridorsGeoJson);

  // Landslide susceptibility heatmap points derived from regional belts + active hotspots
  const susceptibilityGeoJson = useMemo(() => {
    const hotspotFeatures = (hotspots || []).map((h) => ({
      type: "Feature" as const,
      properties: {
        weight: h.severity === "Critical" ? 1 : h.severity === "Warning" ? 0.78 : 0.4,
        label: h.title,
      },
      geometry: {
        type: "Point" as const,
        coordinates: h.coordinates,
      },
    }));

    const baselineFeatures = SUSCEPTIBILITY_BASELINE_ZONES.map((z) => ({
      type: "Feature" as const,
      properties: {
        weight: z.weight,
        label: z.label,
      },
      geometry: {
        type: "Point" as const,
        coordinates: z.coordinates,
      },
    }));

    return {
      type: "FeatureCollection" as const,
      features: [...baselineFeatures, ...hotspotFeatures],
    };
  }, [hotspots]);

  const susceptibilityRef = useRef(susceptibilityGeoJson);

  // 24h Rainfall intensity GeoJSON derived from active hotspots & regional telemetry
  const rainfallGeoJson = useMemo(() => {
    const basePoints =
      hotspots && hotspots.length > 0
        ? hotspots.map((h) => ({
            coordinates: h.coordinates,
            mm: parseRainfallMm(h.rainfall24h, h.severity),
            label: `${h.code}: ${h.rainfall24h || `${parseRainfallMm(h.rainfall24h, h.severity)} mm / 24h`}`,
          }))
        : SUSCEPTIBILITY_BASELINE_ZONES.slice(0, 4).map((z, idx) => ({
            coordinates: z.coordinates,
            mm: [172, 148, 118, 96][idx] || 72,
            label: z.label,
          }));

    return {
      type: "FeatureCollection" as const,
      features: basePoints.map((pt, i) => ({
        type: "Feature" as const,
        properties: {
          id: `rain-${i}`,
          mm: pt.mm,
          intensity: Math.min(1, Math.max(0.2, pt.mm / 180)),
          label: pt.label,
        },
        geometry: {
          type: "Point" as const,
          coordinates: pt.coordinates,
        },
      })),
    };
  }, [hotspots]);

  const rainfallRef = useRef(rainfallGeoJson);

  // Synchronize latest prop/state values into refs outside render
  useEffect(() => {
    effectiveLayersRef.current = effectiveLayers;
    isControlledLayersRef.current = isControlledLayers;
    terrainModeRef.current = terrainMode;
    riskFilterRef.current = riskFilter;
    hotspotsRef.current = hotspots;
    activeHotspotIdRef.current = activeHotspotId;
    onSelectHotspotRef.current = onSelectHotspot;
    onSelectCorridorRef.current = onSelectCorridor;
    onMapLoadedRef.current = onMapLoaded;
    onMapErrorRef.current = onMapError;
    terrainEnabledRef.current = terrainEnabled;
    riskHeatmapEnabledRef.current = riskHeatmapEnabled;
    rescueRouteEnabledRef.current = rescueRouteEnabled;
    fieldSensorsEnabledRef.current = fieldSensorsEnabled;
    simulatedCorridorDataRef.current = simulatedCorridorData;
    simulatedSensorsDataRef.current = simulatedSensorsData;
    regionalCorridorsRef.current = regionalCorridorsGeoJson;
    susceptibilityRef.current = susceptibilityGeoJson;
    rainfallRef.current = rainfallGeoJson;
  });

  // Helper: sync interactive regional hotspot HTML markers
  const syncHotspotMarkers = React.useCallback((map: mapboxgl.Map) => {
    const list = hotspotsRef.current;
    const markersMap = hotspotMarkersRef.current;

    if (!list) {
      markersMap.forEach(({ marker }) => marker.remove());
      markersMap.clear();
      return;
    }

    const showMarkers = effectiveLayersRef.current.hotspots;
    const onlyCritical = riskFilterRef.current === "critical";
    const activeId = activeHotspotIdRef.current;

    const visibleList = showMarkers
      ? onlyCritical
        ? list.filter((h) => h.severity === "Critical")
        : list
      : [];

    const visibleIds = new Set(visibleList.map((h) => h.id));

    // Remove markers no longer visible
    markersMap.forEach((entry, id) => {
      if (!visibleIds.has(id)) {
        entry.marker.remove();
        markersMap.delete(id);
      }
    });

    // Add or update visible hotspot markers
    visibleList.forEach((hotspot) => {
      const existing = markersMap.get(hotspot.id);
      if (existing) {
        existing.marker.remove();
        markersMap.delete(hotspot.id);
      }

      const isFocused = activeId === hotspot.id;
      const isCrit = hotspot.severity === "Critical";
      const isWarn = hotspot.severity === "Warning";

      const coreColor = isCrit ? "#DC2626" : isWarn ? "#EAB308" : "#16A34A";
      const haloInner = isCrit
        ? "rgba(220, 38, 38, 0.34)"
        : isWarn
        ? "rgba(245, 158, 11, 0.32)"
        : "rgba(22, 163, 74, 0.28)";
      const haloOuter = isCrit
        ? "rgba(220, 38, 38, 0.14)"
        : isWarn
        ? "rgba(245, 158, 11, 0.14)"
        : "rgba(22, 163, 74, 0.12)";

      const el = document.createElement("div");
      el.className = "terra-hotspot-marker";
      el.style.cursor = "pointer";
      el.style.display = "flex";
      el.style.alignItems = "center";
      el.style.justifyContent = "center";
      el.setAttribute("role", "button");
      el.setAttribute("aria-label", `${hotspot.title} (${hotspot.severity})`);

      const outerSize = isFocused ? 54 : isCrit ? 48 : 42;
      const midSize = isFocused ? 38 : isCrit ? 34 : 30;
      const coreSize = isFocused ? 28 : 24;

      const markerGlyph = isCrit
        ? `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" aria-hidden="true"><line x1="6" y1="12" x2="18" y2="12"/></svg>`
        : isWarn
        ? `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>`
        : `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>`;

      el.innerHTML = `
        <div style="position:relative;display:flex;align-items:center;justify-content:center;width:${outerSize}px;height:${outerSize}px;">
          <span style="position:absolute;inset:0;border-radius:9999px;background:${haloOuter};${
            isCrit || isFocused ? "animation:obstacle-beacon-pulse 2.2s ease-in-out infinite;" : ""
          }"></span>
          <span style="position:absolute;width:${midSize}px;height:${midSize}px;border-radius:9999px;background:${haloInner};"></span>
          <span style="position:relative;width:${coreSize}px;height:${coreSize}px;border-radius:9999px;background:${coreColor};border:${
            isFocused ? "2.5px solid #FAF8F2" : "2px solid #FFFFFF"
          };box-shadow:0 3px 10px rgba(0,0,0,0.28)${
            isFocused ? `, 0 0 0 3px ${coreColor}` : ""
          };display:flex;align-items:center;justify-content:center;transition:transform 0.18s ease;">
            ${markerGlyph}
          </span>
        </div>
      `;

      const badgeBg = isCrit ? "#FEE2E2" : isWarn ? "#FEF3C7" : "#DCFCE7";
      const badgeText = isCrit ? "#B91C1C" : isWarn ? "#B45309" : "#166534";

      const popup = new mapboxgl.Popup({
        offset: 18,
        closeButton: true,
        maxWidth: "260px",
      }).setHTML(`
        <div style="font-family:system-ui,-apple-system,sans-serif;padding:4px 6px;color:#173D32;min-width:190px;">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px;">
            <strong style="font-size:12px;font-weight:800;color:#173D32;">${escapeHtml(hotspot.title)}</strong>
            <span style="font-size:10px;font-weight:700;padding:2px 7px;border-radius:9999px;background:${badgeBg};color:${badgeText};white-space:nowrap;">
              ${escapeHtml(hotspot.severity === "Normal" ? "Safe" : hotspot.severity)}
            </span>
          </div>
          <div style="font-size:11px;color:#4B5563;font-weight:600;">${escapeHtml(hotspot.region)}</div>
          ${
            hotspot.statusReason
              ? `<div style="font-size:10.5px;color:#374151;margin-top:5px;line-height:1.4;background:#F6F4EC;padding:5px 7px;border-radius:6px;">${escapeHtml(hotspot.statusReason)}</div>`
              : ""
          }
        </div>
      `);

      el.addEventListener("click", (ev) => {
        ev.stopPropagation();
        if (onSelectHotspotRef.current) {
          onSelectHotspotRef.current(hotspot);
        }
      });

      const marker = new mapboxgl.Marker({ element: el, anchor: "center" })
        .setLngLat(hotspot.coordinates)
        .setPopup(popup)
        .addTo(map);

      markersMap.set(hotspot.id, { marker, el });
    });
  }, []);

  // Helper: sync obstacle marker visibility (hide at low regional zoom when regional hotspots are active)
  const syncObstacleMarkerVisibility = React.useCallback((map: mapboxgl.Map) => {
    const obstacleMarker = obstacleMarkerRef.current;
    if (!obstacleMarker) return;
    const el = obstacleMarker.getElement();
    if (!el) return;

    const hasRegionalHotspots = hotspotsRef.current !== undefined;
    const hotspotsVisible = effectiveLayersRef.current.hotspots;
    if (!hotspotsVisible) {
      el.style.display = "none";
      return;
    }
    if (hasRegionalHotspots) {
      el.style.display = map.getZoom() >= 9.5 ? "flex" : "none";
    } else {
      el.style.display = "flex";
    }
  }, []);

  // Helper: synchronize all controlled & internal layer visibilities, terrain, and filters
  const syncAllLayersAndFilters = React.useCallback(
    (map: mapboxgl.Map) => {
      if (!map.isStyleLoaded()) return;

      const controlled = isControlledLayersRef.current;
      const layers = effectiveLayersRef.current;
      const mode = terrainModeRef.current;
      const onlyCritical = riskFilterRef.current === "critical";

      const isFlatMode = mode === "flat";
      const showTerrainDem = controlled
        ? layers.hillshade !== undefined
          ? layers.hillshade
          : !isFlatMode
        : terrainEnabledRef.current;
      const showHillshade = controlled
        ? layers.hillshade !== undefined
          ? layers.hillshade
          : !isFlatMode && (layers.slopeElevation || mode === "terrain" || mode === "light")
        : terrainEnabledRef.current;
      const showCorridors = controlled ? layers.corridors : riskHeatmapEnabledRef.current;
      const showHazardHeatmap = controlled
        ? layers.hazardHeatmap !== undefined
          ? layers.hazardHeatmap
          : layers.corridors
        : riskHeatmapEnabledRef.current;
      const showRescue = controlled
        ? layers.rescueRoute !== undefined
          ? layers.rescueRoute
          : layers.corridors
        : rescueRouteEnabledRef.current;
      const showSensors = controlled
        ? layers.fieldSensors !== undefined
          ? layers.fieldSensors
          : layers.hotspots
        : fieldSensorsEnabledRef.current;

      try {
        if (map.getSource("mapbox-dem")) {
          const exaggeration = layers.slopeElevation ? 2.1 : 1.5;
          map.setTerrain(showTerrainDem ? { source: "mapbox-dem", exaggeration } : null);
        }
        if (map.getLayer("terrain-hillshade")) {
          map.setLayoutProperty("terrain-hillshade", "visibility", showHillshade ? "visible" : "none");
          map.setPaintProperty(
            "terrain-hillshade",
            "hillshade-exaggeration",
            layers.slopeElevation ? 0.88 : 0.65
          );
        }

        // Corridor line layers
        ["corridor-layer", "corridor-lines"].forEach((layerId) => {
          if (map.getLayer(layerId)) {
            map.setLayoutProperty(layerId, "visibility", showCorridors ? "visible" : "none");
            map.setFilter(
              layerId,
              onlyCritical
                ? ["==", ["downcase", ["to-string", ["get", "status"]]], "critical"]
                : null
            );
          }
        });

        // Hazard risk heatmap glow layer
        if (map.getLayer("hazard-risk-heatmap")) {
          map.setLayoutProperty("hazard-risk-heatmap", "visibility", showHazardHeatmap ? "visible" : "none");
          map.setFilter(
            "hazard-risk-heatmap",
            onlyCritical
              ? ["==", ["downcase", ["to-string", ["get", "status"]]], "critical"]
              : null
          );
        }

        if (map.getLayer("regional-corridors-layer")) {
          map.setLayoutProperty(
            "regional-corridors-layer",
            "visibility",
            showCorridors && hotspotsRef.current !== undefined ? "visible" : "none"
          );
          map.setFilter(
            "regional-corridors-layer",
            onlyCritical
              ? ["==", ["downcase", ["to-string", ["get", "riskLevel"]]], "critical"]
              : null
          );
        }

        // Rescue detour routes
        ["rescue-route-lines", "rescue-route-line"].forEach((layerId) => {
          if (map.getLayer(layerId)) {
            map.setLayoutProperty(layerId, "visibility", showRescue ? "visible" : "none");
          }
        });

        // Field sensor nodes
        ["field-sensors-glow", "field-sensors-point"].forEach((layerId) => {
          if (map.getLayer(layerId)) {
            map.setLayoutProperty(layerId, "visibility", showSensors ? "visible" : "none");
            map.setFilter(
              layerId,
              onlyCritical
                ? ["in", ["downcase", ["to-string", ["get", "status"]]], ["literal", ["exceeding", "critical"]]]
                : null
            );
          }
        });

        // Landslide susceptibility layer
        ["landslide-susceptibility-heat", "landslide-susceptibility-zones"].forEach((layerId) => {
          if (map.getLayer(layerId)) {
            const susVisible =
              layers.susceptibility || (controlled && layers.hazardHeatmap === true);
            map.setLayoutProperty(
              layerId,
              "visibility",
              susVisible ? "visible" : "none"
            );
          }
        });

        // Rainfall (24h) layer
        ["rainfall-24h-heat", "rainfall-24h-points"].forEach((layerId) => {
          if (map.getLayer(layerId)) {
            map.setLayoutProperty(layerId, "visibility", layers.rainfall ? "visible" : "none");
          }
        });

        // Slope / Elevation contours layer
        if (map.getLayer("slope-elevation-contours")) {
          map.setLayoutProperty(
            "slope-elevation-contours",
            "visibility",
            layers.slopeElevation ? "visible" : "none"
          );
        }
      } catch (err) {
        console.warn("Layer sync warning:", err);
      }

      syncHotspotMarkers(map);
      syncObstacleMarkerVisibility(map);
    },
    [syncHotspotMarkers, syncObstacleMarkerVisibility]
  );

  // Target segment (NH-29 Pherima Slide Cut) live telemetry values
  const targetSegment = simulatedCorridorData.features.find(
    (f: any) => f.properties?.id === "nh29-seg-3"
  );
  const targetProps = (targetSegment?.properties || {
    status: "critical",
    soil_moisture_pct: 84,
    pore_water_pressure_kpa: 210,
    tilt_rate_mm_h: 0.28,
  }) as Record<string, any>;
  const isPorePressureCritical = (targetProps.pore_water_pressure_kpa || 0) >= 200;
  const rainfallIntensity = 84;

  const initialCenterLng = center[0];
  const initialCenterLat = center[1];

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!hasValidToken) {
      console.warn(
        "Mapbox Access Token is missing. Set NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN in Vercel environment variables to enable 3D terrain and interactive telemetry."
      );
      return;
    }

    // Securely set Mapbox access token
    mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;

    // Initialize Mapbox map instance
    const initialStyle = terrainModeRef.current
      ? TERRAIN_STYLE_MAP[terrainModeRef.current]
      : "mapbox://styles/mapbox/light-v11";
    activeStyleUrlRef.current = initialStyle;

    let map: mapboxgl.Map;
    try {
      map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: initialStyle,
        center: [initialCenterLng, initialCenterLat],
        zoom,
        pitch,
        bearing,
        antialias: true,
      });
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Unable to initialize interactive Mapbox terrain engine.";
      console.warn("Mapbox initialization error:", msg);
      onMapErrorRef.current?.(msg);
      return;
    }

    mapInstanceRef.current = map;
    if (typeof window !== "undefined") {
      (window as any).__riskMap = map;
    }

    // Add navigation controls (top-right)
    if (showControls) {
      map.addControl(
        new mapboxgl.NavigationControl({ visualizePitch: true }),
        "top-right"
      );
    }

    // Optional metric scale bar
    if (showScaleControl) {
      map.addControl(
        new mapboxgl.ScaleControl({ maxWidth: 110, unit: "metric" }),
        scalePosition
      );
    }

    const handleMapError = (event: mapboxgl.ErrorEvent) => {
      const message = event?.error?.message || "";
      if (message && /token|unauthorized|401|403|webgl/i.test(message)) {
        onMapErrorRef.current?.(message);
      }
    };
    map.on("error", handleMapError);

    let listenersAttached = false;
    let sensorTooltipPopup: mapboxgl.Popup | null = null;
    const hotspotMarkers = hotspotMarkersRef.current;

    const handleZoomChange = () => {
      syncObstacleMarkerVisibility(map);
    };
    map.on("zoom", handleZoomChange);

    map.on("style.load", () => {
      const layersState = effectiveLayersRef.current;
      const controlled = isControlledLayersRef.current;
      const isTerrainActive = controlled
        ? terrainModeRef.current !== "flat"
        : terrainEnabledRef.current;
      const isCorridorsActive = controlled
        ? layersState.corridors
        : riskHeatmapEnabledRef.current;
      const isRescueActive = controlled
        ? layersState.corridors
        : rescueRouteEnabledRef.current;
      const isSensorsActive = controlled
        ? layersState.hotspots
        : fieldSensorsEnabledRef.current;

      // 1. Add 3D Mountain Terrain (mapbox-dem raster-dem with 1.5 exaggeration)
      if (!map.getSource("mapbox-dem")) {
        map.addSource("mapbox-dem", {
          type: "raster-dem",
          url: "mapbox://mapbox.mapbox-terrain-dem-v1",
          tileSize: 512,
        });
      }

      if (isTerrainActive) {
        map.setTerrain({
          source: "mapbox-dem",
          exaggeration: layersState.slopeElevation ? 2.1 : 1.5,
        });
      }

      // 2. Locate first symbol layer to preserve clean label visibility
      const layers = map.getStyle()?.layers;
      let labelLayerId: string | undefined;

      if (layers) {
        for (const layer of layers) {
          if (
            layer.type === "symbol" &&
            layer.layout &&
            "text-field" in layer.layout
          ) {
            labelLayerId = layer.id;
            break;
          }
        }
      }

      // 3. Add Terrain Hillshade Layer with dedicated source for full resolution
      if (!map.getSource("mapbox-dem-hillshade")) {
        map.addSource("mapbox-dem-hillshade", {
          type: "raster-dem",
          url: "mapbox://mapbox.mapbox-terrain-dem-v1",
          tileSize: 512,
        });
      }

      if (!map.getLayer("terrain-hillshade")) {
        map.addLayer(
          {
            id: "terrain-hillshade",
            type: "hillshade",
            source: "mapbox-dem-hillshade",
            layout: {
              visibility: isTerrainActive ? "visible" : "none",
            },
            paint: {
              "hillshade-exaggeration": layersState.slopeElevation ? 0.88 : 0.65,
              "hillshade-shadow-color": "#173D32",
              "hillshade-highlight-color": "#ffffff",
            },
          },
          labelLayerId
        );
      }

      // 4. Insert fill-extrusion 3D building layer beneath labels (when composite source exists)
      if (map.getSource("composite") && !map.getLayer("3d-buildings")) {
        map.addLayer(
          {
            id: "3d-buildings",
            source: "composite",
            "source-layer": "building",
            filter: ["==", "extrude", "true"],
            type: "fill-extrusion",
            minzoom: 14,
            paint: {
              "fill-extrusion-color": "#e8e5df",
              "fill-extrusion-height": ["get", "height"],
              "fill-extrusion-base": ["get", "min_height"],
              "fill-extrusion-opacity": 0.9,
            },
          },
          labelLayerId
        );
      }

      // 5. Directional lighting for soft lateral drop shadows
      map.setLight({
        anchor: "viewport",
        position: [1.5, 90, 45],
        intensity: 0.35,
      });

      // 6. Custom layer tints for light-v11 base style: water #98ddf2, greenways #d7ebd6
      if (activeStyleUrlRef.current.includes("light-v11")) {
        if (map.getLayer("water")) {
          try {
            map.setPaintProperty("water", "fill-color", "#98ddf2");
          } catch {
            // ignore
          }
        }

        const greenwayLayerIds = [
          "landcover",
          "landuse",
          "national-park",
          "park",
          "greenway",
          "natural-point-label",
        ];
        greenwayLayerIds.forEach((layerId) => {
          if (map.getLayer(layerId)) {
            try {
              map.setPaintProperty(layerId, "fill-color", "#d7ebd6");
            } catch {
              // ignore
            }
          }
        });
      }

      // 7. Add corridorRoutes GeoJSON source
      if (!map.getSource("corridor-routes")) {
        map.addSource("corridor-routes", {
          type: "geojson",
          data: simulatedCorridorDataRef.current as mapboxgl.GeoJSONSourceSpecification["data"],
        });
      }

      // 7b. Add Regional Highway Corridor Arcs source & layer (for Northeast sector overview)
      if (!map.getSource("regional-corridors")) {
        map.addSource("regional-corridors", {
          type: "geojson",
          data: regionalCorridorsRef.current as mapboxgl.GeoJSONSourceSpecification["data"],
        });
      }

      if (!map.getLayer("regional-corridors-layer")) {
        map.addLayer(
          {
            id: "regional-corridors-layer",
            type: "line",
            source: "regional-corridors",
            layout: {
              visibility:
                isCorridorsActive && hotspotsRef.current !== undefined
                  ? "visible"
                  : "none",
              "line-join": "round",
              "line-cap": "round",
            },
            paint: {
              "line-width": ["interpolate", ["linear"], ["zoom"], 6, 3, 12, 5],
              "line-opacity": 0.9,
              "line-color": [
                "match",
                ["downcase", ["to-string", ["get", "riskLevel"]]],
                "critical",
                "#EF4444",
                "warning",
                "#F59E0B",
                "safe",
                "#22C55E",
                "#F59E0B",
              ],
            },
          },
          labelLayerId
        );
      }

      // 7c. Landslide Susceptibility heatmap + soft zone circles
      if (!map.getSource("landslide-susceptibility")) {
        map.addSource("landslide-susceptibility", {
          type: "geojson",
          data: susceptibilityRef.current as mapboxgl.GeoJSONSourceSpecification["data"],
        });
      }

      if (!map.getLayer("landslide-susceptibility-heat")) {
        map.addLayer(
          {
            id: "landslide-susceptibility-heat",
            type: "heatmap",
            source: "landslide-susceptibility",
            layout: {
              visibility: layersState.susceptibility ? "visible" : "none",
            },
            paint: {
              "heatmap-weight": ["coalesce", ["get", "weight"], 0.7],
              "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 4, 0.9, 11, 1.8],
              "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 4, 28, 11, 52],
              "heatmap-opacity": 0.72,
              "heatmap-color": [
                "interpolate",
                ["linear"],
                ["heatmap-density"],
                0,
                "rgba(22, 163, 74, 0)",
                0.25,
                "rgba(34, 197, 94, 0.45)",
                0.55,
                "rgba(245, 158, 11, 0.72)",
                0.85,
                "rgba(220, 38, 38, 0.88)",
              ],
            },
          },
          labelLayerId
        );
      }

      // 7d. Rainfall (24h) heatmap overlay
      if (!map.getSource("rainfall-24h")) {
        map.addSource("rainfall-24h", {
          type: "geojson",
          data: rainfallRef.current as mapboxgl.GeoJSONSourceSpecification["data"],
        });
      }

      if (!map.getLayer("rainfall-24h-heat")) {
        map.addLayer(
          {
            id: "rainfall-24h-heat",
            type: "heatmap",
            source: "rainfall-24h",
            layout: {
              visibility: layersState.rainfall ? "visible" : "none",
            },
            paint: {
              "heatmap-weight": ["coalesce", ["get", "intensity"], 0.6],
              "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 4, 1, 11, 2],
              "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 4, 34, 11, 60],
              "heatmap-opacity": 0.75,
              "heatmap-color": [
                "interpolate",
                ["linear"],
                ["heatmap-density"],
                0,
                "rgba(56, 189, 248, 0)",
                0.3,
                "rgba(56, 189, 248, 0.45)",
                0.65,
                "rgba(37, 99, 235, 0.75)",
                1,
                "rgba(30, 58, 138, 0.92)",
              ],
            },
          },
          labelLayerId
        );
      }

      // 7e. Slope / Elevation topographic contour lines
      try {
        if (!map.getSource("mapbox-terrain-contours")) {
          map.addSource("mapbox-terrain-contours", {
            type: "vector",
            url: "mapbox://mapbox.mapbox-terrain-v2",
          });
        }
        if (!map.getLayer("slope-elevation-contours")) {
          map.addLayer(
            {
              id: "slope-elevation-contours",
              type: "line",
              source: "mapbox-terrain-contours",
              "source-layer": "contour",
              layout: {
                visibility: layersState.slopeElevation ? "visible" : "none",
                "line-join": "round",
                "line-cap": "round",
              },
              paint: {
                "line-color": "#D6A65D",
                "line-opacity": 0.62,
                "line-width": ["interpolate", ["linear"], ["zoom"], 5, 0.6, 12, 1.3],
              },
            },
            labelLayerId
          );
        }
      } catch {
        // Non-blocking fallback if contour vector source is unavailable
      }

      // 8. Hazard Risk Heatmap Glow Layer (underneath main corridor lines)
      if (!map.getLayer("hazard-risk-heatmap")) {
        map.addLayer(
          {
            id: "hazard-risk-heatmap",
            type: "line",
            source: "corridor-routes",
            layout: {
              visibility: isCorridorsActive ? "visible" : "none",
              "line-join": "round",
              "line-cap": "round",
            },
            paint: {
              "line-width": 18,
              "line-blur": 10,
              "line-opacity": 0.7,
              "line-color": [
                "match",
                ["downcase", ["to-string", ["get", "status"]]],
                "safe",
                "#00E676",
                "warning",
                "#FFA500",
                "critical",
                "#FF0000",
                /* fallback */
                "#FFA500",
              ],
            },
          },
          labelLayerId
        );
      }

      // 9. Main Corridor Line Layer (width 6px, status colored)
      if (!map.getLayer("corridor-layer")) {
        map.addLayer(
          {
            id: "corridor-layer",
            type: "line",
            source: "corridor-routes",
            layout: {
              visibility: isCorridorsActive ? "visible" : "none",
              "line-join": "round",
              "line-cap": "round",
            },
            paint: {
              "line-width": 6,
              "line-color": [
                "match",
                ["downcase", ["to-string", ["get", "status"]]],
                "safe",
                "#00E676",
                "warning",
                "#FFA500",
                "critical",
                "#FF0000",
                /* fallback */
                "#FFA500",
              ],
            },
          },
          labelLayerId
        );
      }

      if (!map.getLayer("corridor-lines")) {
        map.addLayer(
          {
            id: "corridor-lines",
            type: "line",
            source: "corridor-routes",
            layout: {
              visibility: isCorridorsActive ? "visible" : "none",
              "line-join": "round",
              "line-cap": "round",
            },
            paint: {
              "line-width": 6,
              "line-color": [
                "match",
                ["downcase", ["to-string", ["get", "status"]]],
                "safe",
                "#00E676",
                "warning",
                "#FFA500",
                "critical",
                "#FF0000",
                /* fallback */
                "#FFA500",
              ],
            },
          },
          labelLayerId
        );
      }

      // 10. Add rescueRoute GeoJSON source & dashed electric blue line layer (#00B0FF, line-dasharray: [2, 2])
      if (!map.getSource("rescue-route")) {
        map.addSource("rescue-route", {
          type: "geojson",
          data: rescueRoute as any,
        });
      }

      if (!map.getLayer("rescue-route-lines")) {
        map.addLayer(
          {
            id: "rescue-route-lines",
            type: "line",
            source: "rescue-route",
            layout: {
              visibility: isRescueActive ? "visible" : "none",
              "line-join": "round",
              "line-cap": "round",
            },
            paint: {
              "line-width": 4.5,
              "line-color": "#00B0FF",
              "line-dasharray": [2, 2],
            },
          },
          labelLayerId
        );
      }

      // 10b. Add Field Sensors GeoJSON point source & status-glowing circle layers along Pherima cut
      if (!map.getSource("field-sensors")) {
        map.addSource("field-sensors", {
          type: "geojson",
          data: simulatedSensorsDataRef.current as mapboxgl.GeoJSONSourceSpecification["data"],
        });
      }

      // Outer status-colored aura glow layer (Green = Normal, Red = Exceeding Threshold)
      if (!map.getLayer("field-sensors-glow")) {
        map.addLayer(
          {
            id: "field-sensors-glow",
            type: "circle",
            source: "field-sensors",
            layout: {
              visibility: isSensorsActive ? "visible" : "none",
            },
            paint: {
              "circle-radius": [
                "interpolate",
                ["linear"],
                ["zoom"],
                10,
                8,
                13.5,
                12,
                16,
                17,
              ],
              "circle-color": [
                "match",
                ["downcase", ["to-string", ["get", "status"]]],
                "exceeding",
                "#FF0000",
                "critical",
                "#FF0000",
                "#00E676",
              ],
              "circle-blur": 0.65,
              "circle-opacity": 0.85,
            },
          },
          labelLayerId
        );
      }

      // Inner crisp circular sensor node pin
      if (!map.getLayer("field-sensors-point")) {
        map.addLayer(
          {
            id: "field-sensors-point",
            type: "circle",
            source: "field-sensors",
            layout: {
              visibility: isSensorsActive ? "visible" : "none",
            },
            paint: {
              "circle-radius": [
                "interpolate",
                ["linear"],
                ["zoom"],
                10,
                4,
                13.5,
                6,
                16,
                8,
              ],
              "circle-color": [
                "match",
                ["downcase", ["to-string", ["get", "status"]]],
                "exceeding",
                "#FF0000",
                "critical",
                "#FF0000",
                "#00E676",
              ],
              "circle-stroke-width": 2,
              "circle-stroke-color": "#FFFFFF",
              "circle-stroke-opacity": 1.0,
              "circle-opacity": 1.0,
            },
          },
          labelLayerId
        );
      }

      // 10c. Hover & click handlers (attach once per map instance across style switches)
      if (!listenersAttached) {
        listenersAttached = true;

      const handleSensorMouseEnter = (e: mapboxgl.MapLayerMouseEvent) => {
        map.getCanvas().style.cursor = "pointer";
        if (!e.features || !e.features[0]) return;

        const feature = e.features[0] as any;
        const props = (feature.properties || {}) as Record<string, any>;
        const coordinates = ((feature.geometry && feature.geometry.coordinates) || []).slice();
        const id = props.id || props.sensor_id || "DAS-NODE-04";
        const name = props.name || "Slope Field Sensor";
        const type = props.type || "DAS Fiber Interferometer";
        const location = props.location || "Pherima Slope Cut";
        const strain = props.slope_strain || `${props.strain_microstrain || 48} µε`;
        const status = String(props.status || "normal").toLowerCase();
        const isExceeding = status === "exceeding" || status === "critical";
        const statusLabel = isExceeding ? "Exceeding Threshold" : "Normal";
        const statusColor = isExceeding ? "#DC2626" : "#16A34A";
        const statusBg = isExceeding ? "#FEF2F2" : "#ECFDF5";
        const statusBorder = isExceeding ? "#FECACA" : "#A7F3D0";
        const depth = props.depth
          ? `<div style="color: #6B7280; font-size: 9.5px; margin-top: 2px;">📍 ${location} • ${props.depth}</div>`
          : "";

        const tooltipHTML = `
          <div style="font-family: system-ui, -apple-system, sans-serif; padding: 7px 9px; min-width: 215px; color: #173D32;">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 3px;">
              <span style="font-weight: 800; font-size: 11.5px; letter-spacing: 0.03em; color: #111827; display: flex; align-items: center; gap: 5px;">
                <span style="display: inline-block; width: 7px; height: 7px; border-radius: 9999px; background-color: ${statusColor}; box-shadow: 0 0 6px ${statusColor};"></span>
                ${id}
              </span>
              <span style="font-size: 9px; font-weight: 800; text-transform: uppercase; padding: 2px 6px; border-radius: 4px; background-color: ${statusBg}; color: ${statusColor}; border: 1px solid ${statusBorder};">
                ${statusLabel}
              </span>
            </div>
            <div style="font-size: 10.5px; color: #374151; font-weight: 700; margin-bottom: 2px;">
              ${type}
            </div>
            ${depth}
            <div style="margin-top: 6px; display: flex; align-items: center; justify-content: space-between; background-color: #F8FAFC; padding: 4px 8px; border-radius: 6px; border: 1px solid #E2E8F0; font-size: 10.5px;">
              <span style="color: #4B5563; font-weight: 600;">Slope Strain:</span>
              <span style="font-weight: 800; color: ${statusColor};">${strain}</span>
            </div>
          </div>
        `;

        if (sensorTooltipPopup) {
          sensorTooltipPopup.remove();
        }

        sensorTooltipPopup = new mapboxgl.Popup({
          closeButton: false,
          closeOnClick: false,
          offset: 12,
          className: "sensor-node-tooltip",
        })
          .setLngLat(coordinates)
          .setHTML(tooltipHTML)
          .addTo(map);
      };

      const handleSensorMouseLeave = () => {
        map.getCanvas().style.cursor = "";
        if (sensorTooltipPopup) {
          sensorTooltipPopup.remove();
          sensorTooltipPopup = null;
        }
      };

      map.on("mouseenter", "field-sensors-point", handleSensorMouseEnter);
      map.on("mouseleave", "field-sensors-point", handleSensorMouseLeave);
      map.on("mouseenter", "field-sensors-glow", handleSensorMouseEnter);
      map.on("mouseleave", "field-sensors-glow", handleSensorMouseLeave);

      // 11. Telemetry Popups: Click listener on corridor segments
      const handleCorridorClick = (e: mapboxgl.MapLayerMouseEvent) => {
        if (!e.features || !e.features[0]) return;
        const feature = e.features[0] as any;
        const props = (feature.properties || {}) as Record<string, any>;

        if (onSelectCorridorRef.current) {
          onSelectCorridorRef.current(
            props.corridor || props.code || props.id || props.segment_name || "corridor",
            props
          );
        }

        const segmentName = props.segment_name || props.name || "NH-29 Pherima Slide Cut";
        const status = props.status || props.riskStatus || "critical";
        const statusLower = String(status).toLowerCase();
        const isRedOrOrange =
          statusLower === "critical" ||
          statusLower === "warning" ||
          statusLower === "blocked" ||
          statusLower === "caution";

        const soilMoisture =
          props.soil_moisture_pct !== undefined
            ? `${props.soil_moisture_pct}%`
            : props.soilMoisture || "84%";
        const poreWaterPressure =
          props.pore_water_pressure_kpa !== undefined
            ? `${props.pore_water_pressure_kpa} kPa`
            : props.poreWaterPressure || "210 kPa";
        const tiltRate =
          props.tilt_rate_mm_h !== undefined
            ? `${props.tilt_rate_mm_h} mm/h`
            : props.tiltRate || "0.28 mm/h";

        const badgeBg =
          statusLower === "critical"
            ? "#FF0000"
            : statusLower === "warning"
              ? "#FFA500"
              : "#00E676";

        const popupHTML = `
          <div style="font-family: system-ui, -apple-system, sans-serif; padding: 6px; min-width: 250px; color: #173D32;">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px; border-bottom: 1px solid rgba(23,61,50,0.15); padding-bottom: 6px;">
              <div style="font-weight: 800; font-size: 13px; line-height: 1.3;">
                ${segmentName}
              </div>
              <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; padding: 2px 8px; border-radius: 9999px; background-color: ${badgeBg}; color: #ffffff; white-space: nowrap;">
                ${status}
              </span>
            </div>

            <div style="font-size: 11.5px; line-height: 1.6; background-color: #F6F4EC; padding: 8px 10px; border-radius: 8px; border: 1px solid rgba(23,61,50,0.1); margin-bottom: 8px;">
              <div><strong style="color: #173D32;">Segment Name:</strong> ${segmentName}</div>
              <div><strong style="color: #173D32;">Status:</strong> ${status}</div>
              <div><strong style="color: #173D32;">Soil Moisture:</strong> ${soilMoisture}</div>
              <div><strong style="color: #173D32;">Pore-Water Pressure:</strong> ${poreWaterPressure}</div>
              <div><strong style="color: #173D32;">Tilt Rate:</strong> ${tiltRate}</div>
            </div>

            ${isRedOrOrange
            ? `
              <button
                id="dispatch-rescue-btn"
                type="button"
                style="
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  gap: 6px;
                  width: 100%;
                  padding: 8px 12px;
                  background-color: #DC2626;
                  color: #FFFFFF;
                  font-size: 11.5px;
                  font-weight: 800;
                  border-radius: 8px;
                  border: none;
                  cursor: pointer;
                  box-shadow: 0 2px 4px rgba(220,38,38,0.25);
                  transition: all 0.2s ease-in-out;
                "
                onmouseover="this.style.backgroundColor='#B91C1C'; this.style.transform='translateY(-1px)';"
                onmouseout="this.style.backgroundColor='#DC2626'; this.style.transform='translateY(0)';"
              >
                <span>🚑</span> Dispatch Rescue Unit to Detour
              </button>
            `
            : ""
          }
          </div>
        `;

        new mapboxgl.Popup({ offset: 12, closeButton: true, maxWidth: "320px" })
          .setLngLat(e.lngLat)
          .setHTML(popupHTML)
          .addTo(map);

        // Interactive dispatch action handler
        if (isRedOrOrange) {
          setTimeout(() => {
            const btn = document.getElementById("dispatch-rescue-btn");
            if (btn) {
              btn.onclick = () => {
                btn.innerHTML = "<span>✅</span> Rescue Unit Dispatched to Detour";
                btn.style.backgroundColor = "#16A34A";
                btn.style.boxShadow = "0 2px 4px rgba(22,163,74,0.25)";

                // Ensure rescue detour layer is visible and highlighted
                if (map.getLayer("rescue-route-lines")) {
                  map.setLayoutProperty("rescue-route-lines", "visibility", "visible");
                  map.setPaintProperty("rescue-route-lines", "line-width", 6.5);
                }
              };
            }
          }, 60);
        }
      };

      map.on("click", "corridor-layer", handleCorridorClick);
      map.on("click", "corridor-lines", handleCorridorClick);
      map.on("click", "regional-corridors-layer", (e) => {
        if (!e.features || !e.features[0]) return;
        const props = ((e.features[0] as any).properties || {}) as Record<string, any>;
        if (onSelectCorridorRef.current) {
          onSelectCorridorRef.current(props.code || props.id || "corridor", props);
        }
      });

      // Cursor styling on hover over corridor lines
      map.on("mouseenter", "corridor-layer", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "corridor-layer", () => {
        map.getCanvas().style.cursor = "";
      });
      map.on("mouseenter", "corridor-lines", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "corridor-lines", () => {
        map.getCanvas().style.cursor = "";
      });
      map.on("mouseenter", "regional-corridors-layer", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "regional-corridors-layer", () => {
        map.getCanvas().style.cursor = "";
      });

      // Click listener on rescueRoute detour line
      map.on("click", "rescue-route-lines", (e) => {
        if (!e.features || !e.features[0]) return;
        const props = ((e.features[0] as any).properties || {}) as Record<string, any>;
        const name = props.name || "Emergency Relief Corridor";
        const note =
          props.detourNote ||
          "Designated alternate path for NDRF rescue convoys and emergency transit.";

        const detourHTML = `
          <div style="font-family: system-ui, -apple-system, sans-serif; padding: 6px; min-width: 220px; color: #173D32;">
            <div style="font-weight: 800; font-size: 13px; color: #0077B6; margin-bottom: 4px;">
              🚑 ${name}
            </div>
            <div style="font-size: 11px; color: #374151; line-height: 1.45; background-color: #F0F9FF; padding: 6px 8px; border-radius: 6px; border: 1px solid #BAE6FD;">
              ${note}
            </div>
          </div>
        `;

        new mapboxgl.Popup({ offset: 12, closeButton: true, maxWidth: "290px" })
          .setLngLat(e.lngLat)
          .setHTML(detourHTML)
          .addTo(map);
      });

      map.on("mouseenter", "rescue-route-lines", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "rescue-route-lines", () => {
        map.getCanvas().style.cursor = "";
      });
      } // end listenersAttached

      // 12. Custom Pulsing HTML Marker at [94.02, 25.72] (Break point / Slide collapse)
      if (!obstacleMarkerRef.current) {
        const obstacleEl = document.createElement("div");
        obstacleEl.className = "obstacle-pulsing-marker";
        obstacleEl.style.display = "flex";
        obstacleEl.style.flexDirection = "column";
        obstacleEl.style.alignItems = "center";
        obstacleEl.style.cursor = "pointer";
        obstacleEl.style.pointerEvents = "auto";

        obstacleEl.innerHTML = `
          <style>
            @keyframes obstacle-beacon-ping {
              0% { transform: scale(0.9); opacity: 0.9; }
              70%, 100% { transform: scale(2.4); opacity: 0; }
            }
            @keyframes obstacle-beacon-pulse {
              0%, 100% { transform: scale(1); opacity: 0.85; }
              50% { transform: scale(1.35); opacity: 0.35; }
            }
          </style>
          <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 44px; height: 44px;">
            <span style="position: absolute; width: 42px; height: 42px; border-radius: 9999px; background-color: rgba(220, 38, 38, 0.45); animation: obstacle-beacon-ping 1.6s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
            <span style="position: absolute; width: 28px; height: 28px; border-radius: 9999px; background-color: rgba(239, 68, 68, 0.6); animation: obstacle-beacon-pulse 2s ease-in-out infinite;"></span>
            <div style="position: relative; width: 24px; height: 24px; border-radius: 9999px; background-color: #DC2626; border: 2.5px solid #FFFFFF; box-shadow: 0 4px 14px rgba(220, 38, 38, 0.7); display: flex; align-items: center; justify-content: center; font-size: 11px;">
              ⛔
            </div>
          </div>
          <div style="margin-top: 2px; background-color: #173D32; color: #FEE2E2; padding: 3px 9px; border-radius: 6px; font-size: 10px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3); border: 1.5px solid #EF4444; white-space: nowrap; display: flex; align-items: center; gap: 4px;">
            <span style="display: inline-block; width: 6px; height: 6px; border-radius: 9999px; background-color: #EF4444; animation: obstacle-beacon-pulse 1s infinite;"></span>
            SLIDE COLLAPSE - NO PASSAGE
          </div>
        `;

        const obstaclePopup = new mapboxgl.Popup({
          offset: 16,
          closeButton: true,
          maxWidth: "290px",
        }).setHTML(`
          <div style="font-family: system-ui, -apple-system, sans-serif; padding: 6px; color: #173D32;">
            <div style="display: flex; align-items: center; gap: 6px; color: #DC2626; font-weight: 800; font-size: 12px; margin-bottom: 4px;">
              <span>⛔</span> SLIDE COLLAPSE - NO PASSAGE
            </div>
            <div style="font-size: 11px; line-height: 1.5; color: #374151; background: #FEF2F2; padding: 6px 8px; border-radius: 6px; border: 1px solid #FECACA;">
              <strong>Exact Obstacle Location:</strong> [94.02, 25.72]<br/>
              <strong>Highway:</strong> NH-29 Pherima / Dzüdza Gorge<br/>
              <strong>Severity:</strong> Road Severed (60m Collapse)<br/>
              <strong>Action:</strong> Divert via Peducha Alternate Bypass
            </div>
          </div>
        `);

        obstacleMarkerRef.current = new mapboxgl.Marker({ element: obstacleEl, anchor: "center" })
          .setLngLat([94.02, 25.72])
          .setPopup(obstaclePopup)
          .addTo(map);
      }

      syncAllLayersAndFilters(map);

      if (onMapLoadedRef.current) {
        onMapLoadedRef.current(map);
      }
    });

    // Cleanup map instance on unmount
    return () => {
      map.off("zoom", handleZoomChange);
      map.off("error", handleMapError);
      if (sensorTooltipPopup) {
        sensorTooltipPopup.remove();
      }
      if (obstacleMarkerRef.current) {
        obstacleMarkerRef.current.remove();
        obstacleMarkerRef.current = null;
      }
      hotspotMarkers.forEach(({ marker }) => marker.remove());
      hotspotMarkers.clear();

      if (typeof window !== "undefined" && (window as any).__riskMap === map) {
        delete (window as any).__riskMap;
      }
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [initialCenterLng, initialCenterLat, zoom, pitch, bearing, showControls, showScaleControl, scalePosition, syncAllLayersAndFilters, syncObstacleMarkerVisibility]);

  // React to controlled terrainMode changes (switching Mapbox style & 2D/3D pitch cleanly)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !terrainMode) return;

    const targetStyleUrl = TERRAIN_STYLE_MAP[terrainMode];
    if (targetStyleUrl !== activeStyleUrlRef.current) {
      activeStyleUrlRef.current = targetStyleUrl;
      map.setStyle(targetStyleUrl);
    }

    if (map.isStyleLoaded()) {
      syncAllLayersAndFilters(map);
    }

    map.easeTo({
      pitch: terrainMode === "flat" ? 0 : Math.max(pitch, 35),
      duration: 500,
    });
  }, [terrainMode, pitch, syncAllLayersAndFilters]);

  // React to controlled layer visibility, hotspots, active hotspot, and risk filter changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (map.isStyleLoaded()) {
      try {
        const regSource = map.getSource("regional-corridors") as mapboxgl.GeoJSONSource | undefined;
        if (regSource && typeof regSource.setData === "function") {
          regSource.setData(
            regionalCorridorsGeoJson as mapboxgl.GeoJSONSourceSpecification["data"]
          );
        }
        const susSource = map.getSource("landslide-susceptibility") as mapboxgl.GeoJSONSource | undefined;
        if (susSource && typeof susSource.setData === "function") {
          susSource.setData(
            susceptibilityGeoJson as mapboxgl.GeoJSONSourceSpecification["data"]
          );
        }
        const rainSource = map.getSource("rainfall-24h") as mapboxgl.GeoJSONSource | undefined;
        if (rainSource && typeof rainSource.setData === "function") {
          rainSource.setData(
            rainfallGeoJson as mapboxgl.GeoJSONSourceSpecification["data"]
          );
        }
      } catch {
        // ignore source update errors during style transition
      }
      syncAllLayersAndFilters(map);
    } else {
      // Markers can still sync even if style hasn't finished transitioning
      syncHotspotMarkers(map);
      syncObstacleMarkerVisibility(map);
    }
  }, [
    effectiveLayers,
    hotspots,
    activeHotspotId,
    riskFilter,
    regionalCorridorsGeoJson,
    susceptibilityGeoJson,
    rainfallGeoJson,
    syncAllLayersAndFilters,
    syncHotspotMarkers,
    syncObstacleMarkerVisibility,
  ]);

  // Direct HUD Layer Toggle Handlers
  const handleToggleTerrain = (active: boolean) => {
    setTerrainEnabled(active);
    const map = mapInstanceRef.current;
    if (map && map.isStyleLoaded()) {
      try {
        map.setTerrain(active ? { source: "mapbox-dem", exaggeration: 1.5 } : null);
        if (map.getLayer("terrain-hillshade")) {
          map.setLayoutProperty(
            "terrain-hillshade",
            "visibility",
            active ? "visible" : "none"
          );
        }
      } catch (err) {
        console.warn("Terrain toggle warning:", err);
      }
    }
  };

  const handleToggleRiskHeatmap = (active: boolean) => {
    setRiskHeatmapEnabled(active);
    const map = mapInstanceRef.current;
    if (map && map.isStyleLoaded()) {
      try {
        if (map.getLayer("corridor-layer")) {
          map.setLayoutProperty(
            "corridor-layer",
            "visibility",
            active ? "visible" : "none"
          );
        }
        if (map.getLayer("corridor-lines")) {
          map.setLayoutProperty(
            "corridor-lines",
            "visibility",
            active ? "visible" : "none"
          );
        }
        if (map.getLayer("hazard-risk-heatmap")) {
          map.setLayoutProperty(
            "hazard-risk-heatmap",
            "visibility",
            active ? "visible" : "none"
          );
        }
      } catch (err) {
        console.warn("Heatmap toggle warning:", err);
      }
    }
  };

  const handleToggleRescueRoute = (active: boolean) => {
    setRescueRouteEnabled(active);
    const map = mapInstanceRef.current;
    if (map && map.isStyleLoaded()) {
      try {
        if (map.getLayer("rescue-route-lines")) {
          map.setLayoutProperty(
            "rescue-route-lines",
            "visibility",
            active ? "visible" : "none"
          );
        }
        if (map.getLayer("rescue-route-line")) {
          map.setLayoutProperty(
            "rescue-route-line",
            "visibility",
            active ? "visible" : "none"
          );
        }
      } catch (err) {
        console.warn("Rescue route toggle warning:", err);
      }
    }
  };

  const handleToggleSensors = (active: boolean) => {
    setFieldSensorsEnabled(active);
    const map = mapInstanceRef.current;
    if (map && map.isStyleLoaded()) {
      try {
        if (map.getLayer("field-sensors-glow")) {
          map.setLayoutProperty(
            "field-sensors-glow",
            "visibility",
            active ? "visible" : "none"
          );
        }
        if (map.getLayer("field-sensors-point")) {
          map.setLayoutProperty(
            "field-sensors-point",
            "visibility",
            active ? "visible" : "none"
          );
        }
      } catch (err) {
        console.warn("Sensors toggle warning:", err);
      }
    }
  };

  // React to 3D Terrain Hillshade toggle switch (uncontrolled HUD mode)
  useEffect(() => {
    if (isControlledLayers) return;
    const map = mapInstanceRef.current;
    if (!map || !map.isStyleLoaded()) return;

    if (map.getSource("mapbox-dem")) {
      map.setTerrain(
        terrainEnabled ? { source: "mapbox-dem", exaggeration: 1.5 } : null
      );
    }
    if (map.getLayer("terrain-hillshade")) {
      map.setLayoutProperty(
        "terrain-hillshade",
        "visibility",
        terrainEnabled ? "visible" : "none"
      );
    }
  }, [terrainEnabled, isControlledLayers]);

  // React to Hazard Risk Heatmap toggle switch (uncontrolled HUD mode)
  useEffect(() => {
    if (isControlledLayers) return;
    const map = mapInstanceRef.current;
    if (!map || !map.isStyleLoaded()) return;

    if (map.getLayer("corridor-layer")) {
      map.setLayoutProperty(
        "corridor-layer",
        "visibility",
        riskHeatmapEnabled ? "visible" : "none"
      );
    }
    if (map.getLayer("corridor-lines")) {
      map.setLayoutProperty(
        "corridor-lines",
        "visibility",
        riskHeatmapEnabled ? "visible" : "none"
      );
    }
    if (map.getLayer("hazard-risk-heatmap")) {
      map.setLayoutProperty(
        "hazard-risk-heatmap",
        "visibility",
        riskHeatmapEnabled ? "visible" : "none"
      );
    }
  }, [riskHeatmapEnabled, isControlledLayers]);

  // React to Emergency Rescue Reroute toggle switch (uncontrolled HUD mode)
  useEffect(() => {
    if (isControlledLayers) return;
    const map = mapInstanceRef.current;
    if (!map || !map.isStyleLoaded()) return;

    if (map.getLayer("rescue-route-lines")) {
      map.setLayoutProperty(
        "rescue-route-lines",
        "visibility",
        rescueRouteEnabled ? "visible" : "none"
      );
    }
    if (map.getLayer("rescue-route-line")) {
      map.setLayoutProperty(
        "rescue-route-line",
        "visibility",
        rescueRouteEnabled ? "visible" : "none"
      );
    }
  }, [rescueRouteEnabled, isControlledLayers]);

  // React to Field Sensor Nodes toggle switch (uncontrolled HUD mode)
  useEffect(() => {
    if (isControlledLayers) return;
    const map = mapInstanceRef.current;
    if (!map || !map.isStyleLoaded()) return;

    if (map.getLayer("field-sensors-glow")) {
      map.setLayoutProperty(
        "field-sensors-glow",
        "visibility",
        fieldSensorsEnabled ? "visible" : "none"
      );
    }
    if (map.getLayer("field-sensors-point")) {
      map.setLayoutProperty(
        "field-sensors-point",
        "visibility",
        fieldSensorsEnabled ? "visible" : "none"
      );
    }
  }, [fieldSensorsEnabled, isControlledLayers]);

  // React to selectedState fly-to triggers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const prevState = prevSelectedStateRef.current;
    prevSelectedStateRef.current = selectedState;
    if (!map || !selectedState) return;
    if (prevState === selectedState && selectedState === "All States") return;

    const preset = STATE_PRESETS[selectedState as keyof typeof STATE_PRESETS];
    if (preset) {
      map.flyTo({
        center: preset.center as [number, number],
        zoom: preset.zoom,
        pitch: preset.pitch,
        bearing: preset.bearing,
        essential: true,
        duration: 2200,
      });
    }
  }, [selectedState]);

  // Dynamically update Mapbox source & trigger visual alert transition
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !map.isStyleLoaded()) return;

    try {
      const source = map.getSource("corridor-routes") as mapboxgl.GeoJSONSource | undefined;
      if (source && typeof source.setData === "function") {
        source.setData(simulatedCorridorData as any);
      }

      const sensorSource = map.getSource("field-sensors") as mapboxgl.GeoJSONSource | undefined;
      if (sensorSource && typeof sensorSource.setData === "function") {
        sensorSource.setData(simulatedSensorsData as any);
      }

      // Visual alert transition: when pore-water pressure exceeds 200 kPa (hour 14:00),
      // dynamically set the road segment line to solid pulsing red (#FF0000) with expanded glow
      if (isPorePressureCritical) {
        if (map.getLayer("corridor-layer")) {
          map.setPaintProperty("corridor-layer", "line-width", 7.5);
        }
        if (map.getLayer("corridor-lines")) {
          map.setPaintProperty("corridor-lines", "line-width", 7.5);
        }
        if (map.getLayer("hazard-risk-heatmap")) {
          map.setPaintProperty("hazard-risk-heatmap", "line-width", 22);
          map.setPaintProperty("hazard-risk-heatmap", "line-blur", 14);
          map.setPaintProperty("hazard-risk-heatmap", "line-opacity", 0.9);
        }
      } else {
        if (map.getLayer("corridor-layer")) {
          map.setPaintProperty("corridor-layer", "line-width", 6);
        }
        if (map.getLayer("corridor-lines")) {
          map.setPaintProperty("corridor-lines", "line-width", 6);
        }
        if (map.getLayer("hazard-risk-heatmap")) {
          map.setPaintProperty("hazard-risk-heatmap", "line-width", 18);
          map.setPaintProperty("hazard-risk-heatmap", "line-blur", 10);
          map.setPaintProperty("hazard-risk-heatmap", "line-opacity", 0.7);
        }
      }
    } catch (err) {
      console.warn("Simulation data update error:", err);
    }
  }, [simulatedCorridorData, simulatedSensorsData, isPorePressureCritical]);

  return (
    <div
      className={`relative w-full h-full min-h-[400px] overflow-hidden ${className}`}
      style={{ width: "100%", height: "100%" }}
    >
      {/* Dedicated clean container for Mapbox GL canvas */}
      <div
        ref={mapContainerRef}
        className="absolute inset-0 w-full h-full"
      />

      {!hasValidToken && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#173D32]/85 backdrop-blur-xs p-6 text-center select-none">
          <div className="max-w-md w-full p-6 sm:p-8 rounded-3xl bg-[#FAF8F2]/95 border border-[#173D32]/15 shadow-2xl flex flex-col items-center text-[#173D32]">
            <div className="w-14 h-14 rounded-2xl bg-[#D6A65D]/20 border border-[#D6A65D]/40 flex items-center justify-center text-2xl mb-4 shadow-xs">
              🗺️
            </div>
            <h3 className="text-lg sm:text-xl font-black tracking-tight text-[#173D32] mb-2">
              Mapbox Access Token Required
            </h3>
            <p className="text-xs sm:text-sm text-[#173D32]/80 mb-4 leading-relaxed font-normal">
              Interactive 3D mountain terrain, slope telemetry, and corridor risk heatmaps require an active Mapbox access token.
            </p>
            <div className="w-full text-[11px] sm:text-xs font-mono font-semibold bg-[#173D32]/10 border border-[#173D32]/20 rounded-xl p-2.5 text-[#173D32] break-all select-all mb-4 text-center">
              NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
            </div>
            <p className="text-[11px] text-[#173D32]/60">
              Add this key in your Vercel Project Environment Variables and redeploy.
            </p>
          </div>
        </div>
      )}

      {/* Floating Top-Left Dashboard Overlay Card */}
      {effectiveShowHud && (
        <div className={`absolute top-3.5 left-3.5 sm:top-4 sm:left-4 z-20 ${
          variant === "mini"
            ? "max-w-[200px] p-2 rounded-xl"
            : "max-w-[315px] sm:max-w-[340px] p-3.5 sm:p-4 rounded-2xl"
        } w-full bg-[#FAF8F2]/95 backdrop-blur-md border border-[#173D32]/15 shadow-[0_12px_32px_rgba(23,61,50,0.14)] text-[#173D32] select-none transition-all`}>
          {variant === "mini" ? (
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600" />
              </span>
              <span className="text-[10px] font-black uppercase tracking-wider text-[#173D32]">
                3D GIS · NH-29
              </span>
            </div>
          ) : (
            <>
              {/* Card Header with Status Beacon & Collapse Toggle */}
              <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#173D32]/10">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600" />
                  </span>
                  <span className="text-[11px] font-black uppercase tracking-wider text-[#173D32]">
                    Live Corridor HUD
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#173D32]/10 text-[#173D32]">
                    NH-29
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsHudCollapsed(!isHudCollapsed)}
                    className="text-xs text-[#173D32]/60 hover:text-[#173D32] p-0.5 cursor-pointer font-bold"
                    aria-label={isHudCollapsed ? "Expand HUD" : "Collapse HUD"}
                  >
                    {isHudCollapsed ? "＋" : "－"}
                  </button>
                </div>
              </div>

        {!isHudCollapsed && (
          <>
            {/* Dynamic Status Badges */}
            <div className="space-y-2 mt-3 mb-3.5">
              {/* 1. Active Corridor Alert Badge */}
              <div
                className={`p-2.5 rounded-xl border flex items-start gap-2 shadow-2xs transition-colors ${isPorePressureCritical
                    ? "bg-red-50/95 border-red-300"
                    : targetProps.status === "warning"
                      ? "bg-amber-50/95 border-amber-200"
                      : "bg-emerald-50/95 border-emerald-200"
                  }`}
              >
                <span className="text-sm mt-0.5 shrink-0" aria-hidden="true">
                  {isPorePressureCritical ? "⛔" : targetProps.status === "warning" ? "⚠️" : "✅"}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider ${isPorePressureCritical
                          ? "text-red-800"
                          : targetProps.status === "warning"
                            ? "text-amber-800"
                            : "text-emerald-800"
                        }`}
                    >
                      Active Corridor Alert
                    </span>
                    <span
                      className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded text-white ${isPorePressureCritical
                          ? "bg-red-600 animate-pulse"
                          : targetProps.status === "warning"
                            ? "bg-amber-500"
                            : "bg-emerald-600"
                        }`}
                    >
                      {isPorePressureCritical
                        ? "BLOCKED"
                        : targetProps.status === "warning"
                          ? "WARNING"
                          : "PASSABLE"}
                    </span>
                  </div>
                  <p
                    className={`text-xs font-bold mt-0.5 leading-snug ${isPorePressureCritical
                        ? "text-red-950"
                        : targetProps.status === "warning"
                          ? "text-amber-950"
                          : "text-emerald-950"
                      }`}
                  >
                    NH-29 Pherima Segment - {isPorePressureCritical ? "BLOCKED" : targetProps.status === "warning" ? "CAUTION" : "NORMAL TRANSIT"}
                  </p>
                </div>
              </div>

              {/* 2. Rainfall Intensity Badge */}
              <div className="p-2.5 rounded-xl bg-cyan-50/95 border border-cyan-200/90 flex items-start gap-2 shadow-2xs">
                <span className="text-sm mt-0.5 shrink-0" aria-hidden="true">
                  🌧️
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-bold uppercase text-cyan-800 tracking-wider">
                      Rainfall Intensity
                    </span>
                    <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-cyan-700 text-white">
                      {rainfallIntensity} mm/h
                    </span>
                  </div>
                  <p className="text-xs font-bold text-cyan-950 mt-0.5 leading-snug">
                    {isPorePressureCritical
                      ? "Extreme Saturation (Doppler Peak)"
                      : rainfallIntensity >= 45
                        ? "Heavy Monsoon Downpour"
                        : "Light Baseline Drizzle"}
                  </p>
                </div>
              </div>

              {/* 3. Alternate Rescue Route Status Badge */}
              <div className="p-2.5 rounded-xl bg-blue-50/95 border border-blue-200/90 flex items-start gap-2 shadow-2xs">
                <span className="text-sm mt-0.5 shrink-0" aria-hidden="true">
                  🚑
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-bold uppercase text-blue-800 tracking-wider">
                      Alternate Rescue Route
                    </span>
                    <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-blue-600 text-white">
                      ACTIVE
                    </span>
                  </div>
                  <p className="text-xs font-bold text-blue-950 mt-0.5 leading-snug">
                    Peducha Bypass Open for Convoys
                  </p>
                </div>
              </div>
            </div>

            {/* Layer Visibility Toggle Switches */}
            <div className="pt-2.5 border-t border-[#173D32]/10">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#173D32]/70 block mb-2">
                Layer Visibility Controls
              </span>

              <div className="space-y-1.5 text-xs font-semibold text-[#173D32]">
                {/* 3D Terrain Hillshade Toggle */}
                <div className="flex items-center justify-between gap-2 p-1 rounded-lg hover:bg-[#173D32]/5 transition-colors">
                  <span className="flex items-center gap-1.5">
                    <span>🏔️</span> 3D Terrain Hillshade
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      name="terrain-toggle"
                      aria-label="Toggle 3D Terrain Hillshade"
                      checked={terrainEnabled}
                      onChange={(e) => handleToggleTerrain(e.target.checked)}
                      className="sr-only"
                    />
                    <div
                      role="switch"
                      aria-checked={terrainEnabled}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${terrainEnabled ? "bg-[#173D32]" : "bg-gray-300"
                        }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${terrainEnabled ? "translate-x-4" : "translate-x-0"
                          }`}
                      />
                    </div>
                  </label>
                </div>

                {/* Hazard Risk Heatmap Toggle */}
                <div className="flex items-center justify-between gap-2 p-1 rounded-lg hover:bg-[#173D32]/5 transition-colors">
                  <span className="flex items-center gap-1.5">
                    <span>🔥</span> Hazard Risk Heatmap
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      name="heatmap-toggle"
                      aria-label="Toggle Hazard Risk Heatmap"
                      checked={riskHeatmapEnabled}
                      onChange={(e) => handleToggleRiskHeatmap(e.target.checked)}
                      className="sr-only"
                    />
                    <div
                      role="switch"
                      aria-checked={riskHeatmapEnabled}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${riskHeatmapEnabled ? "bg-[#173D32]" : "bg-gray-300"
                        }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${riskHeatmapEnabled ? "translate-x-4" : "translate-x-0"
                          }`}
                      />
                    </div>
                  </label>
                </div>

                {/* Emergency Rescue Reroute Toggle */}
                <div className="flex items-center justify-between gap-2 p-1 rounded-lg hover:bg-[#173D32]/5 transition-colors">
                  <span className="flex items-center gap-1.5">
                    <span>⚡</span> Emergency Rescue Reroute
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      name="rescue-route-toggle"
                      aria-label="Toggle Emergency Rescue Reroute"
                      checked={rescueRouteEnabled}
                      onChange={(e) => handleToggleRescueRoute(e.target.checked)}
                      className="sr-only"
                    />
                    <div
                      role="switch"
                      aria-checked={rescueRouteEnabled}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${rescueRouteEnabled ? "bg-[#00B0FF]" : "bg-gray-300"
                        }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${rescueRouteEnabled ? "translate-x-4" : "translate-x-0"
                          }`}
                      />
                    </div>
                  </label>
                </div>

                {/* Field Sensor Nodes Toggle */}
                <div className="flex items-center justify-between gap-2 p-1 rounded-lg hover:bg-[#173D32]/5 transition-colors">
                  <span className="flex items-center gap-1.5">
                    <span>📡</span> Field Sensor Nodes
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      name="sensors-toggle"
                      aria-label="Toggle Field Sensor Nodes"
                      checked={fieldSensorsEnabled}
                      onChange={(e) => handleToggleSensors(e.target.checked)}
                      className="sr-only"
                    />
                    <div
                      role="switch"
                      aria-checked={fieldSensorsEnabled}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${fieldSensorsEnabled ? "bg-[#173D32]" : "bg-gray-300"
                        }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${fieldSensorsEnabled ? "translate-x-4" : "translate-x-0"
                          }`}
                      />
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </>
        )}
      </>
    )}
  </div>
)}

    </div>
  );
}
