"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import PortalLayout from "@/components/portal/PortalLayout";
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
      {/* Top Metric Cards */}
      <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#FAF8F2] border border-[#173D32]/12 rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-red-700 tracking-wider block">
              Blocked Corridors
            </span>
            <span className="text-2xl font-black text-red-700 mt-0.5 block">
              {isLoading ? "..." : blockedCount}
            </span>
          </div>
          <span className="text-2xl">🚫</span>
        </div>

        <div className="bg-[#FAF8F2] border border-[#173D32]/12 rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-amber-700 tracking-wider block">
              Under Caution / Restricted
            </span>
            <span className="text-2xl font-black text-amber-700 mt-0.5 block">
              {isLoading ? "..." : cautionCount}
            </span>
          </div>
          <span className="text-2xl">⚠️</span>
        </div>

        <div className="bg-[#FAF8F2] border border-[#173D32]/12 rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider block">
              Open / Normal Transit
            </span>
            <span className="text-2xl font-black text-emerald-800 mt-0.5 block">
              {isLoading ? "..." : openCount}
            </span>
          </div>
          <span className="text-2xl">✅</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="mb-6 bg-[#FAF8F2] border border-[#173D32]/12 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 w-full md:w-auto">
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

        {/* State Dropdown & Search Input */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
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
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-900 flex items-center justify-between text-xs font-semibold">
          <span>⚠️ {error}</span>
          <button
            type="button"
            onClick={handleRetry}
            className="px-3 py-1 rounded-full bg-red-700 text-white font-bold"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeletons */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-24 bg-[#FAF8F2] border border-[#173D32]/10 rounded-2xl animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && filteredRoads.length === 0 && (
        <div className="text-center py-16 bg-[#FAF8F2] border border-[#173D32]/10 rounded-3xl p-6">
          <span className="text-3xl block mb-2">🌿</span>
          <h4 className="text-base font-extrabold text-[#173D32]">No Corridors Match Filters</h4>
          <p className="text-xs text-[#173D32]/70 mt-1">
            Try adjusting your state tab, clearance status, or search query.
          </p>
        </div>
      )}

      {/* Corridor Cards List */}
      {!isLoading && !error && filteredRoads.length > 0 && (
        <div className="space-y-3.5">
          {filteredRoads.map((road) => (
            <div
              key={road.id}
              className="p-5 rounded-2xl bg-[#FAF8F2] border border-[#173D32]/12 hover:border-[#173D32]/25 shadow-xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2.5">
                  <span className="px-2.5 py-0.5 rounded-lg bg-[#173D32] text-[#F6F4EC] text-xs font-black tracking-wider">
                    {road.code}
                  </span>
                  <h3 className="font-extrabold text-sm sm:text-base text-[#173D32]">
                    {road.name}
                  </h3>
                  <span className="text-xs font-bold text-[#173D32]/60">· {road.state}</span>
                </div>

                <p className="text-xs text-[#173D32]/80 font-medium">
                  📍 Stretch: <span className="font-bold text-[#173D32]">{road.stretch}</span>
                </p>

                {road.statusReason && (
                  <p className="text-xs text-[#173D32]/75 italic mt-1">
                    &ldquo;{road.statusReason}&rdquo;
                  </p>
                )}
              </div>

              {/* Status and Action Badge */}
              <div className="flex items-center gap-3 shrink-0 self-start md:self-center">
                <div className="text-right">
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider ${
                      road.status === "blocked"
                        ? "bg-red-100 text-red-800 border border-red-200"
                        : road.status === "caution" || road.status === "partial"
                        ? "bg-amber-100 text-amber-800 border border-amber-200"
                        : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                    }`}
                  >
                    {road.status}
                  </span>
                  <span className="block text-[11px] font-bold text-[#173D32]/60 mt-0.5">
                    Risk: {road.riskLevel}
                  </span>
                </div>

                <Link
                  href={`/officer/map`}
                  className="px-3.5 py-1.5 rounded-xl bg-[#173D32]/10 hover:bg-[#173D32]/15 text-[#173D32] text-xs font-bold transition-colors"
                >
                  Locate on Map →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </PortalLayout>
  );
}

