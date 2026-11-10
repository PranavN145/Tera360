"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type mapboxgl from "mapbox-gl";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  MapPin,
  Minus,
  Navigation,
  Plus,
  RefreshCw,
} from "lucide-react";
import PortalLayout from "@/components/portal/PortalLayout";
import PortalFilterBar from "@/components/portal/PortalFilterBar";
import PortalSplitLayout from "@/components/portal/PortalSplitLayout";
import RiskMap, {
  isMapboxTokenConfigured,
  RiskMapHotspot,
  RiskMapLayerVisibility,
} from "@/components/RiskMap";
import OfficerLiveCorridorHud, {
  OfficerMapLayersState,
} from "@/components/officer/map/OfficerLiveCorridorHud";
import OfficerCorridorDossier from "@/components/officer/map/OfficerCorridorDossier";
import OfficerCorridorAlertModal from "@/components/officer/map/OfficerCorridorAlertModal";
import {
  corridorToHotspot,
  matchAlertForCorridor,
  NORTHEAST_STATES,
  resolveCorridorCoordinates,
} from "@/components/officer/map/corridorTelemetry";
import { STATE_PRESETS } from "@/data/mockLandslideData";
import { publicApi } from "@/lib/api";
import { PublicAlertItem, PublicRiskMapItem } from "@/types/public";

const NORTHEAST_MAP_CENTER: [number, number] = [90.8, 25.8];
const NORTHEAST_MAP_ZOOM = 6.2;
const NORTHEAST_MAP_PITCH = 42;
const NORTHEAST_MAP_BEARING = -10;

const SEVERITY_SORT_RANK: Record<string, number> = {
  Critical: 0,
  Warning: 1,
  Normal: 2,
};

export default function OfficerMapPage() {
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const stateDropdownRef = useRef<HTMLDivElement | null>(null);

  const [selectedState, setSelectedState] = useState<string>("All States");
  const [isStateMenuOpen, setIsStateMenuOpen] = useState<boolean>(false);

  const [corridors, setCorridors] = useState<PublicRiskMapItem[]>([]);
  const [alerts, setAlerts] = useState<PublicAlertItem[]>([]);
  const [selectedCorridor, setSelectedCorridor] = useState<PublicRiskMapItem | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [mapRuntimeError, setMapRuntimeError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  const [isAlertModalOpen, setIsAlertModalOpen] = useState<boolean>(false);

  const [layers, setLayers] = useState<OfficerMapLayersState>({
    hillshade: true,
    hazardHeatmap: false,
    rescueRoute: true,
    fieldSensors: true,
  });

  // Close right-hand Filtering dropdown on outside click
  useEffect(() => {
    if (!isStateMenuOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (stateDropdownRef.current && !stateDropdownRef.current.contains(e.target as Node)) {
        setIsStateMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [isStateMenuOpen]);

  // Fetch real backend corridor & alert telemetry when selectedState or refreshTrigger changes
  useEffect(() => {
    let mounted = true;

    async function loadTelemetry() {
      const stateParam = selectedState === "All States" ? undefined : selectedState;

      try {
        const [riskRes, alertsRes] = await Promise.allSettled([
          publicApi.getRiskMap({ state: stateParam }),
          publicApi.getAlerts({ state: stateParam, limit: 50 }),
        ]);

        if (!mounted) return;

        if (riskRes.status === "rejected") {
          const message =
            riskRes.reason instanceof Error
              ? riskRes.reason.message
              : "Failed to synchronize live corridor telemetry from backend.";
          setApiError(message);
          setCorridors([]);
          setSelectedCorridor(null);
        } else {
          const fetchedCorridors = riskRes.value || [];
          setCorridors(fetchedCorridors);
          setApiError(null);

          setSelectedCorridor((prev) => {
            if (prev) {
              const retained = fetchedCorridors.find((c) => c.id === prev.id);
              if (retained) return retained;
            }
            if (fetchedCorridors.length === 0) return null;
            // Prefer highest severity corridor by default
            return (
              fetchedCorridors.find(
                (c) => c.riskLevel === "Critical" || c.status === "blocked"
              ) ||
              fetchedCorridors.find(
                (c) => c.riskLevel === "High" || c.status === "caution"
              ) ||
              fetchedCorridors[0]
            );
          });
        }

        if (alertsRes.status === "fulfilled") {
          setAlerts(alertsRes.value.alerts || []);
        } else {
          setAlerts([]);
        }
      } catch (err: unknown) {
        if (!mounted) return;
        setApiError(
          err instanceof Error ? err.message : "Failed to load GIS corridor telemetry."
        );
        setCorridors([]);
        setSelectedCorridor(null);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    void loadTelemetry();
    return () => {
      mounted = false;
    };
  }, [selectedState, refreshTrigger]);

  // Build RiskMap hotspots directly from real backend corridors & matched alerts
  const hotspots: RiskMapHotspot[] = useMemo(() => {
    const mapped = corridors.map((corridor) => {
      const alert = matchAlertForCorridor(corridor, alerts);
      return corridorToHotspot(corridor, alert);
    });
    return [...mapped].sort(
      (a, b) => (SEVERITY_SORT_RANK[a.severity] ?? 3) - (SEVERITY_SORT_RANK[b.severity] ?? 3)
    );
  }, [corridors, alerts]);

  const matchedAlertForSelected = useMemo(
    () => matchAlertForCorridor(selectedCorridor, alerts),
    [selectedCorridor, alerts]
  );

  // Map HUD toggles to RiskMap controlled layerVisibility
  const mapLayerVisibility: Partial<RiskMapLayerVisibility> = useMemo(
    () => ({
      hotspots: true,
      corridors: true,
      susceptibility: false,
      rainfall: false,
      slopeElevation: false,
      hillshade: layers.hillshade,
      hazardHeatmap: layers.hazardHeatmap,
      rescueRoute: layers.rescueRoute,
      fieldSensors: layers.fieldSensors,
    }),
    [layers]
  );

  const handleToggleLayer = useCallback(
    (key: keyof OfficerMapLayersState, next: boolean) => {
      setLayers((prev) => ({ ...prev, [key]: next }));
    },
    []
  );

  const flyToCorridor = useCallback((corridor: PublicRiskMapItem) => {
    const map = mapRef.current;
    if (!map) return;

    const alert = matchAlertForCorridor(corridor, alerts);
    const coords = resolveCorridorCoordinates(corridor, alert);
    const width = map.getContainer()?.clientWidth || 0;
    const leftPad = width >= 720 ? 320 : 24;

    map.flyTo({
      center: coords,
      zoom: 12.2,
      pitch: 56,
      bearing: -16,
      padding: { top: 24, right: 48, bottom: 24, left: leftPad },
      duration: 1400,
      essential: true,
    });
  }, [alerts]);

  const handleFocusCorridor = useCallback(
    (corridor: PublicRiskMapItem) => {
      setSelectedCorridor(corridor);
      flyToCorridor(corridor);
    },
    [flyToCorridor]
  );

  const handleSelectHotspot = useCallback(
    (hotspot: RiskMapHotspot) => {
      const matched =
        corridors.find((c) => c.id === hotspot.id) ||
        corridors.find((c) => c.code.toUpperCase() === hotspot.code.toUpperCase());
      if (matched) {
        handleFocusCorridor(matched);
      }
    },
    [corridors, handleFocusCorridor]
  );

  const handleSelectCorridorByCode = useCallback(
    (corridorIdOrCode: string) => {
      const needle = corridorIdOrCode.trim().toLowerCase();
      const matched = corridors.find(
        (c) =>
          c.id.toLowerCase() === needle ||
          c.code.toLowerCase() === needle ||
          needle.includes(c.code.toLowerCase()) ||
          c.code.toLowerCase().includes(needle)
      );
      if (matched) {
        setSelectedCorridor(matched);
      }
    },
    [corridors]
  );

  const handleMapLoaded = useCallback((map: mapboxgl.Map) => {
    mapRef.current = map;
  }, []);

  const handleMapError = useCallback((msg: string) => {
    setMapRuntimeError(msg);
  }, []);

  const handleZoomIn = () => {
    mapRef.current?.zoomIn({ duration: 280 });
  };

  const handleZoomOut = () => {
    mapRef.current?.zoomOut({ duration: 280 });
  };

  const handleRecenterMap = () => {
    const map = mapRef.current;
    if (!map) return;

    if (selectedCorridor) {
      flyToCorridor(selectedCorridor);
      return;
    }

    const preset = STATE_PRESETS[selectedState as keyof typeof STATE_PRESETS];
    if (preset) {
      map.flyTo({
        center: preset.center as [number, number],
        zoom: preset.zoom,
        pitch: preset.pitch,
        bearing: preset.bearing,
        padding: { top: 0, right: 0, bottom: 0, left: 0 },
        duration: 1200,
        essential: true,
      });
    } else {
      map.flyTo({
        center: NORTHEAST_MAP_CENTER,
        zoom: NORTHEAST_MAP_ZOOM,
        pitch: NORTHEAST_MAP_PITCH,
        bearing: NORTHEAST_MAP_BEARING,
        padding: { top: 0, right: 0, bottom: 0, left: 0 },
        duration: 1200,
        essential: true,
      });
    }
  };

  const handleStateSelect = (state: string) => {
    if (state !== selectedState) {
      setIsLoading(true);
      setSelectedState(state);
    }
    setIsStateMenuOpen(false);
  };

  const handleRetrySync = () => {
    setIsLoading(true);
    setRefreshTrigger((prev) => prev + 1);
  };

  const showFloatingControls = isMapboxTokenConfigured && !mapRuntimeError;

  return (
    <PortalLayout
      allowedRoles={["officer", "admin"]}
      title="Live Risk Map & GIS Hotspots"
      subtitle="Spatial monitoring of geotechnical cut-slopes, drainage saturation, and highway clearances across the 8 Northeast states."
      headerActions={
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/officer/roads"
            className="px-3.5 py-1.5 rounded-full bg-[#173D32]/10 hover:bg-[#173D32]/15 text-[#173D32] text-xs font-bold transition-all inline-flex items-center gap-1.5"
          >
            <span>Road Clearances</span>
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </Link>
          <Link
            href="/officer/dashboard"
            className="px-3.5 py-1.5 rounded-full bg-[#173D32] text-[#F6F4EC] text-xs font-bold hover:bg-[#1a4437] transition-all inline-flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Dashboard</span>
          </Link>
        </div>
      }
    >
      <div className="space-y-4 sm:space-y-5 w-full">
        {/* ── 1. Top State Navigation ── */}
        <PortalFilterBar
          className="px-3 py-2.5 sm:px-4 sm:py-3"
          left={
            <nav
              aria-label="Filter corridors by Northeast state"
              className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto max-w-full pb-0.5 sm:pb-0"
            >
              {NORTHEAST_STATES.map((state) => {
                const isActive = selectedState === state;
                return (
                  <button
                    key={state}
                    type="button"
                    onClick={() => handleStateSelect(state)}
                    aria-pressed={isActive}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap inline-flex items-center gap-1.5 shrink-0 ${
                      isActive
                        ? "bg-[#173D32] text-[#F6F4EC] shadow-xs"
                        : "text-[#173D32]/80 hover:text-[#173D32] hover:bg-[#173D32]/6"
                    }`}
                  >
                    {isActive && (
                      <MapPin className="w-3.5 h-3.5 shrink-0" strokeWidth={2.3} aria-hidden="true" />
                    )}
                    <span>{state}</span>
                  </button>
                );
              })}
            </nav>
          }
          right={
            <div ref={stateDropdownRef} className="relative shrink-0">
              <button
                type="button"
                onClick={() => setIsStateMenuOpen((prev) => !prev)}
                aria-haspopup="listbox"
                aria-expanded={isStateMenuOpen}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-[#173D32]/5 text-xs font-medium text-[#173D32]/70 transition-colors cursor-pointer"
              >
                <span>Filtering:</span>
                <span className="font-extrabold text-[#173D32]">{selectedState}</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-[#173D32]/70 transition-transform ${
                    isStateMenuOpen ? "rotate-180" : ""
                  }`}
                  aria-hidden="true"
                />
              </button>

              {isStateMenuOpen && (
                <div
                  role="listbox"
                  aria-label="Select state filter"
                  className="absolute right-0 mt-1.5 w-48 rounded-2xl bg-[#FAF8F2] border border-[#173D32]/15 shadow-xl p-1.5 z-30"
                >
                  {NORTHEAST_STATES.map((state) => {
                    const isSelected = selectedState === state;
                    return (
                      <button
                        key={state}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => handleStateSelect(state)}
                        className={`w-full text-left px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? "bg-[#173D32] text-[#F6F4EC]"
                            : "text-[#173D32] hover:bg-[#173D32]/8"
                        }`}
                      >
                        <span>{state}</span>
                        {isSelected && <MapPin className="w-3 h-3" aria-hidden="true" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          }
        />

        {/* Graceful API Error Banner (non-blocking) */}
        {apiError && (
          <div
            role="alert"
            className="p-3.5 sm:p-4 rounded-2xl bg-red-50 border border-red-200 text-red-900 flex flex-wrap items-center justify-between gap-3 text-xs font-semibold"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" aria-hidden="true" />
              <span>{apiError}</span>
            </div>
            <button
              type="button"
              onClick={handleRetrySync}
              className="px-3.5 py-1.5 rounded-full bg-red-700 hover:bg-red-800 text-white font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Retry Telemetry</span>
            </button>
          </div>
        )}

        {/* ── 2 & 3. Split Workspace: Interactive Map (7 cols) + Corridor Telemetry Dossier (5 cols) ── */}
        <PortalSplitLayout
          leftSpan={7}
          stickyRight={true}
          left={
            <div className="officer-live-map relative rounded-2xl sm:rounded-3xl overflow-hidden shadow-[0_10px_30px_rgba(23,61,50,0.08)] border border-[#173D32]/15 h-[440px] sm:h-[560px] lg:h-[620px] bg-[#0F3124]">
              <RiskMap
                variant="dashboard"
                center={NORTHEAST_MAP_CENTER}
                zoom={NORTHEAST_MAP_ZOOM}
                pitch={NORTHEAST_MAP_PITCH}
                bearing={NORTHEAST_MAP_BEARING}
                selectedState={selectedState}
                terrainMode="satellite"
                showHud={false}
                showPlayback={false}
                showControls={false}
                showScaleControl={true}
                scalePosition="bottom-left"
                hotspots={hotspots}
                activeHotspotId={selectedCorridor?.id ?? null}
                onSelectHotspot={handleSelectHotspot}
                onSelectCorridor={handleSelectCorridorByCode}
                layerVisibility={mapLayerVisibility}
                onMapLoaded={handleMapLoaded}
                onMapError={handleMapError}
                className="w-full h-full"
              />

              {/* Runtime WebGL / Mapbox Tile Error Fallback */}
              {mapRuntimeError && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#173D32]/90 p-6 text-center">
                  <div className="max-w-md rounded-3xl bg-[#FAF8F2] border border-[#173D32]/15 p-6 shadow-xl text-[#173D32]">
                    <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-3">
                      <AlertTriangle className="w-6 h-6" aria-hidden="true" />
                    </div>
                    <h3 className="text-base font-extrabold text-[#173D32]">
                      Interactive Terrain Map Unavailable
                    </h3>
                    <p className="text-xs text-[#173D32]/75 mt-1.5 leading-relaxed">
                      {mapRuntimeError} You can still inspect live corridor telemetry and issue alerts from the dossier panel.
                    </p>
                  </div>
                </div>
              )}

              {/* Floating Top-Left Live Corridor HUD */}
              {showFloatingControls && (
                <OfficerLiveCorridorHud
                  corridors={corridors}
                  selectedCorridor={selectedCorridor}
                  matchedAlert={matchedAlertForSelected}
                  selectedState={selectedState}
                  layers={layers}
                  onToggleLayer={handleToggleLayer}
                  onSelectCorridor={handleFocusCorridor}
                />
              )}

              {/* Floating Bottom-Right Zoom & Map Navigation Controls */}
              {showFloatingControls && (
                <div className="absolute bottom-8 right-3.5 sm:right-4 z-20 flex flex-col items-end gap-2">
                  <div className="bg-[#FAF8F2]/95 backdrop-blur-md border border-[#173D32]/15 rounded-xl shadow-md overflow-hidden flex flex-col">
                    <button
                      type="button"
                      onClick={handleZoomIn}
                      aria-label="Zoom in"
                      title="Zoom in"
                      className="w-9 h-9 flex items-center justify-center text-[#173D32] hover:bg-[#173D32]/8 transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4" strokeWidth={2.2} aria-hidden="true" />
                    </button>
                    <div className="border-t border-[#173D32]/12" />
                    <button
                      type="button"
                      onClick={handleZoomOut}
                      aria-label="Zoom out"
                      title="Zoom out"
                      className="w-9 h-9 flex items-center justify-center text-[#173D32] hover:bg-[#173D32]/8 transition-colors cursor-pointer"
                    >
                      <Minus className="w-4 h-4" strokeWidth={2.2} aria-hidden="true" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleRecenterMap}
                    aria-label={
                      selectedCorridor
                        ? `Recenter map on ${selectedCorridor.code}`
                        : "Recenter map overview"
                    }
                    title={
                      selectedCorridor
                        ? `Recenter on ${selectedCorridor.code}`
                        : "Recenter map overview"
                    }
                    className="w-9 h-9 rounded-xl bg-[#FAF8F2]/95 backdrop-blur-md border border-[#173D32]/15 shadow-md flex items-center justify-center text-[#173D32] hover:bg-[#173D32]/8 transition-colors cursor-pointer"
                  >
                    <Navigation className="w-4 h-4" strokeWidth={2.1} aria-hidden="true" />
                  </button>
                </div>
              )}
            </div>
          }
          right={
            <OfficerCorridorDossier
              corridors={corridors}
              selectedCorridor={selectedCorridor}
              matchedAlert={matchedAlertForSelected}
              selectedState={selectedState}
              isLoading={isLoading}
              onSelectCorridor={handleFocusCorridor}
              onResetState={() => handleStateSelect("All States")}
              onIssueAlert={() => {
                if (selectedCorridor) {
                  setIsAlertModalOpen(true);
                }
              }}
            />
          }
        />
      </div>

      {/* Functional Issue Alert Modal for Selected Corridor */}
      {isAlertModalOpen && selectedCorridor && (
        <OfficerCorridorAlertModal
          key={selectedCorridor.id}
          isOpen={isAlertModalOpen}
          corridor={selectedCorridor}
          matchedAlert={matchedAlertForSelected}
          onClose={() => setIsAlertModalOpen(false)}
        />
      )}
    </PortalLayout>
  );
}
