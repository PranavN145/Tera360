"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import PortalLayout from "@/components/portal/PortalLayout";
import { useApp } from "@/context/AppContext";
import { publicApi } from "@/lib/api";
import { PublicAlertItem, alertItemToAlertDetail } from "@/types/public";

const SEVERITIES = ["All", "Critical", "Warning", "Watch"];
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

export default function OfficerAlertsPage() {
  const { openAlertModal } = useApp();
  const [selectedSeverity, setSelectedSeverity] = useState("All");
  const [selectedState, setSelectedState] = useState("All States");
  const [search, setSearch] = useState("");

  const [alerts, setAlerts] = useState<PublicAlertItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    let mounted = true;
    async function loadAlerts() {
      try {
        const res = await publicApi.getAlerts({
          state: selectedState === "All States" ? undefined : selectedState,
          severity: selectedSeverity === "All" ? undefined : selectedSeverity,
          limit: 50,
        });
        if (mounted) {
          setAlerts(res.alerts);
          setError(null);
        }
      } catch (err: unknown) {
        if (mounted) {
          const msg = err instanceof Error ? err.message : "Failed to load alerts feed";
          setError(msg);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    void loadAlerts();
    return () => {
      mounted = false;
    };
  }, [selectedSeverity, selectedState, refreshTrigger]);

  const handleRetry = () => {
    setIsLoading(true);
    setRefreshTrigger((prev) => prev + 1);
  };

  const filtered = alerts.filter((a) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      a.title.toLowerCase().includes(q) ||
      a.corridor.toLowerCase().includes(q) ||
      a.state.toLowerCase().includes(q) ||
      (a.location && a.location.toLowerCase().includes(q))
    );
  });

  const criticalCount = alerts.filter((a) => a.severity === "Critical").length;
  const warningCount = alerts.filter((a) => a.severity === "Warning").length;
  const watchCount = alerts.filter((a) => a.severity === "Watch").length;

  return (
    <PortalLayout
      allowedRoles={["officer", "admin"]}
      title="Disaster Alert Center & Broadcast Operations"
      subtitle="Supervise active regional landslide warnings, geotechnical saturation thresholds, and multi-channel advisories."
      headerActions={
        <div className="flex items-center gap-2">
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
              Critical Alerts (Evacuation / Red)
            </span>
            <span className="text-2xl font-black text-red-700 mt-0.5 block">
              {isLoading ? "..." : criticalCount}
            </span>
          </div>
          <span className="text-2xl">🔴</span>
        </div>

        <div className="bg-[#FAF8F2] border border-[#173D32]/12 rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-amber-700 tracking-wider block">
              Warning Advisories (Amber)
            </span>
            <span className="text-2xl font-black text-amber-700 mt-0.5 block">
              {isLoading ? "..." : warningCount}
            </span>
          </div>
          <span className="text-2xl">🟡</span>
        </div>

        <div className="bg-[#FAF8F2] border border-[#173D32]/12 rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-yellow-800 tracking-wider block">
              Watch State (Yellow)
            </span>
            <span className="text-2xl font-black text-yellow-800 mt-0.5 block">
              {isLoading ? "..." : watchCount}
            </span>
          </div>
          <span className="text-2xl">⚠️</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="mb-6 bg-[#FAF8F2] border border-[#173D32]/12 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Severity Tabs */}
        <div className="flex items-center gap-1.5 w-full md:w-auto">
          {SEVERITIES.map((sev) => (
            <button
              key={sev}
              type="button"
              onClick={() => setSelectedSeverity(sev)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedSeverity === sev
                  ? "bg-[#173D32] text-[#F6F4EC] shadow-xs"
                  : "text-[#173D32]/75 hover:bg-[#173D32]/5"
              }`}
            >
              {sev === "All" ? "All Severities" : sev}
            </button>
          ))}
        </div>

        {/* State Dropdown & Search Bar */}
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
            placeholder="Search alerts by title or corridor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 px-3.5 rounded-xl bg-[#F6F4EC] border border-[#173D32]/20 text-xs text-[#173D32] placeholder:text-[#173D32]/50 focus:outline-none focus:ring-1 focus:ring-[#173D32] w-full sm:w-56"
          />
        </div>
      </div>

      {/* Error State */}
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
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-32 bg-[#FAF8F2] border border-[#173D32]/10 rounded-2xl animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && filtered.length === 0 && (
        <div className="text-center py-16 bg-[#FAF8F2] border border-[#173D32]/10 rounded-3xl p-6">
          <span className="text-3xl block mb-2">🌿</span>
          <h4 className="text-base font-extrabold text-[#173D32]">No Active Hazard Advisories</h4>
          <p className="text-xs text-[#173D32]/70 mt-1">
            No published alerts matching the current filter criteria.
          </p>
        </div>
      )}

      {/* Alert Feed List */}
      {!isLoading && !error && filtered.length > 0 && (
        <div className="space-y-4">
          {filtered.map((alert) => (
            <div
              key={alert.id}
              className="p-5 sm:p-6 rounded-2xl bg-[#FAF8F2] border border-[#173D32]/12 hover:border-[#173D32]/25 shadow-xs transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#173D32]/8">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`px-3 py-0.5 rounded-full text-xs font-black uppercase tracking-wider ${
                      alert.severity === "Critical"
                        ? "bg-red-100 text-red-800 border border-red-200"
                        : alert.severity === "Warning"
                        ? "bg-amber-100 text-amber-800 border border-amber-200"
                        : "bg-yellow-100 text-yellow-800 border border-yellow-200"
                    }`}
                  >
                    {alert.severity}
                  </span>
                  <span className="font-extrabold text-sm text-[#173D32]">
                    {alert.corridor} · {alert.state}
                  </span>
                  {alert.location && (
                    <span className="text-xs text-[#173D32]/70 hidden md:inline">
                      ({alert.location})
                    </span>
                  )}
                </div>

                <span className="text-xs text-[#173D32]/60 font-semibold">
                  Published: {new Date(alert.publishedAt).toLocaleDateString()}
                </span>
              </div>

              <div className="mt-3">
                <h3 className="text-base sm:text-lg font-extrabold text-[#173D32] leading-snug">
                  {alert.title}
                </h3>
                <p className="text-xs sm:text-sm text-[#173D32]/80 mt-1.5 leading-relaxed">
                  {alert.description}
                </p>
              </div>

              {/* Advisory Box */}
              <div className="mt-3.5 p-3 rounded-xl bg-[#F6F4EC] border border-[#173D32]/10 text-xs">
                <span className="font-extrabold text-[#173D32] block mb-0.5">
                  🛡️ Official Transit Advisory:
                </span>
                <p className="text-[#173D32]/85 leading-snug">{alert.advisory}</p>
              </div>

              {/* Telemetry & Action Footer */}
              <div className="mt-4 pt-3 border-t border-[#173D32]/8 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex flex-wrap items-center gap-3 text-[#173D32]/70 font-semibold">
                  {alert.rainfall24h && <span>🌧️ 24h Rain: {alert.rainfall24h}</span>}
                  {alert.saturation && <span>💧 Saturation: {alert.saturation}</span>}
                  {alert.trafficStatus && (
                    <span className="text-red-700 font-bold">
                      ⚠️ Traffic: {alert.trafficStatus}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => openAlertModal(alertItemToAlertDetail(alert))}
                  className="px-4 py-1.5 rounded-full bg-[#173D32] text-[#F6F4EC] text-xs font-bold hover:bg-[#1a4437] transition-colors cursor-pointer"
                >
                  Inspect Full Details →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </PortalLayout>
  );
}

