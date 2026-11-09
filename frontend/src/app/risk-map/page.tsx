"use client";

import { useState, useEffect, useCallback } from "react";
import Header from "@/components/layout/Header";
import RiskMap from "@/components/RiskMap";
import { useApp } from "@/context/AppContext";
import { publicApi } from "@/lib/api";
import {
  PublicRoadStatusItem,
  PublicStats,
  roadStatusItemToAlertDetail,
} from "@/types/public";

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

export default function RiskMapPage() {
  const { openAlertModal, openReportModal } = useApp();
  const [selectedState, setSelectedState] = useState("All States");
  const [selectedSeverity, setSelectedSeverity] = useState("All");
  const [search, setSearch] = useState("");

  const [corridors, setCorridors] = useState<PublicRoadStatusItem[]>([]);
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingStats, setIsLoadingStats] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadRoads = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await publicApi.getRoadStatus({
        state: selectedState === "All States" ? undefined : selectedState,
      });
      setCorridors(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load road clearance statuses";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [selectedState]);

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
    loadRoads();
  }, [loadRoads]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

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

    return matchesSeverity && matchesSearch;
  });

  return (
    <div className="relative w-full min-h-screen bg-[#F6F4EC] flex flex-col">
      <Header />

      <main className="flex-1 max-w-[1340px] w-full mx-auto px-4 sm:px-6 lg:px-10 py-10 sm:py-14">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 pb-8 border-b border-[#173D32]/10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#DCE8D4]/60 text-xs font-bold text-[#173D32] uppercase mb-3">
              <span className="w-2 h-2 rounded-full bg-[#D6A65D] animate-ping" />
              GIS Risk Engine · Live
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#173D32] tracking-tight">
              Interactive Risk Map & Corridor Status
            </h1>
            <p className="mt-2.5 text-base sm:text-lg text-[#173D32]/80 max-w-2xl font-normal">
              Real-time spatial monitoring of active landslide hotspots, rainfall saturation, and highway vulnerabilities across the 8 Northeast states.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={openReportModal}
              className="h-11 px-6 rounded-full bg-[#D6A65D] hover:bg-[#c9984e] text-[#173D32] text-sm font-bold shadow-sm transition-all flex items-center gap-2 cursor-pointer"
            >
              <span>⚠️</span> Report Hazard
            </button>
          </div>
        </div>

        {/* Live Operational Stats Strip */}
        <div className="mb-8 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
          <div className="bg-[#FAF8F2] border border-[#173D32]/12 rounded-xl p-3.5 shadow-xs">
            <span className="text-[10px] sm:text-[11px] uppercase font-bold text-[#173D32]/60 tracking-wider block">
              Monitored Corridors
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black text-[#173D32]">
                {isLoadingStats ? "..." : stats?.totalMonitoredCorridors ?? 0}
              </span>
              <span className="text-xs font-semibold text-[#173D32]/60">highways</span>
            </div>
          </div>

          <div className="bg-[#FAF8F2] border border-[#173D32]/12 rounded-xl p-3.5 shadow-xs">
            <span className="text-[10px] sm:text-[11px] uppercase font-bold text-[#173D32]/60 tracking-wider block">
              Active Alerts
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black text-amber-600">
                {isLoadingStats ? "..." : stats?.publishedAlerts ?? 0}
              </span>
              {stats && stats.criticalAlerts > 0 && (
                <span className="text-xs font-bold text-red-600">
                  ({stats.criticalAlerts} critical)
                </span>
              )}
            </div>
          </div>

          <div className="bg-[#FAF8F2] border border-[#173D32]/12 rounded-xl p-3.5 shadow-xs">
            <span className="text-[10px] sm:text-[11px] uppercase font-bold text-[#173D32]/60 tracking-wider block">
              Blocked Corridors
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black text-red-600">
                {isLoadingStats ? "..." : stats?.blockedRoads ?? 0}
              </span>
              <span className="text-xs font-semibold text-red-600/70">diverted</span>
            </div>
          </div>

          <div className="bg-[#FAF8F2] border border-[#173D32]/12 rounded-xl p-3.5 shadow-xs">
            <span className="text-[10px] sm:text-[11px] uppercase font-bold text-[#173D32]/60 tracking-wider block">
              Under Caution
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black text-amber-600">
                {isLoadingStats ? "..." : stats?.roadsUnderCaution ?? 0}
              </span>
              <span className="text-xs font-semibold text-amber-700/70">restricted</span>
            </div>
          </div>

          <div className="hidden lg:block bg-[#FAF8F2] border border-[#173D32]/12 rounded-xl p-3.5 shadow-xs">
            <span className="text-[10px] sm:text-[11px] uppercase font-bold text-[#173D32]/60 tracking-wider block">
              Open Corridors
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-700">
                {isLoadingStats ? "..." : stats?.openRoads ?? 0}
              </span>
              <span className="text-xs font-semibold text-emerald-700/70">normal</span>
            </div>
          </div>
        </div>

        {/* Full-Screen 3D Interactive Risk Map Container */}
        <div className="relative w-full h-[500px] sm:h-[620px] lg:h-[720px] rounded-3xl overflow-hidden border border-[#173D32]/15 shadow-xl mb-8 bg-[#FAF8F2]">
          <RiskMap className="w-full h-full" selectedState={selectedState} />
        </div>

        {/* Filter Controls Bar */}
        <div className="bg-[#FAF8F2] border border-[#173D32]/12 rounded-2xl p-4 sm:p-5 mb-8 shadow-xs flex flex-col lg:flex-row items-center justify-between gap-4">
          {/* State Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 w-full lg:w-auto">
            {STATE_FILTERS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSelectedState(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  selectedState === s
                    ? "bg-[#173D32] text-[#F6F4EC]"
                    : "bg-[#F6F4EC] text-[#173D32]/75 hover:bg-[#DCE8D4]/50"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Search & Severity Filter */}
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end">
            <input
              type="text"
              placeholder="Filter corridors..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 px-3.5 rounded-full bg-[#F6F4EC] border border-[#173D32]/20 text-xs text-[#173D32] placeholder:text-[#173D32]/50 focus:outline-none focus:ring-1 focus:ring-[#173D32] w-full sm:w-48"
            />

            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="h-9 px-3 rounded-full bg-[#F6F4EC] border border-[#173D32]/20 text-xs font-semibold text-[#173D32] focus:outline-none cursor-pointer"
            >
              <option value="All">All Severities</option>
              <option value="Critical">Critical Only</option>
              <option value="Warning">Warning / High</option>
              <option value="Watch">Watch / Moderate</option>
              <option value="Safe">Safe / Open</option>
            </select>
          </div>
        </div>

        {/* Error State Banner */}
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center justify-between gap-4">
            <p className="text-xs sm:text-sm font-semibold">⚠️ {error}</p>
            <button
              type="button"
              onClick={loadRoads}
              className="px-4 py-1.5 rounded-full bg-[#173D32] text-[#F6F4EC] text-xs font-bold hover:bg-[#1f4e40] transition-colors cursor-pointer shrink-0"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading Skeletons */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div
                key={n}
                className="bg-[#FAF8F2] rounded-2xl border border-[#173D32]/12 p-6 shadow-xs animate-pulse flex flex-col justify-between min-h-[180px]"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="h-5 w-20 bg-[#173D32]/10 rounded-full" />
                    <div className="h-4 w-16 bg-[#173D32]/10 rounded" />
                  </div>
                  <div className="h-5 w-3/4 bg-[#173D32]/15 rounded mb-2" />
                  <div className="h-4 w-1/2 bg-[#173D32]/10 rounded mb-3" />
                  <div className="h-3 w-full bg-[#173D32]/10 rounded" />
                </div>
                <div className="mt-4 pt-3 border-t border-[#173D32]/10 h-4 w-28 bg-[#173D32]/10 rounded" />
              </div>
            ))}
          </div>
        )}

        {/* Empty State Banner (No corridors match or none in DB) */}
        {!isLoading && !error && filteredCorridors.length === 0 && (
          <div className="text-center py-16 px-4 bg-[#FAF8F2] rounded-2xl border border-[#173D32]/10 max-w-xl mx-auto shadow-xs">
            <span className="text-4xl block mb-2">🌿</span>
            <h4 className="text-lg font-bold text-[#173D32]">
              {search || selectedState !== "All States" || selectedSeverity !== "All"
                ? "No Corridors Match Your Filter"
                : "All Monitored Corridors Clear"}
            </h4>
            <p className="text-xs sm:text-sm text-[#173D32]/70 mt-1.5 leading-relaxed">
              {search || selectedState !== "All States" || selectedSeverity !== "All"
                ? "Try adjusting your state tab, severity filter, or search keywords."
                : "No highway obstructions or critical slope alerts reported on monitored corridors."}
            </p>
            <div className="mt-5">
              <button
                type="button"
                onClick={loadRoads}
                className="px-5 py-2 rounded-full bg-[#173D32] text-[#F6F4EC] text-xs font-bold hover:bg-[#1f4e40] transition-colors cursor-pointer"
              >
                Refresh Corridors ↻
              </button>
            </div>
          </div>
        )}

        {/* Corridors Grid */}
        {!isLoading && !error && filteredCorridors.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCorridors.map((corridor) => {
              const alert = roadStatusItemToAlertDetail(corridor);
              const isBlocked = corridor.status === "blocked";
              const isCaution = corridor.status === "caution" || corridor.status === "partial";

              return (
                <div
                  key={corridor.id}
                  onClick={() => openAlertModal(alert)}
                  className="bg-[#FAF8F2] rounded-2xl border border-[#173D32]/12 p-6 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group hover:border-[#173D32]/30"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase ${
                            isBlocked
                              ? "bg-red-50 text-red-700 border border-red-200"
                              : isCaution
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          {corridor.status}
                        </span>
                        {corridor.isMajorNH && (
                          <span className="text-[10px] font-bold bg-[#173D32]/10 text-[#173D32] px-2 py-0.5 rounded">
                            NH
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-bold text-[#173D32]/60">
                        {corridor.state}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-[#173D32] group-hover:text-[#133229] transition-colors">
                      {corridor.name}
                    </h3>
                    <span className="block text-xs font-mono font-semibold text-[#173D32]/70 mt-1">
                      {corridor.code} · {corridor.stretch}
                    </span>

                    <p className="mt-3 text-xs sm:text-sm text-[#173D32]/80 leading-relaxed font-normal line-clamp-2">
                      {corridor.statusReason || `Risk level evaluated as ${corridor.riskLevel}. Regular transit checks active.`}
                    </p>
                  </div>

                  <div className="mt-5 pt-4 border-t border-[#173D32]/10 flex items-center justify-between text-xs text-[#173D32]/70 font-semibold">
                    <span>Risk: {corridor.riskLevel}</span>
                    <span className="text-[#173D32] font-bold group-hover:translate-x-1 transition-transform">
                      Inspect Telemetry →
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
