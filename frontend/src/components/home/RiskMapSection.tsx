"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import SectionBackground from "@/components/ui/SectionBackground";
import RiskMap from "@/components/RiskMap";
import { useApp } from "@/context/AppContext";
import { publicApi } from "@/lib/api";
import {
  PublicRiskMapItem,
  PublicStats,
  PublicRoadStatusItem,
  riskMapItemToAlertDetail,
} from "@/types/public";

// Deterministic fallback coordinate resolver for Northeast states
function resolveMapCoordinates(
  road: PublicRiskMapItem,
  index: number
): { x: number; y: number } {
  if (
    road.mapCoordinates &&
    typeof road.mapCoordinates.x === "number" &&
    typeof road.mapCoordinates.y === "number"
  ) {
    return road.mapCoordinates;
  }

  const stateCoords: Record<string, { x: number; y: number }> = {
    sikkim: { x: 25, y: 42 },
    assam: { x: 50, y: 60 },
    meghalaya: { x: 42, y: 72 },
    nagaland: { x: 68, y: 52 },
    manipur: { x: 72, y: 68 },
    mizoram: { x: 64, y: 82 },
    "arunachal pradesh": { x: 72, y: 32 },
    arunachal: { x: 72, y: 32 },
    tripura: { x: 48, y: 80 },
  };

  const normalizedState = (road.state || "").toLowerCase().trim();
  const base = stateCoords[normalizedState] || { x: 50, y: 50 };
  const offsetX = ((index % 5) - 2) * 4;
  const offsetY = ((Math.floor(index / 5) % 3) - 1) * 4;

  return {
    x: Math.min(Math.max(base.x + offsetX, 12), 88),
    y: Math.min(Math.max(base.y + offsetY, 15), 85),
  };
}

export default function RiskMapSection() {
  const { openAlertModal, addToast } = useApp();
  const [activeLayer, setActiveLayer] = useState<"topo" | "rainfall">("topo");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("All");
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);

  // Live API states
  const [roads, setRoads] = useState<PublicRiskMapItem[]>([]);
  const [roadStatusList, setRoadStatusList] = useState<PublicRoadStatusItem[]>([]);
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingStats, setIsLoadingStats] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"map" | "corridors">("map");

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [riskMapData, roadData] = await Promise.all([
        publicApi.getRiskMap(),
        publicApi.getRoadStatus().catch(() => []),
      ]);
      setRoads(riskMapData);
      setRoadStatusList(roadData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load risk map";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadStats = useCallback(async () => {
    setIsLoadingStats(true);
    try {
      const statsData = await publicApi.getStats();
      setStats(statsData);
    } catch {
      // Non-blocking stats failure
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    loadStats();
  }, [loadData, loadStats]);

  const handleZoom = (delta: number) => {
    setZoomLevel((prev) => {
      const next = Math.round((prev + delta) * 10) / 10;
      return Math.min(Math.max(next, 0.8), 1.6);
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    const matched = roads.filter(
      (h) =>
        h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        h.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        h.stretch.toLowerCase().includes(searchQuery.toLowerCase()) ||
        h.state.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (matched.length > 0) {
      addToast({
        title: `Located: ${matched[0].name} (${matched[0].code})`,
        description: `Risk Level: ${matched[0].riskLevel} (${matched[0].state})`,
        type: matched[0].riskLevel === "Critical" ? "warning" : "info",
      });
      openAlertModal(riskMapItemToAlertDetail(matched[0]));
    } else {
      addToast({
        title: "No Hazard Record Found",
        description: `Corridor "${searchQuery}" is not flagged with an active advisory.`,
        type: "info",
      });
    }
  };

  const filteredRoads = roads.filter((h) => {
    const matchesSeverity =
      selectedSeverity === "All" ||
      h.riskLevel.toLowerCase() === selectedSeverity.toLowerCase() ||
      (selectedSeverity === "Safe" && (h.riskLevel === "Low" || h.status === "open"));

    const matchesSearch =
      !searchQuery.trim() ||
      h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.state.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.stretch.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSeverity && matchesSearch;
  });

  return (
    <section
      id="risk-map"
      className="relative w-full overflow-hidden bg-[#F6F4EC] py-16 sm:py-20 lg:py-24 px-4 sm:px-6 lg:px-10 xl:px-16 scroll-mt-20 sm:scroll-mt-24"
      aria-label="Live Risk Monitoring Map Section"
    >
      {/* Subtle Northeast-inspired background artwork with soft edge fades */}
      <SectionBackground src="/images/section-bg-2.png" />

      <div className="relative z-10 max-w-[1340px] mx-auto">
        {/* Section Header: Eyebrow, Heading, Description, and CTA */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8 lg:mb-10">
          <div className="max-w-2xl">
            {/* Small Eyebrow Label */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#DCE8D4]/60 border border-[#173D32]/10 text-[12px] font-bold tracking-wider text-[#173D32] uppercase mb-3.5">
              <span className="w-2 h-2 rounded-full bg-[#D6A65D] animate-pulse" />
              LIVE RISK MONITORING
            </div>

            {/* Heading */}
            <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-bold text-[#173D32] tracking-tight leading-[1.2]">
              Understand the Risk Around You
            </h2>

            {/* Description */}
            <p className="mt-3 text-base sm:text-lg text-[#173D32]/80 leading-relaxed font-normal">
              Explore landslide-prone regions across Northeast India and stay informed about changing risk conditions.
            </p>
          </div>

          {/* Quick View Controls & Full Map CTA */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {/* View Mode Toggle: Map Canvas vs Road Status List */}
            <div className="bg-[#FAF8F2] border border-[#173D32]/15 rounded-full p-1 flex items-center shadow-xs">
              <button
                type="button"
                onClick={() => setViewMode("map")}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  viewMode === "map"
                    ? "bg-[#173D32] text-[#F6F4EC] shadow-xs"
                    : "text-[#173D32]/70 hover:text-[#173D32]"
                }`}
              >
                🗺️ Spatial Map
              </button>
              <button
                type="button"
                onClick={() => setViewMode("corridors")}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  viewMode === "corridors"
                    ? "bg-[#173D32] text-[#F6F4EC] shadow-xs"
                    : "text-[#173D32]/70 hover:text-[#173D32]"
                }`}
              >
                🛣️ Corridor Status {roadStatusList.length > 0 ? `(${roadStatusList.length})` : ""}
              </button>
            </div>

            <Link
              href="/risk-map"
              className="inline-flex items-center justify-center gap-2 h-[42px] px-5 rounded-full bg-[#173D32] hover:bg-[#1f4e40] text-[#F6F4EC] text-xs sm:text-[13px] font-semibold transition-all duration-200 hover:-translate-y-0.5 shadow-sm hover:shadow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#173D32]"
            >
              <span>Full Risk Engine</span>
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>

        {/* Live Platform Stats Band */}
        <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
          {/* Total Monitored Corridors */}
          <div className="bg-[#FAF8F2]/90 backdrop-blur-sm border border-[#173D32]/12 rounded-xl p-3 sm:p-3.5 shadow-xs">
            <span className="text-[10px] sm:text-[11px] uppercase font-bold text-[#173D32]/60 tracking-wider block">
              Monitored Corridors
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-black text-[#173D32]">
                {isLoadingStats ? "..." : stats?.totalMonitoredCorridors ?? 0}
              </span>
              <span className="text-[10px] font-semibold text-[#173D32]/60">highways</span>
            </div>
          </div>

          {/* Active Alerts */}
          <div className="bg-[#FAF8F2]/90 backdrop-blur-sm border border-[#173D32]/12 rounded-xl p-3 sm:p-3.5 shadow-xs">
            <span className="text-[10px] sm:text-[11px] uppercase font-bold text-[#173D32]/60 tracking-wider block">
              Published Alerts
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-black text-amber-600">
                {isLoadingStats ? "..." : stats?.publishedAlerts ?? 0}
              </span>
              {stats && stats.criticalAlerts > 0 && (
                <span className="text-[10px] font-bold text-red-600">
                  ({stats.criticalAlerts} critical)
                </span>
              )}
            </div>
          </div>

          {/* Blocked Highways */}
          <div className="bg-[#FAF8F2]/90 backdrop-blur-sm border border-[#173D32]/12 rounded-xl p-3 sm:p-3.5 shadow-xs">
            <span className="text-[10px] sm:text-[11px] uppercase font-bold text-[#173D32]/60 tracking-wider block">
              Blocked Corridors
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-black text-red-600">
                {isLoadingStats ? "..." : stats?.blockedRoads ?? 0}
              </span>
              <span className="text-[10px] font-semibold text-red-600/70">diverted</span>
            </div>
          </div>

          {/* Caution Stretch */}
          <div className="bg-[#FAF8F2]/90 backdrop-blur-sm border border-[#173D32]/12 rounded-xl p-3 sm:p-3.5 shadow-xs">
            <span className="text-[10px] sm:text-[11px] uppercase font-bold text-[#173D32]/60 tracking-wider block">
              Under Caution
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-black text-amber-600">
                {isLoadingStats ? "..." : stats?.roadsUnderCaution ?? 0}
              </span>
              <span className="text-[10px] font-semibold text-amber-700/70">restricted</span>
            </div>
          </div>

          {/* Open Roads */}
          <div className="hidden lg:block bg-[#FAF8F2]/90 backdrop-blur-sm border border-[#173D32]/12 rounded-xl p-3 sm:p-3.5 shadow-xs">
            <span className="text-[10px] sm:text-[11px] uppercase font-bold text-[#173D32]/60 tracking-wider block">
              Open Corridors
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-black text-emerald-700">
                {isLoadingStats ? "..." : stats?.openRoads ?? 0}
              </span>
              <span className="text-[10px] font-semibold text-emerald-700/70">normal transit</span>
            </div>
          </div>
        </div>

        {/* Dedicated Map / Corridor Container */}
        <div className="relative w-full min-h-[500px] lg:min-h-[560px] rounded-[24px] bg-[#EEF3EA] border border-[#173D32]/15 shadow-[0_8px_30px_rgb(23,61,50,0.06)] overflow-hidden flex flex-col justify-between p-4 sm:p-6 transition-all select-none">
          
          {/* Top Control Bar Area: Location Search and Map Layer Toggle */}
          <div className="relative z-20 flex flex-wrap items-center justify-between gap-3">
            {/* Location Search Bar with Enter / Submit */}
            <form onSubmit={handleSearchSubmit} className="w-full sm:w-auto">
              <div className="flex items-center gap-2.5 bg-[#F6F4EC]/95 backdrop-blur-md border border-[#173D32]/20 rounded-full px-4 py-2 sm:py-2.5 text-sm text-[#173D32] shadow-sm w-full sm:w-[320px] focus-within:ring-2 focus-within:ring-[#173D32]">
                <svg
                  className="w-4 h-4 text-[#173D32]/60 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                  />
                </svg>
                <input
                  type="text"
                  placeholder="Search NH-29, Kohima, Sikkim..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent text-xs sm:text-sm text-[#173D32] placeholder:text-[#173D32]/50 focus:outline-none w-full"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="text-xs text-[#173D32]/50 hover:text-[#173D32] px-1 cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>
            </form>

            {/* Layer / View Control Buttons (Only relevant in Map mode) */}
            {viewMode === "map" && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveLayer("topo");
                    addToast({
                      title: "Layer: Topographic Terrain",
                      description: "Elevation contours and slope steepness highlighted.",
                      type: "info",
                    });
                  }}
                  className={`inline-flex items-center gap-1.5 backdrop-blur-md rounded-full px-3.5 py-2 text-xs font-semibold shadow-sm transition-all cursor-pointer ${
                    activeLayer === "topo"
                      ? "bg-[#173D32] text-[#F6F4EC] border border-[#173D32]"
                      : "bg-[#F6F4EC]/95 text-[#173D32] border border-[#173D32]/15 hover:bg-[#F6F4EC]"
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      activeLayer === "topo" ? "bg-[#D6A65D]" : "bg-[#173D32]"
                    }`}
                  />
                  Topographic Terrain
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveLayer("rainfall");
                    addToast({
                      title: "Layer: Rainfall Radar Overlay",
                      description: "Real-time Doppler precipitation & moisture saturation active.",
                      type: "info",
                    });
                  }}
                  className={`inline-flex items-center gap-1.5 backdrop-blur-md rounded-full px-3.5 py-2 text-xs font-semibold shadow-sm transition-all cursor-pointer ${
                    activeLayer === "rainfall"
                      ? "bg-[#173D32] text-[#F6F4EC] border border-[#173D32]"
                      : "bg-[#F6F4EC]/95 text-[#173D32] border border-[#173D32]/15 hover:bg-[#F6F4EC]"
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      activeLayer === "rainfall" ? "bg-cyan-400 animate-ping" : "bg-[#173D32]/40"
                    }`}
                  />
                  Rainfall Overlay
                </button>
              </div>
            )}
          </div>

          {/* Error Banner */}
          {error && (
            <div className="my-4 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-xs sm:text-sm">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
              <button
                type="button"
                onClick={loadData}
                className="px-3 py-1.5 rounded-full bg-[#173D32] text-[#F6F4EC] text-xs font-bold hover:bg-[#1f4e40] transition-colors cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          {/* Interactive Mapbox GL JS 3D Risk Map Canvas */}
          {viewMode === "map" ? (
            <div
              className="relative flex-1 w-full my-4 rounded-2xl overflow-hidden flex items-center justify-center min-h-[460px] lg:min-h-[520px] bg-[#EEF3EA]"
            >
              {/* Standalone 3D Mapbox GL Canvas */}
              <RiskMap className="absolute inset-0 w-full h-full" />

              {/* Rainfall overlay simulated radar bands */}
              {activeLayer === "rainfall" && (
                <div className="absolute inset-0 bg-gradient-to-tr from-cyan-900/15 via-blue-800/10 to-teal-900/20 pointer-events-none animate-pulse" />
              )}

              {/* Loading Skeleton */}
              {isLoading && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#EEF3EA]/70 backdrop-blur-xs">
                  <div className="w-10 h-10 border-3 border-[#173D32]/20 border-t-[#173D32] rounded-full animate-spin mb-3" />
                  <p className="text-xs font-bold text-[#173D32] tracking-wider uppercase animate-pulse">
                    Connecting to Spatial Risk Engine...
                  </p>
                </div>
              )}

              {/* Centered Watermark & State Information */}
              <div className="absolute text-center select-none pointer-events-none opacity-40">
                <span className="text-4xl sm:text-6xl font-black tracking-widest text-[#173D32]/20 uppercase">
                  Northeast Region
                </span>
                <p className="text-xs sm:text-sm font-semibold text-[#173D32] tracking-wider mt-1">
                  Zoom: {Math.round(zoomLevel * 100)}% · Active Monitoring Corridors
                </p>
              </div>

              {/* Empty State Banner (when database has 0 corridors) */}
              {!isLoading && !error && filteredRoads.length === 0 && (
                <div className="relative z-10 p-6 sm:p-8 max-w-md text-center bg-[#FAF8F2]/90 backdrop-blur-md rounded-2xl border border-[#173D32]/15 shadow-sm">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xl mx-auto mb-3">
                    🌿
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-[#173D32]">
                    All Monitored Corridors Clear
                  </h3>
                  <p className="text-xs text-[#173D32]/75 mt-1.5 leading-relaxed">
                    Zero active obstructions or critical slope alerts reported on monitored corridors.
                  </p>
                  <button
                    type="button"
                    onClick={loadData}
                    className="mt-4 px-4 py-1.5 rounded-full bg-[#173D32] text-[#F6F4EC] text-xs font-bold hover:bg-[#1f4e40] transition-colors cursor-pointer"
                  >
                    Check for Updates ↻
                  </button>
                </div>
              )}

              {/* Interactive Hazard Hotspots */}
              {!isLoading && (
                <div className="absolute inset-0 z-10">
                  {filteredRoads.map((road, idx) => {
                    const coords = resolveMapCoordinates(road, idx);
                    const risk = road.riskLevel.toLowerCase();
                    const isCritical = risk === "critical" || road.status === "blocked";
                    const isWarning =
                      risk === "high" ||
                      risk === "warning" ||
                      risk === "moderate" ||
                      road.status === "caution";
                    const isWatch = risk === "watch";

                    const colorClass = isCritical
                      ? "bg-red-500 ring-red-300"
                      : isWarning
                      ? "bg-amber-500 ring-amber-300"
                      : isWatch
                      ? "bg-yellow-500 ring-yellow-300"
                      : "bg-emerald-500 ring-emerald-300";

                    return (
                      <button
                        key={road.id}
                        type="button"
                        onClick={() => openAlertModal(riskMapItemToAlertDetail(road))}
                        style={{ left: `${coords.x}%`, top: `${coords.y}%` }}
                        className="absolute -translate-x-1/2 -translate-y-1/2 group cursor-pointer focus:outline-none"
                        aria-label={`View details for ${road.name} (${road.riskLevel})`}
                      >
                        {/* Pulsing beacon effect */}
                        <span
                          className={`absolute -inset-2.5 rounded-full opacity-60 animate-ping ${
                            isCritical
                              ? "bg-red-400"
                              : isWarning
                              ? "bg-amber-400"
                              : "bg-yellow-400/50"
                          }`}
                        />

                        {/* Node Dot */}
                        <div
                          className={`relative w-4 h-4 sm:w-5 sm:h-5 rounded-full ${colorClass} ring-4 shadow-lg flex items-center justify-center text-[10px] text-white font-bold transition-transform group-hover:scale-125`}
                        >
                          !
                        </div>

                        {/* Hover Card Tag */}
                        <div className="absolute left-1/2 -translate-x-1/2 top-7 hidden group-hover:flex flex-col items-center z-30 pointer-events-none">
                          <div className="bg-[#173D32] text-[#F6F4EC] text-xs font-semibold py-1.5 px-3 rounded-lg shadow-xl whitespace-nowrap border border-[#DCE8D4]/30">
                            <span className="font-bold">{road.name}</span>
                            <span className="block text-[10px] text-[#D6A65D] uppercase font-bold">
                              {road.riskLevel} Risk · {road.status.toUpperCase()}
                            </span>
                          </div>
                          <div className="w-2 h-2 bg-[#173D32] rotate-45 -mt-1" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* Corridor Status Quick List View */
            <div className="flex-1 w-full my-4 overflow-y-auto max-h-[380px] pr-1">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-3 border-[#173D32]/20 border-t-[#173D32] rounded-full animate-spin" />
                </div>
              ) : roadStatusList.length === 0 ? (
                <div className="text-center py-12 bg-[#FAF8F2]/80 rounded-2xl">
                  <p className="text-sm font-bold text-[#173D32]">
                    No monitored highway records currently published.
                  </p>
                  <p className="text-xs text-[#173D32]/70 mt-1">
                    Check back after live sensor calibrations.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {roadStatusList.map((road) => (
                    <div
                      key={road.id}
                      onClick={() => openAlertModal(riskMapItemToAlertDetail(road as unknown as PublicRiskMapItem))}
                      className="bg-[#FAF8F2]/95 border border-[#173D32]/12 rounded-xl p-3.5 hover:border-[#173D32]/30 transition-all cursor-pointer shadow-xs flex items-center justify-between gap-3 group"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-[#173D32] bg-[#173D32]/10 px-2 py-0.5 rounded">
                            {road.code}
                          </span>
                          <span className="text-xs font-bold text-[#173D32] truncate">
                            {road.name}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#173D32]/70 mt-1 truncate">
                          {road.stretch} · {road.state}
                        </p>
                      </div>

                      <div className="shrink-0 text-right">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            road.status === "blocked"
                              ? "bg-red-100 text-red-800"
                              : road.status === "caution" || road.status === "partial"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {road.status}
                        </span>
                        <span className="block text-[10px] text-[#173D32]/60 mt-0.5 font-semibold">
                          {road.riskLevel} Risk
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Bottom Control Bar Area: Filterable Map Legend & Zoom Controls */}
          <div className="relative z-20 flex flex-wrap items-end justify-between gap-3">
            {/* Interactive Risk Classification Filter Chips */}
            <div className="bg-[#F6F4EC]/95 backdrop-blur-md border border-[#173D32]/15 rounded-2xl px-4 py-2.5 shadow-sm">
              <span className="text-[11px] font-bold text-[#173D32] uppercase tracking-wider block mb-1.5">
                Filter by Risk Classification:
              </span>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs">
                {["All", "Critical", "Warning", "Watch", "Safe"].map((level) => {
                  const isActive = selectedSeverity === level;
                  return (
                    <button
                      key={level}
                      type="button"
                      onClick={() => {
                        setSelectedSeverity(level);
                        addToast({
                          title: `Filter: ${level}`,
                          description:
                            level === "All"
                              ? "Showing all risk zones."
                              : `Filtered to ${level} risk corridors.`,
                          type: "info",
                        });
                      }}
                      className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                        isActive
                          ? "bg-[#173D32] text-[#F6F4EC] border-[#173D32]"
                          : "bg-white/80 text-[#173D32] border-[#173D32]/20 hover:bg-white"
                      }`}
                    >
                      {level === "Critical" && (
                        <span className="w-2 h-2 rounded-full bg-[#EF4444]" />
                      )}
                      {level === "Warning" && (
                        <span className="w-2 h-2 rounded-full bg-[#F97316]" />
                      )}
                      {level === "Watch" && (
                        <span className="w-2 h-2 rounded-full bg-[#EAB308]" />
                      )}
                      {level === "Safe" && (
                        <span className="w-2 h-2 rounded-full bg-[#22C55E]" />
                      )}
                      <span>{level}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Interactive Zoom Controls (Map view only) */}
            {viewMode === "map" && (
              <div className="flex flex-col gap-1 bg-[#F6F4EC]/95 backdrop-blur-md border border-[#173D32]/15 rounded-xl p-1 shadow-sm">
                <button
                  type="button"
                  onClick={() => handleZoom(0.2)}
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-[#173D32] hover:bg-[#173D32]/10 transition-colors font-bold text-xl select-none cursor-pointer"
                  aria-label="Zoom in"
                  title="Zoom in (+20%)"
                >
                  +
                </button>
                <div className="h-px bg-[#173D32]/15 mx-1" />
                <button
                  type="button"
                  onClick={() => handleZoom(-0.2)}
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-[#173D32] hover:bg-[#173D32]/10 transition-colors font-bold text-xl select-none cursor-pointer"
                  aria-label="Zoom out"
                  title="Zoom out (-20%)"
                >
                  −
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
