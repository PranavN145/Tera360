"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Header from "@/components/layout/Header";
import RiskMap from "@/components/RiskMap";
import { useApp } from "@/context/AppContext";
import { publicApi } from "@/lib/api";
import {
  PublicRoadStatusItem,
  PublicRiskMapItem,
  PublicStats,
  roadStatusItemToAlertDetail,
  riskMapItemToAlertDetail,
} from "@/types/public";
import {
  FALLBACK_ROADS,
  FALLBACK_ROAD_STATUS,
  FALLBACK_STATS,
} from "@/lib/fallbackData";

const STATE_FILTERS = [
  "All States",
  "Nagaland",
  "Assam",
  "Sikkim",
  "Meghalaya",
  "Arunachal",
  "Manipur",
  "Mizoram",
  "Tripura",
];

// Case-insensitive, alias-aware state filter matcher
function matchesStateFilter(itemState?: string, filterState?: string): boolean {
  if (!filterState || filterState === "All States" || filterState === "All" || filterState === "Default") return true;
  if (!itemState) return false;
  const a = itemState.toLowerCase().trim();
  const b = filterState.toLowerCase().trim();
  if (a === b) return true;
  if (a.includes("arunachal") && b.includes("arunachal")) return true;
  return a.includes(b) || b.includes(a);
}

// Deterministic coordinate resolver for Northeast states
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

export default function RiskMapPage() {
  const { openAlertModal, openReportModal, addToast } = useApp();
  const [selectedState, setSelectedState] = useState("All States");
  const [selectedCorridor, setSelectedCorridor] = useState<string | null>(null);
  const [selectedSeverity, setSelectedSeverity] = useState("All");
  const [search, setSearch] = useState("");
  const [activeLayer, setActiveLayer] = useState<"topo" | "rainfall">("topo");
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);

  // Initialize with fallback demo data so corridor cards are immediately visible
  const [roads, setRoads] = useState<PublicRiskMapItem[]>(FALLBACK_ROADS);
  const [corridors, setCorridors] = useState<PublicRoadStatusItem[]>(FALLBACK_ROAD_STATUS);
  const [stats, setStats] = useState<PublicStats | null>(FALLBACK_STATS);

  useEffect(() => {
    let isMounted = true;

    async function fetchRoadsData() {
      try {
        const [roadData, riskData] = await Promise.all([
          publicApi.getRoadStatus({
            state: selectedState === "All States" ? undefined : selectedState,
          }).catch(() => []),
          publicApi.getRiskMap({
            state: selectedState === "All States" ? undefined : selectedState,
          }).catch(() => []),
        ]);

        if (!isMounted) return;

        if (roadData && roadData.length > 0) {
          setCorridors(roadData);
        } else {
          const fallback = FALLBACK_ROAD_STATUS.filter((r) =>
            matchesStateFilter(r.state, selectedState)
          );
          setCorridors(fallback);
        }

        if (riskData && riskData.length > 0) {
          setRoads(riskData);
        } else {
          const fallbackRoads = FALLBACK_ROADS.filter((r) =>
            matchesStateFilter(r.state, selectedState)
          );
          setRoads(fallbackRoads);
        }
      } catch {
        if (!isMounted) return;
        const fallback = FALLBACK_ROAD_STATUS.filter((r) =>
          matchesStateFilter(r.state, selectedState)
        );
        const fallbackRoads = FALLBACK_ROADS.filter((r) =>
          matchesStateFilter(r.state, selectedState)
        );
        setCorridors(fallback);
        setRoads(fallbackRoads);
      }
    }

    fetchRoadsData();

    return () => {
      isMounted = false;
    };
  }, [selectedState]);

  const handleSelectState = (s: string) => {
    setSelectedState(s);
    setSelectedCorridor(null);
    // Directly invoke map camera navigation for responsive feedback
    if (typeof window !== "undefined" && typeof (window as any).__riskMapFlyToState === "function") {
      (window as any).__riskMapFlyToState(s);
    }
  };

  useEffect(() => {
    let isMounted = true;

    async function fetchStatsData() {
      try {
        const statsData = await publicApi.getStats();
        if (isMounted) {
          if (statsData) setStats(statsData);
          else setStats(FALLBACK_STATS);
        }
      } catch {
        if (isMounted) {
          setStats(FALLBACK_STATS);
        }
      }
    }

    fetchStatsData();

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

  const filteredCorridors = corridors.filter((c) => {
    const matchesSeverity =
      selectedSeverity === "All" ||
      c.riskLevel.toLowerCase() === selectedSeverity.toLowerCase() ||
      (selectedSeverity === "Critical" && (c.riskLevel === "Critical" || c.status === "blocked")) ||
      (selectedSeverity === "Warning" && (c.riskLevel === "High" || c.riskLevel === "Warning" || c.status === "caution")) ||
      (selectedSeverity === "Watch" && (c.riskLevel === "Watch" || c.riskLevel === "Moderate")) ||
      (selectedSeverity === "Safe" && (c.riskLevel === "Low" || c.status === "open"));

    const query = search.toLowerCase();
    const matchesSearch =
      !search.trim() ||
      c.name.toLowerCase().includes(query) ||
      c.code.toLowerCase().includes(query) ||
      c.stretch.toLowerCase().includes(query) ||
      c.state.toLowerCase().includes(query);

    const matchesState = matchesStateFilter(c.state, selectedState);

    return matchesSeverity && matchesSearch && matchesState;
  });

  return (
    <div className="relative w-full min-h-screen bg-[#F6F4EC] flex flex-col overflow-hidden">
      {/* Landscape background image matching the Home page */}
      <div className="absolute inset-0 z-0 pointer-events-none select-none">
        <Image
          src="/images/hero_bg.png"
          alt="Terra360 Landscape Background"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center pointer-events-none select-none opacity-40 sm:opacity-50"
        />
        {/* Soft, luminous morning-mist warm-white gradient behind text & cards for pristine readability */}
        <div
          className="absolute inset-0 bg-gradient-to-b from-[#F6F4EC]/80 via-[#F6F4EC]/92 to-[#F6F4EC] pointer-events-none"
          aria-hidden="true"
        />
        <div
          className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-[#F6F4EC] to-transparent pointer-events-none"
          aria-hidden="true"
        />
      </div>

      <Header />

      <main className="relative z-10 flex-1 max-w-[1340px] w-full mx-auto px-4 sm:px-6 lg:px-10 py-10 sm:py-14">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 pb-8 border-b border-[#173D32]/10">
          <div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#173D32] tracking-tight leading-[1.12]">
              <span>Full Risk Engine & </span>
              <span className="relative inline-block">
                <span className="text-[#D6A65D] italic">Corridor Status</span>
                <svg
                  className="w-40 sm:w-48 lg:w-[220px] h-2.5 sm:h-3 text-[#D6A65D] mt-0.5"
                  viewBox="0 0 250 12"
                  fill="currentColor"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path d="M2 9.5C35 7.5 90 5.2 160 5.2C200 5.2 235 6.8 248 8.8C235 9.8 195 10.8 150 10.8C85 10.8 35 10.2 2 9.5Z" />
                </svg>
              </span>
            </h1>
            <p className="mt-3.5 text-base sm:text-lg text-[#173D32]/85 max-w-2xl font-normal leading-relaxed">
              Real-time spatial monitoring of active landslide hotspots, rainfall saturation, and highway vulnerabilities across the 8 Northeast states.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={openReportModal}
              className="h-[48px] px-7 rounded-full bg-[#D6A65D] hover:bg-[#c9984e] text-[#173D32] text-sm font-bold shadow-xs hover:shadow transition-all duration-200 hover:-translate-y-0.5 flex items-center gap-2.5 cursor-pointer"
            >
              <span>⚠️</span>
              <span>Report Hazard</span>
            </button>
          </div>
        </div>

        {/* Live Operational Stats Strip */}
        <div className="mb-8 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          <div className="bg-[#FAF8F2]/90 backdrop-blur-md border border-[#173D32]/12 rounded-[20px] p-4 shadow-[0_2px_12px_rgba(23,61,50,0.04)] hover:shadow-md hover:-translate-y-0.5 transition-all">
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

          <div className="bg-[#FAF8F2]/90 backdrop-blur-md border border-[#173D32]/12 rounded-[20px] p-4 shadow-[0_2px_12px_rgba(23,61,50,0.04)] hover:shadow-md hover:-translate-y-0.5 transition-all">
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
              Verified advisories
            </span>
          </div>

          <div className="bg-[#FAF8F2]/90 backdrop-blur-md border border-[#173D32]/12 rounded-[20px] p-4 shadow-[0_2px_12px_rgba(23,61,50,0.04)] hover:shadow-md hover:-translate-y-0.5 transition-all">
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

          <div className="bg-[#FAF8F2]/90 backdrop-blur-md border border-[#173D32]/12 rounded-[20px] p-4 shadow-[0_2px_12px_rgba(23,61,50,0.04)] hover:shadow-md hover:-translate-y-0.5 transition-all">
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

          <div className="hidden lg:block bg-[#FAF8F2]/90 backdrop-blur-md border border-[#173D32]/12 rounded-[20px] p-4 shadow-[0_2px_12px_rgba(23,61,50,0.04)] hover:shadow-md hover:-translate-y-0.5 transition-all">
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
              Unrestricted transit
            </span>
          </div>
        </div>

        {/* Unified 3D GIS Workstation matching Screenshot 3 standard */}
        <div className="mb-8 relative w-full h-[540px] sm:h-[640px] lg:h-[720px] rounded-[28px] overflow-hidden border border-[#173D32]/15 shadow-[0_12px_36px_rgba(23,61,50,0.08)] bg-[#EEF4EB]">
          <RiskMap
            variant="full"
            selectedState={selectedState}
            selectedCorridor={selectedCorridor}
            className="w-full h-full"
            onSelectCorridor={(corridorId) => {
              setSelectedCorridor(corridorId);
              const matched = corridors.find(
                (c) =>
                  c.code.toLowerCase().includes(corridorId.toLowerCase()) ||
                  corridorId.toLowerCase().includes(c.code.toLowerCase())
              );
              if (matched) {
                openAlertModal(roadStatusItemToAlertDetail(matched));
              }
            }}
          />

          {/* Doppler Rainfall Radar Sweep Overlay */}
          {activeLayer === "rainfall" && (
            <div className="absolute inset-0 bg-gradient-to-tr from-cyan-900/15 via-blue-800/10 to-teal-900/20 pointer-events-none animate-pulse z-10">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(6,182,212,0.15),transparent_70%)] animate-radar-pulse" />
            </div>
          )}
        </div>

        {/* Filter Controls Bar */}
        <div className="bg-[#FAF8F2]/90 backdrop-blur-md border border-[#173D32]/12 rounded-[22px] p-4 sm:p-5 mb-8 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-4">
          {/* State Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 w-full lg:w-auto overflow-x-auto pb-1 lg:pb-0">
            {STATE_FILTERS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => handleSelectState(s)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer ${
                  selectedState === s
                    ? "bg-[#173D32] text-[#F6F4EC] shadow-xs"
                    : "bg-[#F6F4EC] text-[#173D32]/75 hover:bg-[#DCE8D4]/50 border border-[#173D32]/10"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Search & Severity Filter */}
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-end">
            <div className="relative flex-1 sm:w-56">
              <input
                type="text"
                placeholder="Search highways..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-10 pl-8 pr-7 rounded-full bg-[#F6F4EC] border border-[#173D32]/20 text-xs text-[#173D32] placeholder:text-[#173D32]/50 focus:outline-none focus:ring-1 focus:ring-[#173D32]"
              />
              <svg
                className="w-3.5 h-3.5 text-[#173D32]/50 absolute left-3 top-3.5 pointer-events-none"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-2.5 text-xs text-[#173D32]/50 hover:text-[#173D32]"
                >
                  ✕
                </button>
              )}
            </div>

            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="h-10 px-3.5 rounded-full bg-[#F6F4EC] border border-[#173D32]/20 text-xs font-bold text-[#173D32] focus:outline-none cursor-pointer"
            >
              <option value="All">All Severities</option>
              <option value="Critical">Critical Only</option>
              <option value="Warning">Warning / Caution</option>
              <option value="Watch">Watch / Moderate</option>
              <option value="Safe">Safe / Open</option>
            </select>
          </div>
        </div>

        {/* Upgraded Corridors Grid (Always visible) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
          {filteredCorridors.map((corridor) => {
            const alert = roadStatusItemToAlertDetail(corridor);
            const isBlocked = corridor.status === "blocked";
            const isCaution = corridor.status === "caution" || corridor.status === "partial";

            const topBorder = isBlocked
              ? "bg-gradient-to-r from-red-600 via-rose-500 to-red-400"
              : isCaution
              ? "bg-gradient-to-r from-amber-500 via-orange-400 to-amber-500"
              : "bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-400";

            return (
              <article
                key={corridor.id}
                onClick={() => {
                  setSelectedCorridor(corridor.code || corridor.name);
                  openAlertModal(alert);
                }}
                className="relative bg-[#FAF8F2]/95 backdrop-blur-sm rounded-[26px] border border-[#173D32]/12 p-6 sm:p-7 shadow-[0_6px_28px_-6px_rgba(23,61,50,0.07)] hover:shadow-[0_18px_36px_-6px_rgba(23,61,50,0.14)] hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between group cursor-pointer overflow-hidden"
              >
                {/* Top Status Glow Bar */}
                <div className={`absolute top-0 left-0 right-0 h-[4px] ${topBorder}`} />

                {/* Topography watermark curve */}
                <svg
                  className="absolute -right-8 -bottom-8 w-48 h-48 text-[#173D32]/[0.035] group-hover:text-[#173D32]/[0.06] transition-colors pointer-events-none select-none"
                  viewBox="0 0 200 200"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M20 180 C 60 120, 100 150, 140 90 C 180 30, 200 60, 220 20"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  />
                  <path
                    d="M0 150 C 40 100, 80 130, 120 70 C 160 10, 180 40, 200 0"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                </svg>

                <div className="relative z-10">
                  {/* Top Row: Status pill & Highway Shield */}
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                          isBlocked
                            ? "bg-red-50 text-red-800 border border-red-200"
                            : isCaution
                            ? "bg-amber-50 text-amber-800 border border-amber-200"
                            : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        {corridor.status}
                      </span>

                      {corridor.isMajorNH && (
                        <span className="text-[10px] font-bold bg-[#173D32]/10 text-[#173D32] px-2 py-0.5 rounded border border-[#173D32]/10">
                          NATIONAL HIGHWAY
                        </span>
                      )}
                    </div>

                    <span className="text-xs font-bold text-[#173D32]/75 bg-[#DCE8D4]/60 border border-[#173D32]/10 px-2.5 py-0.5 rounded-full">
                      {corridor.state}
                    </span>
                  </div>

                  {/* Highway Code & Name */}
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-xs font-mono font-black text-[#F6F4EC] bg-[#173D32] px-2.5 py-0.5 rounded-md shadow-2xs">
                      {corridor.code}
                    </span>
                  </div>

                  <h3 className="text-lg sm:text-[20px] font-black text-[#173D32] leading-snug tracking-tight group-hover:text-[#112d25] transition-colors">
                    {corridor.name}
                  </h3>

                  {/* Stretch info */}
                  <p className="mt-1.5 text-xs text-[#173D32]/65 font-medium flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-[#D6A65D] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>{corridor.stretch}</span>
                  </p>

                  {/* Status Reason / Incident */}
                  <p className="mt-3.5 text-sm text-[#173D32]/80 leading-relaxed font-normal line-clamp-2">
                    {corridor.statusReason || `Risk level evaluated as ${corridor.riskLevel}. Routine transit checks active across slope sectors.`}
                  </p>
                </div>

                {/* Card Bottom Action */}
                <div className="relative z-10 mt-6 pt-4 border-t border-[#173D32]/10 flex items-center justify-between text-xs font-semibold">
                  <span className="text-[#173D32]/70">
                    Risk Level: <strong className="text-[#173D32] font-black">{corridor.riskLevel}</strong>
                  </span>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCorridor(corridor.code || corridor.name);
                      openAlertModal(alert);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#F6F4EC] bg-[#173D32] group-hover:bg-[#1a4437] px-4 py-1.5 rounded-full transition-all duration-200 cursor-pointer shadow-xs group-hover:shadow"
                  >
                    <span>View Telemetry</span>
                    <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </main>
    </div>
  );
}
