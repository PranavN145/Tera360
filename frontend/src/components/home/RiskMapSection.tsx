"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
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
import {
  FALLBACK_ROADS,
  FALLBACK_ROAD_STATUS,
  FALLBACK_STATS,
} from "@/lib/fallbackData";

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

  // Initialize with fallback demo data so map & corridor cards are immediately visible
  const [roads, setRoads] = useState<PublicRiskMapItem[]>(FALLBACK_ROADS);
  const [roadStatusList, setRoadStatusList] = useState<PublicRoadStatusItem[]>(FALLBACK_ROAD_STATUS);
  const [stats, setStats] = useState<PublicStats | null>(FALLBACK_STATS);
  const [viewMode, setViewMode] = useState<"map" | "corridors">("map");

  useEffect(() => {
    let isMounted = true;
    const loadAll = async () => {
      try {
        const [riskMapData, roadData, statsData] = await Promise.all([
          publicApi.getRiskMap().catch(() => []),
          publicApi.getRoadStatus().catch(() => []),
          publicApi.getStats().catch(() => null),
        ]);
        if (!isMounted) return;
        if (riskMapData && riskMapData.length > 0) setRoads(riskMapData);
        if (roadData && roadData.length > 0) setRoadStatusList(roadData);
        if (statsData) setStats(statsData);
      } catch {
        // Retain fallback data
      }
    };
    loadAll();
    return () => {
      isMounted = false;
    };
  }, []);

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
      {/* Subtle Northeast-inspired background artwork */}
      <SectionBackground src="/images/section-bg-2.png" />

      <div className="relative z-10 max-w-[1340px] mx-auto">
        {/* Section Header with Organic Ochre Brush-stroke Accent */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8 lg:mb-10">
          <div className="max-w-2xl">
            {/* Heading */}
            <h2 className="text-3xl sm:text-4xl lg:text-[46px] font-black text-[#173D32] tracking-tight leading-[1.12]">
              <span>Understand the </span>
              <span className="relative inline-block">
                <span className="text-[#D6A65D] italic">Live Risk</span>
                <svg
                  className="w-32 sm:w-40 lg:w-[170px] h-2.5 sm:h-3 text-[#D6A65D] mt-0.5"
                  viewBox="0 0 250 12"
                  fill="currentColor"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path d="M2 9.5C35 7.5 90 5.2 160 5.2C200 5.2 235 6.8 248 8.8C235 9.8 195 10.8 150 10.8C85 10.8 35 10.2 2 9.5Z" />
                </svg>
              </span>
            </h2>

            {/* Description */}
            <p className="mt-3.5 text-base sm:text-lg text-[#173D32]/85 leading-relaxed font-normal">
              High-resolution slope vulnerability mapping, real-time Doppler radar overlays, and arterial highway clearance statuses across the 8 Northeast states.
            </p>
          </div>

          {/* Quick View Controls & Full Map CTA */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {/* View Mode Toggle */}
            <div className="bg-[#FAF8F2] border border-[#173D32]/15 rounded-full p-1 flex items-center shadow-xs">
              <button
                type="button"
                onClick={() => setViewMode("map")}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === "map"
                    ? "bg-[#173D32] text-[#F6F4EC] shadow-xs"
                    : "text-[#173D32]/70 hover:text-[#173D32]"
                }`}
              >
                <span>🗺️</span>
                <span>Spatial Radar</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("corridors")}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === "corridors"
                    ? "bg-[#173D32] text-[#F6F4EC] shadow-xs"
                    : "text-[#173D32]/70 hover:text-[#173D32]"
                }`}
              >
                <span>🛣️</span>
                <span>Highway Status</span>
                <span className="text-[10px] bg-[#DCE8D4] text-[#173D32] font-bold px-1.5 py-0.2 rounded-full">
                  {roadStatusList.length}
                </span>
              </button>
            </div>

            {/* Full Risk Engine Button with matching Home styling */}
            <Link
              href="/risk-map"
              className="h-[48px] px-7 rounded-full text-sm font-bold text-white bg-[#173D32] hover:bg-[#1a4437] inline-flex items-center justify-center gap-2.5 transition-all duration-200 hover:-translate-y-0.5 shadow-md hover:shadow-lg group focus-visible:outline-2 focus-visible:outline-[#173D32]"
            >
              <span>Full Risk Engine</span>
              <span
                className="transition-transform duration-200 group-hover:translate-x-1"
                aria-hidden="true"
              >
                →
              </span>
            </Link>
          </div>
        </div>

        {/* Live Platform Stats Telemetry Band */}
        <div className="mb-7 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          {/* Monitored Corridors */}
          <div className="bg-[#FAF8F2] border border-[#173D32]/12 rounded-[20px] p-4 shadow-[0_2px_12px_rgba(23,61,50,0.04)] hover:shadow-md hover:-translate-y-0.5 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase font-bold text-[#173D32]/60 tracking-wider">
                Corridors
              </span>
              <span className="w-6 h-6 rounded-lg bg-[#DCE8D4]/60 flex items-center justify-center text-xs">
                🛰️
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-[#173D32]">
                {stats?.totalMonitoredCorridors ?? 18}
              </span>
              <span className="text-xs font-semibold text-[#173D32]/60">highways</span>
            </div>
            <span className="block text-[11px] text-[#173D32]/50 mt-1 font-medium">
              Continuous GIS feed
            </span>
          </div>

          {/* Active Alerts */}
          <div className="bg-[#FAF8F2] border border-[#173D32]/12 rounded-[20px] p-4 shadow-[0_2px_12px_rgba(23,61,50,0.04)] hover:shadow-md hover:-translate-y-0.5 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase font-bold text-[#173D32]/60 tracking-wider">
                Active Alerts
              </span>
              <span className="w-6 h-6 rounded-lg bg-amber-100 flex items-center justify-center text-xs">
                🔔
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-amber-700">
                {stats?.publishedAlerts ?? 6}
              </span>
              <span className="text-[11px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-full">
                {stats?.criticalAlerts ?? 2} crit
              </span>
            </div>
            <span className="block text-[11px] text-[#173D32]/50 mt-1 font-medium">
              Verified bulletins
            </span>
          </div>

          {/* Blocked Corridors */}
          <div className="bg-[#FAF8F2] border border-[#173D32]/12 rounded-[20px] p-4 shadow-[0_2px_12px_rgba(23,61,50,0.04)] hover:shadow-md hover:-translate-y-0.5 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase font-bold text-red-700/80 tracking-wider">
                Blocked
              </span>
              <span className="w-6 h-6 rounded-lg bg-red-100 flex items-center justify-center text-xs">
                ⛔
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-red-600">
                {stats?.blockedRoads ?? 2}
              </span>
              <span className="text-xs font-semibold text-red-600/70">sectors</span>
            </div>
            <span className="block text-[11px] text-red-700/60 mt-1 font-medium">
              Diversions active
            </span>
          </div>

          {/* Under Caution */}
          <div className="bg-[#FAF8F2] border border-[#173D32]/12 rounded-[20px] p-4 shadow-[0_2px_12px_rgba(23,61,50,0.04)] hover:shadow-md hover:-translate-y-0.5 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase font-bold text-amber-700/80 tracking-wider">
                Under Caution
              </span>
              <span className="w-6 h-6 rounded-lg bg-amber-100 flex items-center justify-center text-xs">
                ⚠️
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-amber-600">
                {stats?.roadsUnderCaution ?? 2}
              </span>
              <span className="text-xs font-semibold text-amber-700/70">restricted</span>
            </div>
            <span className="block text-[11px] text-[#173D32]/50 mt-1 font-medium">
              Single-lane transit
            </span>
          </div>

          {/* Open Corridors */}
          <div className="hidden lg:block bg-[#FAF8F2] border border-[#173D32]/12 rounded-[20px] p-4 shadow-[0_2px_12px_rgba(23,61,50,0.04)] hover:shadow-md hover:-translate-y-0.5 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase font-bold text-emerald-800/80 tracking-wider">
                Open Corridors
              </span>
              <span className="w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center text-xs">
                ✅
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-emerald-700">
                {stats?.openRoads ?? 14}
              </span>
              <span className="text-xs font-semibold text-emerald-700/70">clear</span>
            </div>
            <span className="block text-[11px] text-[#173D32]/50 mt-1 font-medium">
              Nominal transit
            </span>
          </div>
        </div>

        {/* Dedicated Map & Corridor Canvas Container */}
        <div className="relative w-full min-h-[520px] lg:min-h-[600px] rounded-[28px] bg-gradient-to-b from-[#EEF4EB] via-[#E4EDE0] to-[#DAE6D5] border border-[#173D32]/15 shadow-[0_12px_36px_rgba(23,61,50,0.08)] overflow-hidden flex flex-col justify-between p-4 sm:p-7 transition-all select-none">
          {/* Corner Crosshairs for GIS Instrument Aesthetic */}
          <span className="absolute top-3 left-3 text-[12px] font-mono text-[#173D32]/35 select-none pointer-events-none">+</span>
          <span className="absolute top-3 right-3 text-[12px] font-mono text-[#173D32]/35 select-none pointer-events-none">+</span>
          <span className="absolute bottom-3 left-3 text-[12px] font-mono text-[#173D32]/35 select-none pointer-events-none">+</span>
          <span className="absolute bottom-3 right-3 text-[12px] font-mono text-[#173D32]/35 select-none pointer-events-none">+</span>

          {/* Top GIS Sensor Status Pill */}
          <div className="absolute top-3.5 left-1/2 -translate-x-1/2 z-20 pointer-events-none hidden md:flex items-center gap-2 bg-[#FAF8F2]/90 backdrop-blur-md px-3.5 py-1 rounded-full border border-[#173D32]/12 text-[10px] font-bold text-[#173D32]/80 uppercase tracking-widest shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>GIS Satellite Sensor Mesh · Active Doppler Stream</span>
          </div>

          {/* Top Control Bar: Search and Layer Selector */}
          <div className="relative z-30 flex flex-wrap items-center justify-between gap-3">
            {/* Search Input */}
            <form onSubmit={handleSearchSubmit} className="w-full sm:w-auto">
              <div className="flex items-center gap-2.5 bg-[#FAF8F2]/95 backdrop-blur-md border border-[#173D32]/20 rounded-full px-4 py-2 sm:py-2.5 text-sm text-[#173D32] shadow-sm w-full sm:w-[320px] focus-within:ring-2 focus-within:ring-[#173D32]/50 transition-all">
                <svg
                  className="w-4 h-4 text-[#173D32]/60 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                  />
                </svg>
                <input
                  type="text"
                  placeholder="Search NH-29, Kohima, Gangtok..."
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

            {/* Map Layer Mode Toggles */}
            {viewMode === "map" && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveLayer("topo");
                    addToast({
                      title: "Layer: Topographic Relief",
                      description: "Geotechnical slope and elevation contours active.",
                      type: "info",
                    });
                  }}
                  className={`inline-flex items-center gap-2 backdrop-blur-md rounded-full px-4 py-2 text-xs font-bold shadow-xs transition-all cursor-pointer ${
                    activeLayer === "topo"
                      ? "bg-[#173D32] text-[#F6F4EC] border border-[#173D32]"
                      : "bg-[#FAF8F2]/90 text-[#173D32] border border-[#173D32]/15 hover:bg-[#FAF8F2]"
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      activeLayer === "topo" ? "bg-[#D6A65D]" : "bg-[#173D32]/40"
                    }`}
                  />
                  <span>Topographic Relief</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveLayer("rainfall");
                    addToast({
                      title: "Layer: Doppler Rainfall Radar",
                      description: "Precipitation cloud density and moisture overlay enabled.",
                      type: "info",
                    });
                  }}
                  className={`inline-flex items-center gap-2 backdrop-blur-md rounded-full px-4 py-2 text-xs font-bold shadow-xs transition-all cursor-pointer ${
                    activeLayer === "rainfall"
                      ? "bg-[#173D32] text-[#F6F4EC] border border-[#173D32]"
                      : "bg-[#FAF8F2]/90 text-[#173D32] border border-[#173D32]/15 hover:bg-[#FAF8F2]"
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      activeLayer === "rainfall" ? "bg-cyan-400 animate-ping" : "bg-[#173D32]/40"
                    }`}
                  />
                  <span>Doppler Rainfall</span>
                </button>
              </div>
            )}
          </div>

          {/* Interactive Mapbox GL JS 3D Risk Map Canvas */}
          {viewMode === "map" ? (
            <div
              className="relative flex-1 w-full my-4 rounded-2xl overflow-hidden flex items-center justify-center min-h-[460px] lg:min-h-[520px] bg-[#EEF3EA]"
            >
              {/* Standalone 3D Mapbox GL Canvas */}
              <RiskMap className="absolute inset-0 w-full h-full" />

              {/* Doppler Rainfall Radar Sweep Overlay */}
              {activeLayer === "rainfall" && (
                <div className="absolute inset-0 bg-gradient-to-tr from-cyan-900/15 via-blue-800/10 to-teal-900/20 pointer-events-none animate-pulse">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(6,182,212,0.15),transparent_70%)] animate-radar-pulse" />
                </div>
              )}

              {/* Cartographic Compass Rose in Corner */}
              <div className="absolute top-4 right-4 pointer-events-none opacity-40 hidden sm:flex flex-col items-center">
                <span className="text-[10px] font-black tracking-widest text-[#173D32]">N</span>
                <div className="w-0.5 h-6 bg-[#173D32] my-0.5" />
                <div className="w-2 h-2 rotate-45 border-t border-l border-[#173D32]" />
              </div>

              {/* Scale Bar in Bottom Left */}
              <div className="absolute bottom-4 left-4 pointer-events-none opacity-40 hidden sm:flex items-center gap-2">
                <div className="w-16 h-1 bg-[#173D32]" />
                <span className="text-[10px] font-mono font-bold text-[#173D32]">50 km</span>
              </div>

              {/* Centered Geographic Watermark */}
              <div className="absolute text-center select-none pointer-events-none opacity-30">
                <span className="text-3xl sm:text-5xl font-black tracking-[0.2em] text-[#173D32]/25 uppercase">
                  Northeast India
                </span>
                <p className="text-[11px] sm:text-xs font-semibold text-[#173D32] tracking-widest mt-1">
                  SECTOR 4 · 8-STATE MONITORING GRID
                </p>
              </div>

              {/* Interactive Hazard Hotspots with Sonar Beacons */}
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
                    ? "bg-red-600 ring-red-300"
                    : isWarning
                    ? "bg-amber-500 ring-amber-300"
                    : isWatch
                    ? "bg-[#D6A65D] ring-amber-200"
                    : "bg-emerald-600 ring-emerald-300";

                  return (
                    <button
                      key={road.id}
                      type="button"
                      onClick={() => openAlertModal(riskMapItemToAlertDetail(road))}
                      style={{ left: `${coords.x}%`, top: `${coords.y}%` }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 group cursor-pointer focus:outline-none"
                      aria-label={`View details for ${road.name} (${road.riskLevel})`}
                    >
                      {/* Pulsing Sonar Ring */}
                      <span
                        className={`absolute -inset-3 rounded-full opacity-70 animate-ping ${
                          isCritical
                            ? "bg-red-500"
                            : isWarning
                            ? "bg-amber-400"
                            : "bg-[#D6A65D]/60"
                        }`}
                      />

                      {/* Node Core */}
                      <div
                        className={`relative w-5 h-5 sm:w-6 sm:h-6 rounded-full ${colorClass} ring-4 ring-white/80 shadow-lg flex items-center justify-center text-[10px] text-white font-black transition-transform duration-200 group-hover:scale-125`}
                      >
                        !
                      </div>

                      {/* Rich Floating Hover Tooltip Card */}
                      <div className="absolute left-1/2 -translate-x-1/2 top-8 hidden group-hover:flex flex-col items-center z-40 pointer-events-none min-w-[210px]">
                        <div className="bg-[#FAF8F2] text-[#173D32] text-xs p-3.5 rounded-2xl shadow-2xl border border-[#173D32]/20 flex flex-col gap-1 text-left">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-[10px] font-black bg-[#173D32] px-2 py-0.5 rounded text-[#F6F4EC]">
                              {road.code}
                            </span>
                            <span
                              className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                isCritical
                                  ? "bg-red-100 text-red-800"
                                  : isWarning
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-emerald-100 text-emerald-800"
                              }`}
                            >
                              {road.riskLevel}
                            </span>
                          </div>
                          <span className="font-extrabold text-[13px] text-[#173D32] leading-tight mt-0.5">
                            {road.name}
                          </span>
                          <span className="text-[11px] text-[#173D32]/75">
                            {road.stretch} · {road.state}
                          </span>
                          <span className="text-[10px] font-bold text-[#D6A65D] mt-1">
                            Click to view telemetry →
                          </span>
                        </div>
                        <div className="w-2.5 h-2.5 bg-[#FAF8F2] rotate-45 -mt-1.5 border-t border-l border-[#173D32]/20" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Upgraded Corridor Status Cards View with 3-Column Micro-Stats */
            <div className="flex-1 w-full my-4 overflow-y-auto max-h-[420px] pr-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {roadStatusList.map((road) => {
                  const isBlocked = road.status === "blocked";
                  const isCaution = road.status === "caution" || road.status === "partial";

                  return (
                    <div
                      key={road.id}
                      onClick={() => openAlertModal(riskMapItemToAlertDetail(road as unknown as PublicRiskMapItem))}
                      className="bg-[#FAF8F2] border border-[#173D32]/12 rounded-[22px] p-5 hover:border-[#173D32]/35 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between gap-3 group hover:-translate-y-0.5"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-mono font-black text-[#F6F4EC] bg-[#173D32] px-2.5 py-0.5 rounded-md">
                              {road.code}
                            </span>
                            <span className="text-xs font-bold text-[#173D32]/75 bg-[#DCE8D4]/60 px-2.5 py-0.5 rounded-full">
                              {road.state}
                            </span>
                          </div>

                          <span
                            className={`inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-[11px] font-bold uppercase ${
                              isBlocked
                                ? "bg-red-50 text-red-800 border border-red-200"
                                : isCaution
                                ? "bg-amber-50 text-amber-800 border border-amber-200"
                                : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            }`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                            {road.status}
                          </span>
                        </div>

                        <h3 className="text-sm sm:text-base font-extrabold text-[#173D32] group-hover:text-[#112d25] transition-colors truncate">
                          {road.name}
                        </h3>
                        <p className="text-xs text-[#173D32]/70 mt-0.5 truncate">
                          {road.stretch}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-[#173D32]/10 flex items-center justify-between text-xs font-semibold text-[#173D32]/70">
                        <span>Risk Rating: <strong className="text-[#173D32] font-black">{road.riskLevel}</strong></span>
                        <span className="text-[#173D32] font-bold group-hover:translate-x-1 transition-transform">
                          Inspect Telemetry →
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Bottom Control Bar Area: Filter Chips & Zoom */}
          <div className="relative z-30 flex flex-wrap items-end justify-between gap-3">
            {/* Filter Chips */}
            <div className="bg-[#FAF8F2]/95 backdrop-blur-md border border-[#173D32]/15 rounded-2xl px-4 py-2.5 shadow-sm">
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
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                        isActive
                          ? "bg-[#173D32] text-[#F6F4EC] border-[#173D32]"
                          : "bg-white/80 text-[#173D32] border-[#173D32]/20 hover:bg-white"
                      }`}
                    >
                      {level === "Critical" && (
                        <span className="w-2 h-2 rounded-full bg-red-500" />
                      )}
                      {level === "Warning" && (
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                      )}
                      {level === "Watch" && (
                        <span className="w-2 h-2 rounded-full bg-[#D6A65D]" />
                      )}
                      {level === "Safe" && (
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      )}
                      <span>{level}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Zoom Controls */}
            {viewMode === "map" && (
              <div className="flex flex-col gap-1 bg-[#FAF8F2]/95 backdrop-blur-md border border-[#173D32]/15 rounded-xl p-1 shadow-sm">
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
