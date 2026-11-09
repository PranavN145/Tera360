"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import PortalLayout from "@/components/portal/PortalLayout";
import { publicApi, reportsApi } from "@/lib/api";
import {
  PublicAlertItem,
  PublicRoadStatusItem,
  HazardReportOutput,
} from "@/types/public";
import {
  VillageItem,
  VillageOverviewMetrics,
  VillageRiskLevel,
} from "@/types/village";
import { MONITORED_VILLAGES } from "@/data/villagesData";
import VillageOverviewCards from "@/components/officer/VillageOverviewCards";
import VillageDetailPanel from "@/components/officer/VillageDetailPanel";
import PortalSplitLayout from "@/components/portal/PortalSplitLayout";

type SortOption =
  | "risk-desc"
  | "risk-asc"
  | "pop-desc"
  | "pop-asc"
  | "name-asc"
  | "district-asc";

const RISK_WEIGHTS: Record<VillageRiskLevel, number> = {
  Critical: 4,
  High: 3,
  Medium: 2,
  Low: 1,
};

export default function OfficerVillagesPage() {
  // Filters & Search State
  const [search, setSearch] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("All");
  const [selectedState, setSelectedState] = useState("All");
  const [selectedRisk, setSelectedRisk] = useState<string>("All");
  const [sortBy, setSortBy] = useState<SortOption>("risk-desc");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");

  // Selection & Telemetry State
  const [selectedVillageId, setSelectedVillageId] = useState<string>(
    MONITORED_VILLAGES[0]?.id || ""
  );
  const [alerts, setAlerts] = useState<PublicAlertItem[]>([]);
  const [roads, setRoads] = useState<PublicRoadStatusItem[]>([]);
  const [reports, setReports] = useState<HazardReportOutput[]>([]);

  // Async Lifecycle State
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // ── Load Real Backend Data ──────────────────────────────────────────
  const loadBackendData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [alertsRes, roadsRes, reportsRes] = await Promise.allSettled([
        publicApi.getAlerts({ limit: 50 }),
        publicApi.getRoadStatus({}),
        reportsApi.getReports({ limit: 50 }),
      ]);

      if (alertsRes.status === "fulfilled") {
        setAlerts(alertsRes.value.alerts);
      }
      if (roadsRes.status === "fulfilled") {
        setRoads(roadsRes.value);
      }
      if (reportsRes.status === "fulfilled") {
        setReports(reportsRes.value);
      }

      setError(null);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Failed to load live telemetry from server";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBackendData();
  }, [loadBackendData, refreshTrigger]);

  const handleRetry = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  // ── Helper to match alerts with a village ───────────────────────────
  const getVillageAlerts = useCallback(
    (village: VillageItem): PublicAlertItem[] => {
      const vName = village.name.toLowerCase();
      const vDist = village.district.toLowerCase();
      const vState = village.state.toLowerCase();
      const vCorr = village.corridor.toLowerCase();

      return alerts.filter((alert) => {
        const loc = (alert.location || "").toLowerCase();
        const desc = (alert.description || "").toLowerCase();
        const title = (alert.title || "").toLowerCase();
        const alertCorr = (alert.corridor || "").toLowerCase();
        const alertState = (alert.state || "").toLowerCase();

        const matchText =
          loc.includes(vName) ||
          loc.includes(vDist) ||
          title.includes(vName) ||
          title.includes(vDist) ||
          desc.includes(vName) ||
          desc.includes(vDist);

        const matchCorridor =
          vCorr && alertCorr && (alertCorr.includes(vCorr) || vCorr.includes(alertCorr));

        const matchState = alertState && alertState.includes(vState);

        return matchText || (matchCorridor && matchState);
      });
    },
    [alerts]
  );

  // ── Helper to match reports with a village ──────────────────────────
  const getVillageReports = useCallback(
    (village: VillageItem): HazardReportOutput[] => {
      const vName = village.name.toLowerCase();
      const vDist = village.district.toLowerCase();

      return reports.filter((rep) => {
        const loc = (rep.location || "").toLowerCase();
        const desc = (rep.description || "").toLowerCase();
        return (
          loc.includes(vName) ||
          loc.includes(vDist) ||
          desc.includes(vName) ||
          desc.includes(vDist)
        );
      });
    },
    [reports]
  );

  // ── Dynamic live enrichment of villages with backend data ───────────
  const enrichedVillages: VillageItem[] = useMemo(() => {
    return MONITORED_VILLAGES.map((v) => {
      const vAlerts = getVillageAlerts(v);
      const vRoads = roads.filter((r) => r.code === v.corridor);

      // Elevate risk level dynamically if active Critical alert or blocked arterial highway
      let liveRisk: VillageRiskLevel = v.baseRiskLevel;
      const hasCriticalAlert = vAlerts.some((a) => a.severity === "Critical");
      const hasWarningAlert = vAlerts.some((a) => a.severity === "Warning");
      const hasBlockedRoad = vRoads.some((r) => r.status === "blocked");

      if (hasCriticalAlert || hasBlockedRoad) {
        liveRisk = "Critical";
      } else if (hasWarningAlert && liveRisk !== "Critical") {
        liveRisk = "High";
      }

      // Sync evacuation route clearance status with live road status
      let routeWithLiveStatus = v.evacuationRoute ? { ...v.evacuationRoute } : null;
      if (routeWithLiveStatus) {
        const matchingRoad = roads.find((r) => r.code === routeWithLiveStatus?.corridor);
        if (matchingRoad) {
          if (matchingRoad.status === "blocked") {
            routeWithLiveStatus.status = "blocked";
          } else if (matchingRoad.status === "caution") {
            routeWithLiveStatus.status = "caution";
          } else if (matchingRoad.status === "open") {
            routeWithLiveStatus.status = "clear";
          }
        }
      }

      return {
        ...v,
        currentRiskLevel: liveRisk,
        evacuationRoute: routeWithLiveStatus,
      };
    });
  }, [getVillageAlerts, roads]);

  // ── Overview Metrics ────────────────────────────────────────────────
  const overviewMetrics: VillageOverviewMetrics = useMemo(() => {
    const totalMonitored = enrichedVillages.length;
    const highRiskList = enrichedVillages.filter(
      (v) => v.currentRiskLevel === "Critical" || v.currentRiskLevel === "High"
    );
    const highRiskCount = highRiskList.length;
    const populationAtRisk = highRiskList.reduce(
      (sum, v) => sum + v.populationEstimate,
      0
    );
    const villagesWithActiveAlerts = enrichedVillages.filter(
      (v) => getVillageAlerts(v).length > 0
    ).length;

    return {
      totalMonitored,
      highRiskCount,
      populationAtRisk,
      villagesWithActiveAlerts,
    };
  }, [enrichedVillages, getVillageAlerts]);

  // ── Distinct District & State lists for filters ─────────────────────
  const availableDistricts = useMemo(() => {
    const set = new Set(enrichedVillages.map((v) => v.district));
    return ["All", ...Array.from(set).sort()];
  }, [enrichedVillages]);

  const availableStates = useMemo(() => {
    const set = new Set(enrichedVillages.map((v) => v.state));
    return ["All", ...Array.from(set).sort()];
  }, [enrichedVillages]);

  // ── Search & Filter Logic ───────────────────────────────────────────
  const filteredAndSortedVillages = useMemo(() => {
    let result = enrichedVillages.filter((v) => {
      // District filter
      if (selectedDistrict !== "All" && v.district !== selectedDistrict) {
        return false;
      }
      // State filter
      if (selectedState !== "All" && v.state !== selectedState) {
        return false;
      }
      // Risk filter
      if (selectedRisk !== "All" && v.currentRiskLevel !== selectedRisk) {
        return false;
      }
      // Text search
      const q = search.toLowerCase().trim();
      if (q) {
        const matchesName = v.name.toLowerCase().includes(q);
        const matchesDistrict = v.district.toLowerCase().includes(q);
        const matchesState = v.state.toLowerCase().includes(q);
        const matchesCorridor = v.corridor.toLowerCase().includes(q);
        const matchesContact =
          v.contactPerson?.name.toLowerCase().includes(q) || false;
        const matchesShelter =
          v.safeShelter?.name.toLowerCase().includes(q) || false;

        if (
          !matchesName &&
          !matchesDistrict &&
          !matchesState &&
          !matchesCorridor &&
          !matchesContact &&
          !matchesShelter
        ) {
          return false;
        }
      }
      return true;
    });

    // Sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case "risk-desc":
          return RISK_WEIGHTS[b.currentRiskLevel] - RISK_WEIGHTS[a.currentRiskLevel];
        case "risk-asc":
          return RISK_WEIGHTS[a.currentRiskLevel] - RISK_WEIGHTS[b.currentRiskLevel];
        case "pop-desc":
          return b.populationEstimate - a.populationEstimate;
        case "pop-asc":
          return a.populationEstimate - b.populationEstimate;
        case "name-asc":
          return a.name.localeCompare(b.name);
        case "district-asc":
          return a.district.localeCompare(b.district);
        default:
          return 0;
      }
    });

    return result;
  }, [
    enrichedVillages,
    search,
    selectedDistrict,
    selectedState,
    selectedRisk,
    sortBy,
  ]);

  // Ensure selected village remains valid when filters change
  const selectedVillage = useMemo(() => {
    return (
      enrichedVillages.find((v) => v.id === selectedVillageId) ||
      filteredAndSortedVillages[0] ||
      null
    );
  }, [enrichedVillages, selectedVillageId, filteredAndSortedVillages]);

  const selectedVillageAlerts = useMemo(() => {
    return selectedVillage ? getVillageAlerts(selectedVillage) : [];
  }, [selectedVillage, getVillageAlerts]);

  const selectedVillageReports = useMemo(() => {
    return selectedVillage ? getVillageReports(selectedVillage) : [];
  }, [selectedVillage, getVillageReports]);

  const hasActiveFilters =
    search !== "" ||
    selectedDistrict !== "All" ||
    selectedState !== "All" ||
    selectedRisk !== "All" ||
    sortBy !== "risk-desc";

  const handleResetFilters = () => {
    setSearch("");
    setSelectedDistrict("All");
    setSelectedState("All");
    setSelectedRisk("All");
    setSortBy("risk-desc");
  };

  const getRiskBadge = (level: VillageRiskLevel) => {
    switch (level) {
      case "Critical":
        return "bg-red-100 text-red-800 border-red-200 ring-1 ring-red-300";
      case "High":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "Medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "Low":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <PortalLayout
      allowedRoles={["officer", "admin"]}
      title="Settlement Vulnerability & Shelter Directory"
      subtitle="Supervise high-risk village boundaries, emergency contacts, safe evacuation shelters, and vulnerable population density."
      headerActions={
        <div className="flex items-center gap-2">
          <Link
            href="/officer/alerts"
            className="px-3.5 py-1.5 rounded-full bg-[#D6A65D] hover:bg-[#c9984e] text-[#173D32] text-xs font-bold shadow-xs transition-all flex items-center gap-1.5"
          >
            <span>📢</span> Broadcast Alert
          </Link>
          <Link
            href="/officer/dashboard"
            className="px-3.5 py-1.5 rounded-full bg-[#173D32] text-[#F6F4EC] text-xs font-bold hover:bg-[#1a4437] transition-all"
          >
            ← Dashboard
          </Link>
        </div>
      }
    >
      <div className="space-y-6 sm:space-y-8 w-full">
        {/* ── 1. Village Overview Summary Cards ─────────────────────────── */}
      <VillageOverviewCards metrics={overviewMetrics} isLoading={isLoading} />

      {/* ── Error Banner if Telemetry Sync Fails ──────────────────────── */}
      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>{error} — Operating with offline cached village telemetry.</span>
          </div>
          <button
            type="button"
            onClick={handleRetry}
            className="px-3 py-1 rounded-full bg-red-700 text-white font-bold self-start sm:self-auto cursor-pointer"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* ── 4. Search, Filter & Sorting Bar ──────────────────────────── */}
      <div className="mb-6 bg-[#FAF8F2] border border-[#173D32]/12 rounded-3xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#173D32]/50 text-xs">
              🔍
            </span>
            <input
              type="text"
              placeholder="Search village name, district, contact, shelter, corridor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-9 pr-8 rounded-xl bg-[#F6F4EC] border border-[#173D32]/20 text-xs text-[#173D32] placeholder:text-[#173D32]/50 focus:outline-none focus:ring-1 focus:ring-[#173D32]"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#173D32]/50 hover:text-[#173D32] cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            {/* District Filter */}
            <div className="flex items-center gap-1.5">
              <label htmlFor="district-select" className="text-[11px] font-bold text-[#173D32]/65 uppercase">
                District:
              </label>
              <select
                id="district-select"
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="h-9 px-3 rounded-xl bg-[#F6F4EC] border border-[#173D32]/20 text-xs font-bold text-[#173D32] focus:outline-none cursor-pointer"
              >
                <option value="All">All Districts</option>
                {availableDistricts
                  .filter((d) => d !== "All")
                  .map((dist) => (
                    <option key={dist} value={dist}>
                      {dist}
                    </option>
                  ))}
              </select>
            </div>

            {/* State Filter */}
            <div className="flex items-center gap-1.5">
              <label htmlFor="state-select" className="text-[11px] font-bold text-[#173D32]/65 uppercase">
                State:
              </label>
              <select
                id="state-select"
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className="h-9 px-3 rounded-xl bg-[#F6F4EC] border border-[#173D32]/20 text-xs font-bold text-[#173D32] focus:outline-none cursor-pointer"
              >
                <option value="All">All States</option>
                {availableStates
                  .filter((s) => s !== "All")
                  .map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
              </select>
            </div>

            {/* Risk Level Filter */}
            <div className="flex items-center gap-1.5">
              <label htmlFor="risk-select" className="text-[11px] font-bold text-[#173D32]/65 uppercase">
                Risk:
              </label>
              <select
                id="risk-select"
                value={selectedRisk}
                onChange={(e) => setSelectedRisk(e.target.value)}
                className="h-9 px-3 rounded-xl bg-[#F6F4EC] border border-[#173D32]/20 text-xs font-bold text-[#173D32] focus:outline-none cursor-pointer"
              >
                <option value="All">All Risk Levels</option>
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            {/* Sorting Dropdown */}
            <div className="flex items-center gap-1.5">
              <label htmlFor="sort-select" className="text-[11px] font-bold text-[#173D32]/65 uppercase">
                Sort:
              </label>
              <select
                id="sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="h-9 px-3 rounded-xl bg-[#F6F4EC] border border-[#173D32]/20 text-xs font-bold text-[#173D32] focus:outline-none cursor-pointer"
              >
                <option value="risk-desc">Risk (Highest First)</option>
                <option value="risk-asc">Risk (Lowest First)</option>
                <option value="pop-desc">Population (Highest First)</option>
                <option value="pop-asc">Population (Lowest First)</option>
                <option value="name-asc">Village Name (A–Z)</option>
                <option value="district-asc">District (A–Z)</option>
              </select>
            </div>

            {/* Reset Filters */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="h-9 px-3 rounded-xl bg-[#173D32]/10 hover:bg-[#173D32]/15 text-[#173D32] text-xs font-bold transition-all cursor-pointer"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>

        {/* View Switcher & Result Count Bar */}
        <div className="pt-2 border-t border-[#173D32]/8 flex items-center justify-between text-xs text-[#173D32]/70 font-medium">
          <div>
            Showing{" "}
            <span className="font-extrabold text-[#173D32]">
              {filteredAndSortedVillages.length}
            </span>{" "}
            of {enrichedVillages.length} monitored settlements
          </div>

          <div className="flex items-center gap-1 bg-[#F6F4EC] p-1 rounded-xl border border-[#173D32]/10">
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === "table"
                  ? "bg-[#173D32] text-[#F6F4EC] shadow-2xs"
                  : "text-[#173D32]/70 hover:text-[#173D32]"
              }`}
            >
              📑 Table
            </button>
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === "cards"
                  ? "bg-[#173D32] text-[#F6F4EC] shadow-2xs"
                  : "text-[#173D32]/70 hover:text-[#173D32]"
              }`}
            >
              🗂️ Cards
            </button>
          </div>
        </div>
      </div>

      {/* ── Main Workspace: Directory (Left) + Detail Panel (Right) ───── */}
      <PortalSplitLayout
        leftSpan={7}
        stickyRight={true}
        left={
          <div className="space-y-4">
          {/* Loading Skeleton */}
          {isLoading && (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((n) => (
                <div
                  key={n}
                  className="h-24 bg-[#FAF8F2] border border-[#173D32]/10 rounded-2xl animate-pulse"
                />
              ))}
            </div>
          )}

          {/* Empty Search Result State */}
          {!isLoading && filteredAndSortedVillages.length === 0 && (
            <div className="text-center py-16 bg-[#FAF8F2] border border-[#173D32]/12 rounded-3xl p-6">
              <span className="text-3xl block mb-2">🔍</span>
              <h4 className="text-base font-extrabold text-[#173D32]">
                No Villages Found
              </h4>
              <p className="text-xs text-[#173D32]/70 mt-1 max-w-sm mx-auto leading-relaxed">
                No monitored settlement matches the current filter criteria or
                search keyword.
              </p>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="mt-4 px-4 py-2 rounded-xl bg-[#173D32] text-[#F6F4EC] text-xs font-bold hover:bg-[#1a4437] transition-all cursor-pointer"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          )}

          {/* Directory Content: Table View */}
          {!isLoading &&
            filteredAndSortedVillages.length > 0 &&
            viewMode === "table" && (
              <div className="bg-[#FAF8F2] border border-[#173D32]/12 rounded-3xl shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#173D32]/5 border-b border-[#173D32]/10 text-[11px] font-black uppercase tracking-wider text-[#173D32]">
                        <th className="py-3.5 px-4">Village & Corridor</th>
                        <th className="py-3.5 px-3">District</th>
                        <th className="py-3.5 px-3">Risk Level</th>
                        <th className="py-3.5 px-3 text-right">Population</th>
                        <th className="py-3.5 px-3">Nearest Safe Shelter</th>
                        <th className="py-3.5 px-3">Evacuation Route</th>
                        <th className="py-3.5 px-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#173D32]/8 font-medium text-[#173D32]">
                      {filteredAndSortedVillages.map((village) => {
                        const isSelected = selectedVillage?.id === village.id;
                        const vAlerts = getVillageAlerts(village);
                        const vReports = getVillageReports(village);

                        return (
                          <tr
                            key={village.id}
                            onClick={() => setSelectedVillageId(village.id)}
                            className={`transition-colors cursor-pointer ${
                              isSelected
                                ? "bg-[#173D32]/8 font-semibold"
                                : "hover:bg-[#173D32]/4"
                            }`}
                          >
                            {/* Village Name & ID */}
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-extrabold text-sm text-[#173D32]">
                                  {village.name}
                                </span>
                                {vAlerts.length > 0 && (
                                  <span
                                    className="px-1.5 py-0.2 rounded-full text-[9px] font-black uppercase bg-red-600 text-white animate-pulse"
                                    title={`${vAlerts.length} active alert(s)`}
                                  >
                                    Alert
                                  </span>
                                )}
                                {vReports.length > 0 && (
                                  <span
                                    className="px-1.5 py-0.2 rounded-full text-[9px] font-black uppercase bg-blue-600 text-white"
                                    title={`${vReports.length} ground report(s)`}
                                  >
                                    Report
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-[#173D32]/60 block font-mono">
                                {village.id} · {village.state} ({village.corridor})
                              </span>
                            </td>

                            {/* District */}
                            <td className="py-3.5 px-3 whitespace-nowrap">
                              <span className="font-semibold">
                                {village.district}
                              </span>
                            </td>

                            {/* Risk Level */}
                            <td className="py-3.5 px-3 whitespace-nowrap">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${getRiskBadge(
                                  village.currentRiskLevel
                                )}`}
                              >
                                {village.currentRiskLevel}
                              </span>
                            </td>

                            {/* Population */}
                            <td className="py-3.5 px-3 text-right whitespace-nowrap">
                              <span className="font-extrabold">
                                {village.populationEstimate.toLocaleString()}
                              </span>
                            </td>

                            {/* Nearest Safe Shelter */}
                            <td className="py-3.5 px-3 max-w-[160px]">
                              {village.safeShelter ? (
                                <div className="truncate">
                                  <span
                                    className="font-bold text-[#173D32] truncate block"
                                    title={village.safeShelter.name}
                                  >
                                    🏫 {village.safeShelter.name}
                                  </span>
                                  <span className="text-[10px] text-[#173D32]/65 block">
                                    {village.safeShelter.distanceKm} km · Cap:{" "}
                                    {village.safeShelter.capacity}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-[11px] text-[#173D32]/50 italic">
                                  — Not designated
                                </span>
                              )}
                            </td>

                            {/* Evacuation Route */}
                            <td className="py-3.5 px-3 max-w-[170px]">
                              {village.evacuationRoute ? (
                                <div className="truncate">
                                  <span
                                    className="font-bold text-[#173D32] truncate block"
                                    title={village.evacuationRoute.name}
                                  >
                                    🛣️ {village.evacuationRoute.name}
                                  </span>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <span
                                      className={`px-1.5 py-0.2 rounded-md text-[9px] font-black uppercase ${
                                        village.evacuationRoute.status ===
                                        "blocked"
                                          ? "bg-red-100 text-red-800"
                                          : village.evacuationRoute.status ===
                                            "caution"
                                          ? "bg-amber-100 text-amber-800"
                                          : "bg-emerald-100 text-emerald-800"
                                      }`}
                                    >
                                      {village.evacuationRoute.status}
                                    </span>
                                    <span className="text-[10px] text-[#173D32]/65">
                                      {village.evacuationRoute.distanceKm} km
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <span className="text-[11px] text-[#173D32]/50 italic">
                                  — Route unmapped
                                </span>
                              )}
                            </td>

                            {/* Action */}
                            <td className="py-3.5 px-3 text-center whitespace-nowrap">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedVillageId(village.id);
                                }}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                  isSelected
                                    ? "bg-[#173D32] text-[#F6F4EC]"
                                    : "bg-[#173D32]/10 hover:bg-[#173D32]/20 text-[#173D32]"
                                }`}
                              >
                                {isSelected ? "Active" : "Inspect →"}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          {/* Directory Content: Card Grid View */}
          {!isLoading &&
            filteredAndSortedVillages.length > 0 &&
            viewMode === "cards" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredAndSortedVillages.map((village) => {
                  const isSelected = selectedVillage?.id === village.id;
                  const vAlerts = getVillageAlerts(village);
                  const vReports = getVillageReports(village);

                  return (
                    <div
                      key={village.id}
                      onClick={() => setSelectedVillageId(village.id)}
                      className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? "bg-[#FAF8F2] border-[#173D32] shadow-sm ring-1 ring-[#173D32]/30"
                          : "bg-[#FAF8F2] border-[#173D32]/12 hover:border-[#173D32]/30"
                      }`}
                    >
                      <div>
                        {/* Card Header */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <h4 className="text-base font-black text-[#173D32]">
                              {village.name}
                            </h4>
                            <span className="text-[11px] text-[#173D32]/70 font-medium">
                              {village.district} District · {village.state}
                            </span>
                          </div>

                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${getRiskBadge(
                              village.currentRiskLevel
                            )}`}
                          >
                            {village.currentRiskLevel}
                          </span>
                        </div>

                        {/* Badges for active alerts/reports */}
                        <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                          {vAlerts.length > 0 && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-red-600 text-white animate-pulse">
                              {vAlerts.length} Active Alert
                            </span>
                          )}
                          {vReports.length > 0 && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-600 text-white">
                              {vReports.length} Report
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded-md bg-[#173D32]/5 text-[#173D32] text-[10px] font-bold">
                            {village.corridor}
                          </span>
                        </div>

                        {/* Metric Bar */}
                        <div className="py-2 border-y border-[#173D32]/8 grid grid-cols-2 gap-2 text-xs mb-3">
                          <div>
                            <span className="text-[#173D32]/60 block text-[11px]">
                              Population Est.
                            </span>
                            <span className="font-extrabold text-[#173D32]">
                              👥 {village.populationEstimate.toLocaleString()}
                            </span>
                          </div>
                          <div>
                            <span className="text-[#173D32]/60 block text-[11px]">
                              24h Rainfall
                            </span>
                            <span className="font-extrabold text-[#173D32]">
                              🌧️ {village.lastRainfall || "N/A"}
                            </span>
                          </div>
                        </div>

                        {/* Shelter Information */}
                        <div className="p-2.5 rounded-xl bg-[#F6F4EC] border border-[#173D32]/10 text-xs mb-2.5">
                          <span className="text-[10px] font-bold text-[#173D32]/60 uppercase block">
                            Nearest Safe Shelter:
                          </span>
                          {village.safeShelter ? (
                            <div className="mt-0.5">
                              <span className="font-extrabold text-[#173D32] block">
                                🏫 {village.safeShelter.name}
                              </span>
                              <span className="text-[10px] text-[#173D32]/70 block mt-0.5">
                                {village.safeShelter.distanceKm} km · Capacity:{" "}
                                {village.safeShelter.capacity}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[11px] text-[#173D32]/50 italic block mt-0.5">
                              No designated safe shelter recorded
                            </span>
                          )}
                        </div>

                        {/* Evacuation Route */}
                        <div className="p-2.5 rounded-xl bg-[#F6F4EC] border border-[#173D32]/10 text-xs">
                          <span className="text-[10px] font-bold text-[#173D32]/60 uppercase block">
                            Evacuation Corridor:
                          </span>
                          {village.evacuationRoute ? (
                            <div className="mt-0.5 flex items-center justify-between gap-1">
                              <span className="font-bold text-[#173D32] truncate">
                                🛣️ {village.evacuationRoute.name}
                              </span>
                              <span
                                className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase shrink-0 ${
                                  village.evacuationRoute.status === "blocked"
                                    ? "bg-red-100 text-red-800"
                                    : village.evacuationRoute.status ===
                                      "caution"
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-emerald-100 text-emerald-800"
                                }`}
                              >
                                {village.evacuationRoute.status}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[11px] text-[#173D32]/50 italic block mt-0.5">
                              Evacuation route unmapped
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Card Footer */}
                      <div className="mt-4 pt-3 border-t border-[#173D32]/8 flex items-center justify-between text-xs">
                        <span className="text-[10px] text-[#173D32]/60 font-mono">
                          ID: {village.id}
                        </span>
                        <span
                          className={`font-bold ${
                            isSelected ? "text-[#173D32]" : "text-[#173D32]/70"
                          }`}
                        >
                          {isSelected ? "Inspecting ✓" : "Review Dossier →"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        }
        right={
          <VillageDetailPanel
            village={selectedVillage}
            activeAlerts={selectedVillageAlerts}
            reportedIssues={selectedVillageReports}
          />
        }
      />
      </div>
    </PortalLayout>
  );
}
