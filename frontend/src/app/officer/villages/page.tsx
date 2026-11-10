"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CloudRain,
  Home,
  LayoutGrid,
  List,
  Megaphone,
  Route,
  Search,
  Users,
  X,
} from "lucide-react";
import PortalLayout from "@/components/portal/PortalLayout";
import { publicApi, reportsApi, officerApi } from "@/lib/api";
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
import VillageRiskHistoryBar from "@/components/officer/VillageRiskHistoryBar";
import VillageRiskBadge, {
  getSelectedRowTheme,
} from "@/components/officer/VillageRiskBadge";
import SettlementIcon from "@/components/officer/SettlementIcon";
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

function getRiskBarClass(level: VillageRiskLevel): string {
  switch (level) {
    case "Critical":
      return "bg-[#DC2626]";
    case "High":
      return "bg-[#D97706]";
    case "Medium":
      return "bg-[#16A34A]";
    default:
      return "bg-[#1E7A45]";
  }
}

function getEvacStatusBadgeClass(status?: string): string {
  if (status === "blocked") return "bg-[#FDE8E8] text-[#B91C1C]";
  if (status === "caution") return "bg-[#FEEFD6] text-[#9A5B06]";
  return "bg-[#DCFCE7] text-[#166534]";
}

export default function OfficerVillagesPage() {
  // Filters & Search State
  const [search, setSearch] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("All");
  const [selectedState, setSelectedState] = useState("All");
  const [selectedRisk, setSelectedRisk] = useState<string>("All");
  const [sortBy, setSortBy] = useState<SortOption>("risk-desc");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");

  // Selection & Telemetry State
  const [villagesList, setVillagesList] = useState<VillageItem[]>(MONITORED_VILLAGES);
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
  useEffect(() => {
    let mounted = true;

    async function fetchBackendData() {
      try {
        const [villagesRes, alertsRes, roadsRes, reportsRes] = await Promise.allSettled([
          officerApi.listVillages(),
          publicApi.getAlerts({ limit: 50 }),
          publicApi.getRoadStatus({}),
          reportsApi.getReports({ limit: 50 }),
        ]);

        if (!mounted) return;

        if (villagesRes.status === "fulfilled" && Array.isArray(villagesRes.value)) {
          const liveVillages: VillageItem[] = villagesRes.value.map((v: any, idx: number) => {
            const risk: VillageRiskLevel = (v.riskLevel === "Critical" || v.riskLevel === "High" || v.riskLevel === "Medium" || v.riskLevel === "Low") ? v.riskLevel : "Medium";
            return {
              id: v._id || v.id || `vil-${idx}`,
              name: v.villageName,
              district: v.district,
              state: v.state,
              corridor: v.corridor || "NH-29",
              baseRiskLevel: risk,
              currentRiskLevel: risk,
              populationEstimate: v.population || 1200,
              householdsEstimate: Math.round((v.population || 1200) / 4.5),
              contactPerson: v.contactPersons?.[0] ? {
                name: v.contactPersons[0].name,
                phone: v.contactPersons[0].phone,
                designation: v.contactPersons[0].role || "Village Headman",
              } : null,
              safeShelter: {
                id: v.primaryShelterId?._id || "sh-01",
                name: v.primaryShelterId?.name || "Community Relief Shelter",
                capacity: v.primaryShelterId?.capacity || 300,
                status: "Operational",
                helpline: v.contactPersons?.[0]?.phone || "1077",
              },
              evacuationRoute: {
                id: "er-01",
                name: `${v.villageName} Primary Bypass`,
                corridor: v.corridor || "NH-29",
                status: v.evacuationStatus === "Evacuate" ? "blocked" : v.evacuationStatus === "Advisory" ? "caution" : "clear",
                estimatedTransitTime: "45 mins",
                vehicleEligibility: "LMVs & Ambulances",
              },
              riskHistory: [
                { date: "Oct 28", level: "Low", trigger: "Periodic Monitoring" },
                { date: "Nov 01", level: "Medium", trigger: "Rainfall Advisory" },
                { date: "Nov 05", level: risk, trigger: "Automated Sensor Telemetry" },
              ],
            };
          });

          if (liveVillages.length > 0) {
            setVillagesList(liveVillages);
            setSelectedVillageId((prev) =>
              liveVillages.some((v) => v.id === prev) ? prev : liveVillages[0].id
            );
          }
        }

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
        if (!mounted) return;
        const msg =
          err instanceof Error
            ? err.message
            : "Failed to load live telemetry from server";
        setError(msg);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    void fetchBackendData();
    return () => {
      mounted = false;
    };
  }, [refreshTrigger]);

  const handleRetry = () => {
    setIsLoading(true);
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
          vCorr &&
          alertCorr &&
          (alertCorr.includes(vCorr) || vCorr.includes(alertCorr));

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
    const baseList = villagesList.length > 0 ? villagesList : MONITORED_VILLAGES;
    return baseList.map((v) => {
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
      const routeWithLiveStatus = v.evacuationRoute
        ? { ...v.evacuationRoute }
        : null;
      if (routeWithLiveStatus) {
        const matchingRoad = roads.find(
          (r) => r.code === routeWithLiveStatus.corridor
        );
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
    const result = enrichedVillages.filter((v) => {
      if (selectedDistrict !== "All" && v.district !== selectedDistrict) {
        return false;
      }
      if (selectedState !== "All" && v.state !== selectedState) {
        return false;
      }
      if (selectedRisk !== "All" && v.currentRiskLevel !== selectedRisk) {
        return false;
      }
      const q = search.toLowerCase().trim();
      if (q) {
        const matchesId = v.id.toLowerCase().includes(q);
        const matchesName = v.name.toLowerCase().includes(q);
        const matchesDistrict = v.district.toLowerCase().includes(q);
        const matchesState = v.state.toLowerCase().includes(q);
        const matchesCorridor = v.corridor.toLowerCase().includes(q);
        const matchesContact =
          v.contactPerson?.name.toLowerCase().includes(q) || false;
        const matchesShelter =
          v.safeShelter?.name.toLowerCase().includes(q) || false;

        if (
          !matchesId &&
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

    result.sort((a, b) => {
      switch (sortBy) {
        case "risk-desc":
          return (
            RISK_WEIGHTS[b.currentRiskLevel] - RISK_WEIGHTS[a.currentRiskLevel]
          );
        case "risk-asc":
          return (
            RISK_WEIGHTS[a.currentRiskLevel] - RISK_WEIGHTS[b.currentRiskLevel]
          );
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

  // Ensure selected village remains aligned with filtered directory
  const selectedVillage = useMemo(() => {
    return (
      filteredAndSortedVillages.find((v) => v.id === selectedVillageId) ||
      filteredAndSortedVillages[0] ||
      null
    );
  }, [selectedVillageId, filteredAndSortedVillages]);

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

  return (
    <PortalLayout
      allowedRoles={["officer", "admin"]}
      title="Settlement Vulnerability & Shelter Directory"
      subtitle="Supervise high-risk village boundaries, emergency contacts, safe evacuation shelters, and vulnerable population density."
      headerActions={
        <div className="flex items-center gap-2">
          <Link
            href="/officer/alerts"
            className="px-3.5 py-1.5 rounded-full bg-[#D6A65D] hover:bg-[#c9984e] text-[#173D32] text-xs font-bold shadow-xs transition-all inline-flex items-center gap-1.5"
          >
            <Megaphone className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Broadcast Alert</span>
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
      <div className="space-y-6 w-full">
        {/* ── 1. Village Overview Summary Cards ─────────────────────────── */}
        <VillageOverviewCards metrics={overviewMetrics} isLoading={isLoading} />

        {/* ── Error Banner if Telemetry Sync Fails ──────────────────────── */}
        {error && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-semibold">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>
                {error} — Operating with offline cached village telemetry.
              </span>
            </div>
            <button
              type="button"
              onClick={handleRetry}
              className="px-3.5 py-1.5 rounded-full bg-red-700 text-white font-bold self-start sm:self-auto cursor-pointer hover:bg-red-800 transition-colors"
            >
              Retry Connection
            </button>
          </div>
        )}

        {/* ── 2. Search, Filter & Sorting Bar ───────────────────────────── */}
        <div className="bg-[#FCFBF8] border border-[#173D32]/12 rounded-2xl p-3.5 sm:p-4 shadow-[0_2px_10px_-3px_rgba(23,61,50,0.06)]">
          <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-2.5 xl:gap-3">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[170px]">
              <Search
                className="w-3.5 h-3.5 text-[#173D32]/50 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                id="village-search"
                name="village-search"
                type="text"
                placeholder="Search village, corridor or ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search village, corridor or ID"
                className="w-full h-9.5 pl-8 pr-8 rounded-xl bg-[#F6F4EC]/75 border border-[#173D32]/15 text-xs text-[#173D32] placeholder:text-[#173D32]/50 focus:outline-none focus:ring-1 focus:ring-[#173D32] focus:bg-white transition-colors"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full text-[#173D32]/50 hover:text-[#173D32] hover:bg-[#173D32]/8 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Dropdowns with Hairline Dividers */}
            <div className="flex flex-wrap xl:flex-nowrap items-center gap-1.5 sm:gap-2 shrink-0">
              {/* District Filter */}
              <div className="flex items-center gap-1">
                <label
                  htmlFor="district-select"
                  className="text-[11px] font-medium text-[#173D32]/70 whitespace-nowrap"
                >
                  District:
                </label>
                <div className="relative inline-flex items-center">
                  <select
                    id="district-select"
                    value={selectedDistrict}
                    onChange={(e) => setSelectedDistrict(e.target.value)}
                    className="appearance-none h-9 max-w-[114px] pl-2.5 pr-6 rounded-xl bg-white border border-[#173D32]/15 text-[11px] font-bold text-[#173D32] shadow-2xs truncate focus:outline-none focus:ring-1 focus:ring-[#173D32] cursor-pointer"
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
                  <ChevronDown
                    className="w-3.5 h-3.5 text-[#173D32]/65 pointer-events-none absolute right-2"
                    aria-hidden="true"
                  />
                </div>
              </div>

              <span
                className="hidden xl:block h-4 w-px bg-[#173D32]/12"
                aria-hidden="true"
              />

              {/* State Filter */}
              <div className="flex items-center gap-1">
                <label
                  htmlFor="state-select"
                  className="text-[11px] font-medium text-[#173D32]/70 whitespace-nowrap"
                >
                  State:
                </label>
                <div className="relative inline-flex items-center">
                  <select
                    id="state-select"
                    value={selectedState}
                    onChange={(e) => setSelectedState(e.target.value)}
                    className="appearance-none h-9 max-w-[116px] pl-2.5 pr-6 rounded-xl bg-white border border-[#173D32]/15 text-[11px] font-bold text-[#173D32] shadow-2xs truncate focus:outline-none focus:ring-1 focus:ring-[#173D32] cursor-pointer"
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
                  <ChevronDown
                    className="w-3.5 h-3.5 text-[#173D32]/65 pointer-events-none absolute right-2"
                    aria-hidden="true"
                  />
                </div>
              </div>

              <span
                className="hidden xl:block h-4 w-px bg-[#173D32]/12"
                aria-hidden="true"
              />

              {/* Risk Level Filter */}
              <div className="flex items-center gap-1">
                <label
                  htmlFor="risk-select"
                  className="text-[11px] font-medium text-[#173D32]/70 whitespace-nowrap"
                >
                  Risk:
                </label>
                <div className="relative inline-flex items-center">
                  <select
                    id="risk-select"
                    value={selectedRisk}
                    onChange={(e) => setSelectedRisk(e.target.value)}
                    className="appearance-none h-9 max-w-[120px] pl-2.5 pr-6 rounded-xl bg-white border border-[#173D32]/15 text-[11px] font-bold text-[#173D32] shadow-2xs truncate focus:outline-none focus:ring-1 focus:ring-[#173D32] cursor-pointer"
                  >
                    <option value="All">All Risk Levels</option>
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Moderate</option>
                    <option value="Low">Low</option>
                  </select>
                  <ChevronDown
                    className="w-3.5 h-3.5 text-[#173D32]/65 pointer-events-none absolute right-2"
                    aria-hidden="true"
                  />
                </div>
              </div>

              <span
                className="hidden xl:block h-4 w-px bg-[#173D32]/12"
                aria-hidden="true"
              />

              {/* Sorting Dropdown */}
              <div className="flex items-center gap-1">
                <label
                  htmlFor="sort-select"
                  className="text-[11px] font-medium text-[#173D32]/70 whitespace-nowrap"
                >
                  Sort:
                </label>
                <div className="relative inline-flex items-center">
                  <select
                    id="sort-select"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="appearance-none h-9 max-w-[146px] pl-2.5 pr-6 rounded-xl bg-white border border-[#173D32]/15 text-[11px] font-bold text-[#173D32] shadow-2xs truncate focus:outline-none focus:ring-1 focus:ring-[#173D32] cursor-pointer"
                  >
                    <option value="risk-desc">Risk (Highest First)</option>
                    <option value="risk-asc">Risk (Lowest First)</option>
                    <option value="pop-desc">Population (Highest First)</option>
                    <option value="pop-asc">Population (Lowest First)</option>
                    <option value="name-asc">Village Name (A–Z)</option>
                    <option value="district-asc">District (A–Z)</option>
                  </select>
                  <ChevronDown
                    className="w-3.5 h-3.5 text-[#173D32]/65 pointer-events-none absolute right-2"
                    aria-hidden="true"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* View Switcher & Result Count Bar */}
          <div className="pt-3 mt-3 border-t border-[#173D32]/10 flex flex-wrap items-center justify-between gap-2 text-xs text-[#173D32]/70 font-medium">
            <div className="flex flex-wrap items-center gap-3">
              <span>
                Showing{" "}
                <span className="font-bold text-[#173D32]">
                  {filteredAndSortedVillages.length}
                </span>{" "}
                of{" "}
                <span className="font-bold text-[#173D32]">
                  {enrichedVillages.length}
                </span>{" "}
                monitored settlements
              </span>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-2.5 py-1 rounded-lg bg-[#173D32]/8 hover:bg-[#173D32]/14 text-[#173D32] text-[11px] font-bold transition-colors cursor-pointer"
                >
                  Reset filters
                </button>
              )}
            </div>

            <div className="inline-flex items-center rounded-xl border border-[#173D32]/15 bg-white p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={() => setViewMode("table")}
                aria-pressed={viewMode === "table"}
                className={`px-3 py-1.5 rounded-[9px] text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                  viewMode === "table"
                    ? "bg-[#173D32] text-[#F6F4EC] shadow-2xs"
                    : "text-[#173D32]/75 hover:text-[#173D32]"
                }`}
              >
                <List className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Table</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                aria-pressed={viewMode === "cards"}
                className={`px-3 py-1.5 rounded-[9px] text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                  viewMode === "cards"
                    ? "bg-[#173D32] text-[#F6F4EC] shadow-2xs"
                    : "text-[#173D32]/75 hover:text-[#173D32]"
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Cards</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── 3. Main Workspace: Directory (Left) + Village Dossier (Right) ─ */}
        <PortalSplitLayout
          leftSpan={7}
          stickyRight={true}
          left={
            <div className="space-y-4">
              {/* Loading Skeleton */}
              {isLoading && (
                <div className="bg-[#FCFBF8] border border-[#173D32]/12 rounded-2xl p-4 space-y-3 shadow-[0_2px_10px_-3px_rgba(23,61,50,0.06)]">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <div
                      key={n}
                      className="h-16 bg-[#F5F2E9]/70 rounded-xl animate-pulse"
                    />
                  ))}
                </div>
              )}

              {/* Empty Search Result State */}
              {!isLoading && filteredAndSortedVillages.length === 0 && (
                <div className="text-center py-14 bg-[#FCFBF8] border border-[#173D32]/12 rounded-2xl p-6 shadow-[0_2px_10px_-3px_rgba(23,61,50,0.06)]">
                  <div className="w-12 h-12 rounded-2xl bg-[#EAF0E6] border border-[#173D32]/10 flex items-center justify-center text-[#173D32] mx-auto mb-3">
                    <Search className="w-5 h-5" />
                  </div>
                  <h4 className="text-base font-extrabold text-[#173D32]">
                    No Settlements Found
                  </h4>
                  <p className="text-xs text-[#173D32]/65 mt-1.5 max-w-sm mx-auto leading-relaxed">
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
                  <div className="bg-[#FCFBF8] border border-[#173D32]/12 rounded-2xl shadow-[0_2px_10px_-3px_rgba(23,61,50,0.06)] overflow-hidden">
                    {/* Mobile Accessible Table Rows (< 768px) preserving all columns without horizontal squeezing */}
                    <div className="md:hidden divide-y divide-[#173D32]/10 text-xs">
                      {filteredAndSortedVillages.map((village) => {
                        const isSelected = selectedVillage?.id === village.id;
                        const selectedTheme = getSelectedRowTheme(
                          village.currentRiskLevel
                        );

                        return (
                          <div
                            key={village.id}
                            role="button"
                            tabIndex={0}
                            aria-pressed={isSelected}
                            onClick={() => setSelectedVillageId(village.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                setSelectedVillageId(village.id);
                              }
                            }}
                            className={`relative p-3.5 transition-colors cursor-pointer ${
                              isSelected
                                ? selectedTheme.rowBg
                                : "bg-[#FCFBF8] hover:bg-[#F6F4EC]/75"
                            }`}
                          >
                            {isSelected && (
                              <span
                                aria-hidden="true"
                                className={`absolute left-0 top-2 bottom-2 w-1 rounded-r-full ${selectedTheme.barBg}`}
                              />
                            )}
                            <div className="flex items-start justify-between gap-2.5">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <SettlementIcon
                                  villageId={village.id}
                                  villageName={village.name}
                                  selectedBoxBg={
                                    isSelected
                                      ? selectedTheme.iconBoxBg
                                      : undefined
                                  }
                                />
                                <div className="min-w-0">
                                  <span className="font-bold text-[13px] text-[#173D32] leading-snug block truncate">
                                    {village.name}
                                  </span>
                                  <span className="text-[10.5px] font-medium text-[#173D32]/65 block mt-0.5">
                                    {village.id} &bull; {village.corridor}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <VillageRiskBadge
                                  level={village.currentRiskLevel}
                                  compact
                                />
                                <ChevronRight
                                  className="w-4 h-4 text-[#173D32]/50"
                                  aria-hidden="true"
                                />
                              </div>
                            </div>

                            <div className="mt-2.5 pt-2 border-t border-[#173D32]/8 grid grid-cols-2 gap-2 text-[11px]">
                              <div>
                                <span className="text-[#173D32]/55 block text-[10px] font-semibold uppercase">
                                  District
                                </span>
                                <span className="font-semibold text-[#173D32]">
                                  {village.district}
                                </span>
                              </div>
                              <div>
                                <span className="text-[#173D32]/55 block text-[10px] font-semibold uppercase">
                                  Population
                                </span>
                                <span className="font-bold text-[#173D32] tabular-nums inline-flex items-center gap-1">
                                  <Users className="w-3 h-3 text-[#173D32]/65" aria-hidden="true" />
                                  {village.populationEstimate.toLocaleString()}
                                </span>
                              </div>
                              <div className="col-span-2">
                                <span className="text-[#173D32]/55 block text-[10px] font-semibold uppercase">
                                  Nearest Safe Shelter
                                </span>
                                {village.safeShelter ? (
                                  <span className="font-semibold text-[#173D32] inline-flex items-center gap-1 flex-wrap">
                                    <Home className="w-3 h-3 text-[#2E6041] shrink-0" aria-hidden="true" />
                                    <span>{village.safeShelter.name}</span>
                                    <span className="text-[#173D32]/60 font-medium">
                                      ({village.safeShelter.distanceKm} km &bull; Cap:{" "}
                                      {village.safeShelter.capacity})
                                    </span>
                                  </span>
                                ) : (
                                  <span className="text-[#173D32]/45 italic">
                                    — Not designated
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-[#F5F2E9] border-b border-[#173D32]/10 text-[11px] font-semibold text-[#173D32]/85">
                            <th className="py-3 pl-3.5 pr-1.5 whitespace-nowrap">
                              Settlement &amp; Corridor
                            </th>
                            <th className="py-3 px-1.5 whitespace-nowrap">
                              District
                            </th>
                            <th className="py-3 px-1.5 whitespace-nowrap">
                              Risk Level
                            </th>
                            <th className="py-3 px-1.5 whitespace-nowrap">
                              Population
                            </th>
                            <th className="py-3 px-1.5 whitespace-nowrap">
                              Nearest Safe Shelter
                            </th>
                            <th className="py-3 pr-2.5 pl-1 w-8">
                              <span className="sr-only">Inspect</span>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#173D32]/8 text-[#173D32]">
                          {filteredAndSortedVillages.map((village) => {
                            const isSelected = selectedVillage?.id === village.id;
                            const selectedTheme = getSelectedRowTheme(
                              village.currentRiskLevel
                            );

                            return (
                              <tr
                                key={village.id}
                                tabIndex={0}
                                aria-selected={isSelected}
                                onClick={() => setSelectedVillageId(village.id)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    setSelectedVillageId(village.id);
                                  }
                                }}
                                className={`transition-colors cursor-pointer group focus:outline-none focus-visible:bg-[#EEF4EB] ${
                                  isSelected
                                    ? selectedTheme.rowBg
                                    : "bg-[#FCFBF8] hover:bg-[#F6F4EC]/75"
                                }`}
                              >
                                {/* Settlement & Corridor */}
                                <td className="py-3.5 pl-3.5 pr-1.5 relative max-w-[158px]">
                                  {isSelected && (
                                    <span
                                      aria-hidden="true"
                                      className={`absolute left-0.5 top-1.5 bottom-1.5 w-1 rounded-full ${selectedTheme.barBg}`}
                                    />
                                  )}
                                  <div className="flex items-center gap-2 min-w-0">
                                    <SettlementIcon
                                      villageId={village.id}
                                      villageName={village.name}
                                      selectedBoxBg={
                                        isSelected
                                          ? selectedTheme.iconBoxBg
                                          : undefined
                                      }
                                    />
                                    <div className="min-w-0">
                                      <span
                                        title={village.name}
                                        className="font-bold text-[12.5px] text-[#173D32] leading-snug block truncate"
                                      >
                                        {village.name}
                                      </span>
                                      <span className="text-[10.5px] font-medium text-[#173D32]/60 block mt-0.5 whitespace-nowrap">
                                        {village.id} &bull; {village.corridor}
                                      </span>
                                    </div>
                                  </div>
                                </td>

                                {/* District */}
                                <td className="py-3 px-1.5 whitespace-nowrap">
                                  <span className="font-medium text-[11px] text-[#173D32]/85">
                                    {village.district}
                                  </span>
                                </td>

                                {/* Risk Level */}
                                <td className="py-3 px-1.5 whitespace-nowrap">
                                  <VillageRiskBadge
                                    level={village.currentRiskLevel}
                                    compact
                                  />
                                </td>

                                {/* Population */}
                                <td className="py-3 px-1.5 whitespace-nowrap">
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#173D32] tabular-nums">
                                    <Users
                                      className="w-3.5 h-3.5 text-[#173D32]/65 shrink-0"
                                      aria-hidden="true"
                                    />
                                    <span>
                                      {village.populationEstimate.toLocaleString()}
                                    </span>
                                  </span>
                                </td>

                                {/* Nearest Safe Shelter */}
                                <td className="py-3 px-1.5 max-w-[144px]">
                                  {village.safeShelter ? (
                                    <div className="min-w-0">
                                      <span
                                        className="font-bold text-[11px] text-[#173D32] inline-flex items-center gap-1 max-w-full"
                                        title={village.safeShelter.name}
                                      >
                                        <Home
                                          className="w-3.5 h-3.5 text-[#2E6041] shrink-0"
                                          aria-hidden="true"
                                        />
                                        <span className="truncate">
                                          {village.safeShelter.name}
                                        </span>
                                      </span>
                                      <span className="text-[10px] text-[#173D32]/60 block mt-0.5 pl-4.5 whitespace-nowrap">
                                        {village.safeShelter.distanceKm} km &bull;
                                        Capacity: {village.safeShelter.capacity}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-[11px] text-[#173D32]/45 italic">
                                      — Not designated
                                    </span>
                                  )}
                                </td>

                                {/* Inspect Chevron Button */}
                                <td className="py-3 pr-2.5 pl-1 text-right whitespace-nowrap">
                                  <button
                                    type="button"
                                    aria-label={`Inspect ${village.name}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedVillageId(village.id);
                                    }}
                                    className={`w-6.5 h-6.5 rounded-full border inline-flex items-center justify-center transition-all cursor-pointer ${
                                      isSelected
                                        ? "bg-white border-[#173D32]/20 text-[#173D32] shadow-2xs"
                                        : "bg-white/90 border-[#173D32]/12 text-[#173D32]/60 group-hover:border-[#173D32]/25 group-hover:text-[#173D32]"
                                    }`}
                                  >
                                    <ChevronRight
                                      className="w-3.5 h-3.5"
                                      aria-hidden="true"
                                    />
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
                  <div className="bg-[#FCFBF8] border border-[#173D32]/12 rounded-2xl p-4 sm:p-5 shadow-[0_2px_10px_-3px_rgba(23,61,50,0.06)]">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {filteredAndSortedVillages.map((village) => {
                        const isSelected = selectedVillage?.id === village.id;
                        const vAlerts = getVillageAlerts(village);
                        const vReports = getVillageReports(village);

                        return (
                          <button
                            type="button"
                            key={village.id}
                            onClick={() => setSelectedVillageId(village.id)}
                            className={`text-left p-4 rounded-2xl border bg-white transition-all cursor-pointer flex flex-col justify-between ${
                              isSelected
                                ? "border-[#173D32] shadow-[0_6px_20px_-6px_rgba(23,61,50,0.16)] ring-1 ring-[#173D32]/25"
                                : "border-[#173D32]/10 shadow-[0_2px_10px_-3px_rgba(23,61,50,0.05)] hover:border-[#173D32]/25"
                            }`}
                          >
                            <div className="flex items-stretch gap-3 w-full">
                              <div
                                className={`w-1 rounded-full shrink-0 ${getRiskBarClass(
                                  village.currentRiskLevel
                                )}`}
                              />

                              <div className="flex-1 min-w-0">
                                {/* Card Header */}
                                <div className="flex items-start justify-between gap-2 mb-2.5">
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <SettlementIcon
                                      villageId={village.id}
                                      villageName={village.name}
                                    />
                                    <div className="min-w-0">
                                      <h4 className="text-sm font-bold text-[#173D32] truncate">
                                        {village.name}
                                      </h4>
                                      <span className="text-[11px] text-[#173D32]/65 font-medium block truncate">
                                        {village.district} &bull; {village.corridor}
                                      </span>
                                    </div>
                                  </div>

                                  <VillageRiskBadge
                                    level={village.currentRiskLevel}
                                  />
                                </div>

                                {/* Badges for active alerts/reports */}
                                {(vAlerts.length > 0 || vReports.length > 0) && (
                                  <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                                    {vAlerts.length > 0 && (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EA5B5B] text-white">
                                        {vAlerts.length} Active{" "}
                                        {vAlerts.length === 1 ? "Alert" : "Alerts"}
                                      </span>
                                    )}
                                    {vReports.length > 0 && (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-600 text-white">
                                        {vReports.length}{" "}
                                        {vReports.length === 1
                                          ? "Report"
                                          : "Reports"}
                                      </span>
                                    )}
                                  </div>
                                )}

                                {/* Metric Bar */}
                                <div className="py-2.5 border-y border-[#173D32]/10 grid grid-cols-2 gap-2 text-xs mb-3">
                                  <div>
                                    <span className="text-[#173D32]/55 inline-flex items-center gap-1 text-[11px]">
                                      <Users className="w-3.5 h-3.5 text-[#173D32]/50" />
                                      <span>Population</span>
                                    </span>
                                    <span className="font-extrabold text-[#173D32] block mt-0.5 tabular-nums">
                                      {village.populationEstimate.toLocaleString()}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-[#173D32]/55 inline-flex items-center gap-1 text-[11px]">
                                      <CloudRain className="w-3.5 h-3.5 text-[#1D4ED8]" />
                                      <span>24h Rainfall</span>
                                    </span>
                                    <span className="font-extrabold text-[#173D32] block mt-0.5">
                                      {village.lastRainfall || "N/A"}
                                    </span>
                                  </div>
                                </div>

                                {/* Shelter Information */}
                                <div className="p-2.5 rounded-xl bg-[#FAF8F2] border border-[#173D32]/10 text-xs mb-2">
                                  <span className="text-[10px] font-bold text-[#173D32]/55 uppercase block tracking-wider">
                                    Nearest Safe Shelter
                                  </span>
                                  {village.safeShelter ? (
                                    <div className="mt-1">
                                      <span className="font-bold text-[#173D32] inline-flex items-center gap-1 max-w-full">
                                        <Building2 className="w-3.5 h-3.5 text-[#173D32]/60 shrink-0" />
                                        <span className="truncate">
                                          {village.safeShelter.name}
                                        </span>
                                      </span>
                                      <span className="text-[10px] text-[#173D32]/65 block mt-0.5">
                                        {village.safeShelter.distanceKm} km &bull;
                                        Capacity: {village.safeShelter.capacity}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-[11px] text-[#173D32]/45 italic block mt-0.5">
                                      No designated safe shelter recorded
                                    </span>
                                  )}
                                </div>

                                {/* Evacuation Route */}
                                <div className="p-2.5 rounded-xl bg-[#FAF8F2] border border-[#173D32]/10 text-xs">
                                  <span className="text-[10px] font-bold text-[#173D32]/55 uppercase block tracking-wider">
                                    Evacuation Corridor
                                  </span>
                                  {village.evacuationRoute ? (
                                    <div className="mt-1 flex items-center justify-between gap-1.5">
                                      <span className="font-bold text-[#173D32] truncate inline-flex items-center gap-1">
                                        <Route className="w-3.5 h-3.5 text-[#173D32]/60 shrink-0" />
                                        <span className="truncate">
                                          {village.evacuationRoute.name}
                                        </span>
                                      </span>
                                      <span
                                        className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase shrink-0 ${getEvacStatusBadgeClass(
                                          village.evacuationRoute.status
                                        )}`}
                                      >
                                        {village.evacuationRoute.status}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-[11px] text-[#173D32]/45 italic block mt-0.5">
                                      Evacuation route unmapped
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Card Footer */}
                            <div className="mt-3 pt-2.5 border-t border-[#173D32]/10 flex items-center justify-between text-xs w-full">
                              <span className="text-[10px] text-[#173D32]/55 font-mono">
                                {village.id} &bull; {village.state}
                              </span>
                              <span
                                className={`font-bold inline-flex items-center gap-1 ${
                                  isSelected
                                    ? "text-[#173D32]"
                                    : "text-[#173D32]/75"
                                }`}
                              >
                                {isSelected ? (
                                  <>
                                    <CheckCircle2 className="w-3.5 h-3.5 text-[#1E7A45]" />
                                    <span>Inspecting</span>
                                  </>
                                ) : (
                                  <>
                                    <span>Review Dossier</span>
                                    <ArrowRight className="w-3.5 h-3.5" />
                                  </>
                                )}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
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

        {/* ── 4. Horizontal Recent Risk History Strip ────────────────────── */}
        {!isLoading && <VillageRiskHistoryBar village={selectedVillage} />}
      </div>
    </PortalLayout>
  );
}
