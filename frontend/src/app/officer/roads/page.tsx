"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Ban,
  CheckCircle2,
  MapPin,
  Megaphone,
  Road,
  Search,
} from "lucide-react";
import PortalLayout from "@/components/portal/PortalLayout";
import PortalMetricGrid from "@/components/portal/PortalMetricGrid";
import OfficerKpiCard from "@/components/officer/OfficerKpiCard";
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
            className="px-3.5 py-1.5 rounded-full bg-[#D6A65D] hover:bg-[#c9984e] text-[#173D32] text-xs font-bold shadow-xs transition-all inline-flex items-center gap-1.5 cursor-pointer"
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
      <div className="space-y-6 sm:space-y-8 w-full">
        {/* ── 1. Top Metric Cards (4 columns) ── */}
        <PortalMetricGrid columns={4} ariaLabel="Highway Clearance Metrics">
          <OfficerKpiCard
            id="metric-total-corridors"
            variant="summary"
            title="Monitored Corridors"
            value={totalCount}
            unit={totalCount === 1 ? "Highway Stretch" : "Highway Stretches"}
            icon={Road}
            accent="green"
            badge="Arterial Grid"
            badgeTone="green"
            detail="Strategic mountain transport links under BRO & NHIDCL"
            isLoading={isLoading}
          />

          <OfficerKpiCard
            id="metric-blocked-corridors"
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

          <OfficerKpiCard
            id="metric-caution-corridors"
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

          <OfficerKpiCard
            id="metric-open-corridors"
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

        {/* ── 2. Corridor Clearance List & Filters ── */}
        <section
          aria-label="Corridor Impact List"
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
                  type="text"
                  aria-label="Search corridors"
                  placeholder="Search code, name, stretch..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 pl-9 pr-3.5 rounded-full bg-white/90 border border-[#173D32]/15 text-xs text-[#173D32] placeholder:text-[#173D32]/45 focus:outline-none focus:ring-1 focus:ring-[#173D32]/30 w-full"
                />
              </div>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mt-4 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-900 flex flex-wrap items-center justify-between gap-3 text-xs font-semibold">
              <span className="inline-flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" aria-hidden="true" />
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
                <div key={n} className="py-5 flex items-center justify-between gap-4 animate-pulse">
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
                    key={road.id}
                    className="py-5 first:pt-5 last:pb-2 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="flex items-stretch gap-3.5 sm:gap-4 flex-1 min-w-0">
                      {/* Left Vertical Status Indicator */}
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

                    {/* Right Status Badge, Risk Level & Locate Action */}
                    <div className="flex flex-wrap items-center justify-between md:justify-end gap-3 sm:gap-7 md:shrink-0 pl-4 md:pl-0">
                      <div className="flex flex-col items-start md:items-center text-left md:text-center">
                        <StatusBadge
                          status={road.status}
                          size="sm"
                          pulse={road.status === "blocked"}
                        />
                        <span className="text-[11px] font-semibold text-[#173D32]/60 mt-1.5 whitespace-nowrap">
                          Risk: {road.riskLevel}
                        </span>
                      </div>

                      <Link
                        href="/officer/map"
                        className="text-xs sm:text-[13px] font-bold text-[#173D32] hover:text-[#112F26] hover:underline transition-colors inline-flex items-center gap-1.5 whitespace-nowrap"
                      >
                        <span>Locate on Map</span>
                        <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.2} aria-hidden="true" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </PortalLayout>
  );
}
