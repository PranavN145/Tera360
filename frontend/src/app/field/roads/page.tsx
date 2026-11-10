"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Ban,
  CheckCircle2,
  MapPin,
  Road,
  Search,
  X,
} from "lucide-react";
import PortalLayout from "@/components/portal/PortalLayout";
import PortalMetricGrid from "@/components/portal/PortalMetricGrid";
import { PortalKpiCard } from "@/components/portal";
import StatusBadge from "@/components/ui/StatusBadge";
import { publicApi, fieldOfficerApi } from "@/lib/api";
import { PublicRoadStatusItem } from "@/types/public";
import type { RoadCondition } from "@/types/fieldOfficer";

const STATES = [
  "All States",
  "Assam",
  "Nagaland",
  "Sikkim",
  "Meghalaya",
  "Arunachal Pradesh",
  "Manipur",
  "Mizoram",
  "Tripura",
];

const STATUS_FILTERS = ["All", "blocked", "caution", "open"];

function FieldRoadsContent() {
  const searchParams = useSearchParams();
  const initialCorridor = searchParams.get("corridor") || "";

  const [selectedState, setSelectedState] = useState("All States");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [searchQuery, setSearchQuery] = useState(initialCorridor);
  const [roads, setRoads] = useState<PublicRoadStatusItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedRoadForUpdate, setSelectedRoadForUpdate] = useState<PublicRoadStatusItem | null>(null);
  const [newCondition, setNewCondition] = useState<RoadCondition>("Caution");
  const [updateReason, setUpdateReason] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const handleUpdateRoadStatus = async () => {
    if (!selectedRoadForUpdate) return;
    setIsUpdating(true);
    setStatusNotice(null);
    try {
      await fieldOfficerApi.updateRoadStatus({
        roadSegmentId: selectedRoadForUpdate.code,
        stretchName: selectedRoadForUpdate.stretch,
        condition: newCondition,
        reason: updateReason || `Official status updated to ${newCondition}.`,
      });
      setStatusNotice(`Corridor ${selectedRoadForUpdate.code} successfully updated to ${newCondition}.`);
      setSelectedRoadForUpdate(null);
      setUpdateReason("");
      setRefreshTrigger((prev) => prev + 1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update road status.";
      setStatusNotice(`Update error: ${msg}`);
    } finally {
      setIsUpdating(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    async function loadRoads() {
      try {
        const data = await publicApi.getRoadStatus({
          state: selectedState === "All States" ? undefined : selectedState,
          status: selectedStatus === "All" ? undefined : selectedStatus,
        });
        if (mounted) {
          setRoads(data);
          setError(null);
        }
      } catch (err: unknown) {
        if (mounted) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load highway road data"
          );
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }
    void loadRoads();
    return () => {
      mounted = false;
    };
  }, [selectedState, selectedStatus, refreshTrigger]);

  const handleRetry = () => {
    setIsLoading(true);
    setRefreshTrigger((prev) => prev + 1);
  };

  const filteredRoads = roads.filter((r) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      r.code.toLowerCase().includes(q) ||
      r.name.toLowerCase().includes(q) ||
      r.stretch.toLowerCase().includes(q) ||
      r.state.toLowerCase().includes(q)
    );
  });

  const totalCount = roads.length;
  const blockedCount = roads.filter((r) => r.status === "blocked").length;
  const cautionCount = roads.filter(
    (r) => r.status === "caution" || r.status === "partial"
  ).length;
  const openCount = roads.filter((r) => r.status === "open").length;

  return (
    <PortalLayout
      allowedRoles={["field_officer"]}
      title="Road Status & Highway Corridors"
      subtitle="Real-time clearance tracking, landslide blockages, and regulated pilot convoys for field operations."
      headerActions={
        <div className="flex items-center gap-2">
          <Link
            href="/field/map"
            className="px-3.5 py-1.5 rounded-full bg-[#173D32]/10 hover:bg-[#173D32]/15 text-[#173D32] text-xs font-bold transition-all inline-flex items-center gap-1.5"
          >
            <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Area Map</span>
          </Link>
          <Link
            href="/field/tasks"
            className="px-3.5 py-1.5 rounded-full bg-[#173D32] text-[#F6F4EC] text-xs font-bold hover:bg-[#1a4437] transition-all inline-flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            <span>My Tasks</span>
          </Link>
        </div>
      }
    >
      <div className="space-y-6 sm:space-y-8 w-full">
        {/* ── 1. Top Metric Cards (4 columns) ───────────────────────────── */}
        <PortalMetricGrid columns={4} ariaLabel="Field Road Clearance Metrics">
          <PortalKpiCard
            id="field-metric-total-corridors"
            variant="summary"
            title="Monitored Corridors"
            value={totalCount}
            unit={totalCount === 1 ? "Highway Stretch" : "Highway Stretches"}
            icon={Road}
            accent="green"
            badge="Arterial Grid"
            badgeTone="green"
            detail="Strategic mountain transport links under field patrol"
            isLoading={isLoading}
          />

          <PortalKpiCard
            id="field-metric-blocked-corridors"
            variant="summary"
            title="Blocked Corridors"
            value={blockedCount}
            unit={blockedCount === 1 ? "Pass Severed" : "Passes Severed"}
            icon={Ban}
            accent={blockedCount > 0 ? "red" : "green"}
            badge={blockedCount > 0 ? "Blocked" : "Clear"}
            badgeTone={blockedCount > 0 ? "red" : "green"}
            detail="Debris slides requiring heavy earthmover clearance"
            isLoading={isLoading}
          />

          <PortalKpiCard
            id="field-metric-caution-corridors"
            variant="summary"
            title="Under Caution"
            value={cautionCount}
            unit="Restricted Lane"
            icon={AlertTriangle}
            accent={cautionCount > 0 ? "amber" : "green"}
            badge={cautionCount > 0 ? "Caution Stage" : "Nominal"}
            badgeTone={cautionCount > 0 ? "amber" : "green"}
            detail="Single-lane pilot convoy or wet shoulder restriction"
            isLoading={isLoading}
          />

          <PortalKpiCard
            id="field-metric-open-corridors"
            variant="summary"
            title="Open to Transit"
            value={openCount}
            unit="Normal Traffic"
            icon={CheckCircle2}
            accent="green"
            badge="Open"
            badgeTone="green"
            detail="Clear passage with nominal geotechnical stability"
            isLoading={isLoading}
          />
        </PortalMetricGrid>

        {/* ── 2. Corridor Clearance List & Filters ──────────────────────── */}
        <section
          aria-label="Monitored Corridors"
          className="bg-[#FAF8F2] border border-[#173D32]/12 rounded-3xl px-5 sm:px-7 py-4 sm:py-5 shadow-xs"
        >
          {/* Filter and Search Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 pb-4 border-b border-[#173D32]/12">
            <div
              role="group"
              aria-label="Filter corridors by status"
              className="flex items-center gap-1.5 flex-wrap"
            >
              {STATUS_FILTERS.map((status) => {
                const isActive = selectedStatus === status;
                return (
                  <button
                    key={status}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => setSelectedStatus(status)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all capitalize cursor-pointer whitespace-nowrap ${
                      isActive
                        ? "bg-[#173D32] text-[#F6F4EC] shadow-2xs"
                        : "text-[#173D32]/75 hover:text-[#173D32] hover:bg-[#173D32]/5"
                    }`}
                  >
                    {status === "All" ? "All Corridors" : status}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full lg:w-auto lg:pl-4 lg:border-l lg:border-[#173D32]/12">
              <select
                id="field-roads-state-select"
                name="field-roads-state-select"
                aria-label="Filter corridors by state"
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className="h-9 px-3.5 rounded-full bg-white/90 border border-[#173D32]/15 text-xs font-bold text-[#173D32] focus:outline-none focus:ring-1 focus:ring-[#173D32]/30 cursor-pointer"
              >
                {STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>

              <div className="relative w-full sm:w-56">
                <Search
                  className="w-3.5 h-3.5 text-[#173D32]/50 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  strokeWidth={2}
                  aria-hidden="true"
                />
                <input
                  id="field-roads-search"
                  name="field-roads-search"
                  type="text"
                  aria-label="Search corridors"
                  placeholder="Search code, name, stretch..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 pl-9 pr-8 rounded-full bg-white/90 border border-[#173D32]/15 text-xs text-[#173D32] placeholder:text-[#173D32]/45 focus:outline-none focus:ring-1 focus:ring-[#173D32]/30 w-full"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    aria-label="Clear search"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-[#173D32]/50 hover:text-[#173D32] cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mt-4 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-900 flex flex-wrap items-center justify-between gap-3 text-xs font-semibold">
              <span className="inline-flex items-center gap-2">
                <AlertTriangle
                  className="w-4 h-4 text-red-600 shrink-0"
                  aria-hidden="true"
                />
                <span>{error}</span>
              </span>
              <button
                type="button"
                onClick={handleRetry}
                className="px-3.5 py-1 rounded-full bg-red-700 hover:bg-red-800 text-white font-bold cursor-pointer shrink-0 transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {/* Loading Skeletons */}
          {isLoading && (
            <div className="divide-y divide-[#173D32]/10">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="py-5 flex items-center justify-between gap-4 animate-pulse"
                >
                  <div className="flex items-stretch gap-4 flex-1">
                    <div className="w-1 rounded-full bg-[#173D32]/15" />
                    <div className="space-y-2 flex-1">
                      <div className="h-5 w-64 rounded bg-[#173D32]/10" />
                      <div className="h-3.5 w-48 rounded bg-[#173D32]/8" />
                      <div className="h-3.5 w-80 rounded bg-[#173D32]/6" />
                    </div>
                  </div>
                  <div className="h-7 w-28 rounded-full bg-[#173D32]/10 shrink-0" />
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && filteredRoads.length === 0 && (
            <div className="text-center py-14 px-4">
              <span className="w-10 h-10 rounded-xl bg-[#E5EFE2] text-[#173D32] inline-flex items-center justify-center mb-3">
                <Road className="w-5 h-5" aria-hidden="true" />
              </span>
              <h4 className="text-base font-extrabold text-[#173D32]">
                No Corridors Match Filters
              </h4>
              <p className="text-xs text-[#173D32]/65 mt-1">
                Try adjusting your state filter, clearance status, or search query.
              </p>
            </div>
          )}

          {/* Compact Horizontal Corridor Rows */}
          {!isLoading && !error && filteredRoads.length > 0 && (
            <div className="divide-y divide-[#173D32]/10">
              {filteredRoads.map((road) => {
                const statusLower = (road.status || "").toLowerCase();
                const accentBarClass =
                  statusLower === "blocked"
                    ? "bg-[#DC2626]"
                    : statusLower === "caution" || statusLower === "partial"
                    ? "bg-[#F59E0B]"
                    : "bg-[#16A34A]";

                return (
                  <div
                    key={road.id || road.name}
                    className="py-5 first:pt-5 last:pb-2 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="flex items-stretch gap-3.5 sm:gap-4 flex-1 min-w-0">
                      <span
                        aria-hidden="true"
                        className={`w-1 rounded-full shrink-0 ${accentBarClass}`}
                      />

                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="px-2.5 py-0.5 rounded-full bg-[#173D32] text-[#F6F4EC] text-xs font-extrabold tracking-wide shrink-0">
                            {road.code}
                          </span>
                          <h3 className="font-extrabold text-[15px] sm:text-base text-[#173D32] leading-snug">
                            {road.name}
                          </h3>
                          <span className="text-xs font-semibold text-[#173D32]/60 whitespace-nowrap">
                            · {road.state}
                          </span>
                        </div>

                        <p className="flex items-center gap-1.5 text-xs text-[#173D32]/75 font-medium">
                          <MapPin
                            className="w-3.5 h-3.5 text-[#173D32]/55 shrink-0"
                            strokeWidth={2}
                            aria-hidden="true"
                          />
                          <span>
                            Stretch:{" "}
                            <span className="font-bold text-[#173D32]">
                              {road.stretch}
                            </span>
                          </span>
                        </p>

                        {road.statusReason && (
                          <p className="text-xs text-[#173D32]/70 italic leading-relaxed">
                            &ldquo;{road.statusReason}&rdquo;
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between md:justify-end gap-3 sm:gap-7 md:shrink-0 pl-4 md:pl-0">
                      <div className="flex flex-col items-start md:items-center text-left md:text-center">
                        <StatusBadge
                          status={road.status}
                          size="sm"
                          pulse={road.status === "blocked"}
                        />
                        <span className="text-[11px] font-semibold text-[#173D32]/60 mt-1.5 whitespace-nowrap">
                          Risk: {road.riskLevel} ·{" "}
                          {new Date(road.lastUpdated).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedRoadForUpdate(road);
                            setNewCondition(
                              road.status === "blocked"
                                ? "Blocked"
                                : road.status === "caution" || road.status === "partial"
                                ? "Caution"
                                : "Open"
                            );
                            setUpdateReason(road.statusReason || "");
                          }}
                          className="px-3 py-1 rounded-full bg-[#173D32] hover:bg-[#1f4e40] text-[#F6F4EC] text-xs font-bold transition-colors cursor-pointer"
                        >
                          Update Status
                        </button>

                        <Link
                          href="/field/map"
                          className="text-xs sm:text-[13px] font-bold text-[#173D32] hover:text-[#112F26] hover:underline transition-colors inline-flex items-center gap-1.5 whitespace-nowrap"
                        >
                          <span>Locate</span>
                          <ArrowRight
                            className="w-3.5 h-3.5"
                            strokeWidth={2.2}
                            aria-hidden="true"
                          />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Update Road Status Modal */}
        {selectedRoadForUpdate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-[#FAF8F2] border border-[#173D32]/20 rounded-2xl p-6 max-w-lg w-full shadow-2xl">
              <h3 className="text-base font-bold text-[#173D32] mb-1">
                Update Road Status: {selectedRoadForUpdate.code}
              </h3>
              <p className="text-xs text-[#173D32]/70 mb-4">
                {selectedRoadForUpdate.stretch} ({selectedRoadForUpdate.state})
              </p>

              <label className="block text-xs font-bold text-[#173D32] uppercase mb-1">
                New Clearance Condition:
              </label>
              <select
                value={newCondition}
                onChange={(e) => setNewCondition(e.target.value as RoadCondition)}
                className="w-full p-2.5 rounded-xl bg-white border border-[#173D32]/20 text-xs font-semibold text-[#173D32] mb-3"
              >
                <option value="Open">Open (Unrestricted highway transit)</option>
                <option value="Caution">Caution (Single lane / active rockfall caution)</option>
                <option value="Partially Blocked">Partially Blocked (Controlled convoy only)</option>
                <option value="Blocked">Blocked (Complete transit halt / diversion active)</option>
              </select>

              <label className="block text-xs font-bold text-[#173D32] uppercase mb-1">
                Reason & Advisory Details:
              </label>
              <textarea
                rows={4}
                value={updateReason}
                onChange={(e) => setUpdateReason(e.target.value)}
                placeholder="e.g. Mudslide debris cleared by BRO convoy; transit restored with caution."
                className="w-full p-3 rounded-xl bg-white border border-[#173D32]/20 text-xs text-[#173D32] focus:outline-none focus:ring-1 focus:ring-[#173D32] mb-4"
              />

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedRoadForUpdate(null)}
                  className="px-4 py-2 rounded-full text-xs font-semibold text-[#173D32] hover:bg-black/5"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleUpdateRoadStatus}
                  disabled={isUpdating}
                  className="px-5 py-2 rounded-full bg-[#173D32] hover:bg-[#1f4e40] text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isUpdating ? "Synchronizing..." : "Confirm Road Update"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PortalLayout>
  );
}

export default function FieldRoadsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F6F4EC]" />}>
      <FieldRoadsContent />
    </Suspense>
  );
}
