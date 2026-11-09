"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import PortalLayout from "@/components/portal/PortalLayout";
import PortalMetricGrid from "@/components/portal/PortalMetricGrid";
import PortalMetricCard from "@/components/portal/PortalMetricCard";
import PortalFilterBar from "@/components/portal/PortalFilterBar";
import StatusBadge from "@/components/ui/StatusBadge";
import { publicApi } from "@/lib/api";
import { PublicRoadStatusItem } from "@/types/public";

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

export default function OfficerRoadsPage() {
  const [selectedState, setSelectedState] = useState("All States");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const [roads, setRoads] = useState<PublicRoadStatusItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

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
          const msg = err instanceof Error ? err.message : "Failed to load road statuses";
          setError(msg);
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
  const cautionCount = roads.filter((r) => r.status === "caution" || r.status === "partial").length;
  const openCount = roads.filter((r) => r.status === "open").length;

  return (
    <PortalLayout
      allowedRoles={["officer", "admin"]}
      title="Road Impact & Highway Clearance Center"
      subtitle="Supervise active highway blockages, diversion corridors, and slope clearing operations across the Northeast arterial grid."
      headerActions={
        <div className="flex items-center gap-2">
          <Link
            href="/officer/alerts"
            className="px-3.5 py-1.5 rounded-full bg-[#D6A65D] hover:bg-[#c9984e] text-[#173D32] text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span>📢</span>
            <span>Broadcast Alert</span>
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
        {/* ── 1. Top Metric Cards (4 columns) ── */}
        <PortalMetricGrid columns={4} ariaLabel="Highway Clearance Metrics">
          <PortalMetricCard
            id="metric-total-corridors"
            title="Monitored Corridors"
            value={totalCount}
            unit="Highway Stretches"
            icon="🛣️"
            badge="Arterial Grid"
            badgeColor="bg-[#173D32]/10 text-[#173D32] border-[#173D32]/20"
            detail="Strategic mountain transport links under BRO & NHIDCL"
            isLoading={isLoading}
          />

          <PortalMetricCard
            id="metric-blocked-corridors"
            title="Blocked Corridors"
            value={blockedCount}
            unit="Passes Severed"
            icon="🚫"
            badge={blockedCount > 0 ? "Blocked" : "Clear"}
            badgeVariant={blockedCount > 0 ? "blocked" : "open"}
            detail="Debris slides requiring heavy earthmover clearance"
            pulse={blockedCount > 0}
            isLoading={isLoading}
          />

          <PortalMetricCard
            id="metric-caution-corridors"
            title="Under Caution"
            value={cautionCount}
            unit="Restricted Lane"
            icon="⚠️"
            badge="Caution Stage"
            badgeVariant="caution"
            detail="Single-lane pilot convoy or wet shoulder restriction"
            isLoading={isLoading}
          />

          <PortalMetricCard
            id="metric-open-corridors"
            title="Open to Transit"
            value={openCount}
            unit="Normal Traffic"
            icon="✅"
            badge="Open"
            badgeVariant="open"
            detail="Clear passage with nominal geotechnical stability"
            isLoading={isLoading}
          />
        </PortalMetricGrid>

        {/* ── 2. Filter and Search Bar ── */}
        <PortalFilterBar
          left={
            <div className="flex items-center gap-1.5 flex-wrap">
              {STATUS_FILTERS.map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setSelectedStatus(status)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all capitalize cursor-pointer ${
                    selectedStatus === status
                      ? "bg-[#173D32] text-[#F6F4EC] shadow-xs"
                      : "text-[#173D32]/75 hover:bg-[#173D32]/5"
                  }`}
                >
                  {status === "All" ? "All Corridors" : status}
                </button>
              ))}
            </div>
          }
          right={
            <div className="flex items-center gap-2.5 w-full md:w-auto">
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className="h-9 px-3 rounded-xl bg-[#F6F4EC] border border-[#173D32]/20 text-xs font-bold text-[#173D32] focus:outline-none cursor-pointer"
              >
                {STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>

              <input
                type="text"
                placeholder="Search code, name, stretch..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 px-3.5 rounded-xl bg-[#F6F4EC] border border-[#173D32]/20 text-xs text-[#173D32] placeholder:text-[#173D32]/50 focus:outline-none focus:ring-1 focus:ring-[#173D32] w-full sm:w-56"
              />
            </div>
          }
        />

        {/* Error Banner */}
        {error && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-900 flex items-center justify-between text-xs font-semibold">
            <span>⚠️ {error}</span>
            <button
              type="button"
              onClick={handleRetry}
              className="px-3 py-1 rounded-full bg-red-700 text-white font-bold cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading Skeletons */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-24 bg-[#FAF8F2] border border-[#173D32]/10 rounded-2xl animate-pulse"
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && filteredRoads.length === 0 && (
          <div className="text-center py-16 bg-[#FAF8F2] border border-[#173D32]/12 rounded-3xl p-6">
            <span className="text-3xl block mb-2">🌿</span>
            <h4 className="text-base font-extrabold text-[#173D32]">No Corridors Match Filters</h4>
            <p className="text-xs text-[#173D32]/70 mt-1">
              Try adjusting your state tab, clearance status, or search query.
            </p>
          </div>
        )}

        {/* ── 3. Corridor Cards List (Full available width, stacked vertically) ── */}
        {!isLoading && !error && filteredRoads.length > 0 && (
          <div className="space-y-3.5">
            {filteredRoads.map((road) => (
              <div
                key={road.id}
                className="p-5 sm:p-6 rounded-2xl bg-[#FAF8F2] border border-[#173D32]/12 hover:border-[#173D32]/25 shadow-xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-lg bg-[#173D32] text-[#F6F4EC] text-xs font-black tracking-wider">
                      {road.code}
                    </span>
                    <h3 className="font-extrabold text-base text-[#173D32] truncate">
                      {road.name}
                    </h3>
                    <span className="text-xs font-bold text-[#173D32]/60">· {road.state}</span>
                  </div>

                  <p className="text-xs text-[#173D32]/80 font-medium">
                    📍 Stretch: <span className="font-bold text-[#173D32]">{road.stretch}</span>
                  </p>

                  {road.statusReason && (
                    <p className="text-xs text-[#173D32]/75 italic mt-1 bg-[#173D32]/5 p-2.5 rounded-xl border border-[#173D32]/8">
                      &ldquo;{road.statusReason}&rdquo;
                    </p>
                  )}
                </div>

                {/* Status and Action Badge */}
                <div className="flex items-center gap-3 shrink-0 self-start md:self-center">
                  <div className="text-right">
                    <StatusBadge status={road.status} size="sm" pulse={road.status === "blocked"} />
                    <span className="block text-[11px] font-bold text-[#173D32]/60 mt-1">
                      Risk: {road.riskLevel}
                    </span>
                  </div>

                  <Link
                    href="/officer/map"
                    className="px-3.5 py-2 rounded-xl bg-[#173D32]/10 hover:bg-[#173D32]/15 text-[#173D32] text-xs font-bold transition-colors inline-flex items-center gap-1.5"
                  >
                    <span>Locate on Map</span>
                    <span>→</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
