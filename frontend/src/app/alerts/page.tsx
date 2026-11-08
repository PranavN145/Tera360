"use client";

import { useState, useEffect, useCallback } from "react";
import Header from "@/components/layout/Header";
import { useApp } from "@/context/AppContext";
import { publicApi } from "@/lib/api";
import { PublicAlertItem, alertItemToAlertDetail } from "@/types/public";

export default function AlertsPage() {
  const { openAlertModal } = useApp();
  const [filterSeverity, setFilterSeverity] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");

  const [alerts, setAlerts] = useState<PublicAlertItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadAlerts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await publicApi.getAlerts({
        severity: filterSeverity === "All" ? undefined : filterSeverity,
        limit: 50,
      });
      setAlerts(res.alerts);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load alerts feed";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [filterSeverity]);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  const filtered = alerts.filter((a) => {
    const loc = a.location || a.title || "";
    const state = a.state || "";
    const desc = a.description || "";
    const corridor = a.corridor || "";
    const query = searchTerm.toLowerCase();

    return (
      !searchTerm.trim() ||
      loc.toLowerCase().includes(query) ||
      state.toLowerCase().includes(query) ||
      corridor.toLowerCase().includes(query) ||
      desc.toLowerCase().includes(query)
    );
  });

  // Calculate counts for severity tabs
  const criticalCount = alerts.filter((a) => a.severity === "Critical").length;
  const warningCount = alerts.filter((a) => a.severity === "Warning").length;
  const watchCount = alerts.filter((a) => a.severity === "Watch").length;

  return (
    <div className="relative w-full min-h-screen bg-[#F6F4EC] flex flex-col">
      <Header />

      <main className="flex-1 max-w-[1340px] w-full mx-auto px-4 sm:px-6 lg:px-10 py-10 sm:py-14">
        {/* Header */}
        <div className="mb-10 pb-8 border-b border-[#173D32]/10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#DCE8D4]/60 text-xs font-bold text-[#173D32] uppercase mb-3">
            <span className="w-2 h-2 rounded-full bg-[#D6A65D]" />
            Live Dispatch & Advisories
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#173D32] tracking-tight">
            Regional Landslide & Highway Alerts
          </h1>
          <p className="mt-2.5 text-base sm:text-lg text-[#173D32]/80 max-w-2xl font-normal">
            Real-time hazard notifications verified by state disaster management authorities, Border Roads Organisation (BRO), and geotechnical sensors.
          </p>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {[
              { id: "All", label: "All", count: alerts.length },
              { id: "Critical", label: "Critical", count: criticalCount },
              { id: "Warning", label: "Warning", count: warningCount },
              { id: "Watch", label: "Watch", count: watchCount },
            ].map(({ id, label, count }) => (
              <button
                key={id}
                type="button"
                onClick={() => setFilterSeverity(id)}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  filterSeverity === id
                    ? "bg-[#173D32] text-[#F6F4EC]"
                    : "bg-[#FAF8F2] text-[#173D32]/80 border border-[#173D32]/15 hover:bg-[#FAF8F2]"
                }`}
              >
                <span>{label}</span>
                <span className="opacity-60">({count})</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="text"
              placeholder="Search alerts by state, highway, town..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-72 h-10 px-4 rounded-full bg-[#FAF8F2] border border-[#173D32]/20 text-xs text-[#173D32] placeholder:text-[#173D32]/50 focus:outline-none focus:ring-1 focus:ring-[#173D32]"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="text-xs text-[#173D32]/60 hover:text-[#173D32] px-2 py-1"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center justify-between gap-4">
            <p className="text-xs sm:text-sm font-semibold">⚠️ {error}</p>
            <button
              type="button"
              onClick={loadAlerts}
              className="px-4 py-1.5 rounded-full bg-[#173D32] text-[#F6F4EC] text-xs font-bold hover:bg-[#1f4e40] transition-colors cursor-pointer shrink-0"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading Skeletons */}
        {isLoading && (
          <div className="flex flex-col gap-4">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="bg-[#FAF8F2] rounded-2xl border border-[#173D32]/12 p-6 animate-pulse flex flex-col md:flex-row md:items-center justify-between gap-5"
              >
                <div className="max-w-3xl w-full">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-5 w-20 bg-[#173D32]/10 rounded-full" />
                    <div className="h-4 w-32 bg-[#173D32]/10 rounded" />
                  </div>
                  <div className="h-6 w-3/4 bg-[#173D32]/15 rounded mb-2" />
                  <div className="h-4 w-full bg-[#173D32]/10 rounded" />
                </div>
                <div className="h-9 w-28 bg-[#173D32]/10 rounded-full shrink-0" />
              </div>
            ))}
          </div>
        )}

        {/* Empty State Banner (No alerts match or none in DB) */}
        {!isLoading && !error && filtered.length === 0 && (
          <div className="text-center py-16 px-4 bg-[#FAF8F2] rounded-2xl border border-[#173D32]/10 max-w-xl mx-auto shadow-xs">
            <span className="text-4xl block mb-3">🌿</span>
            <h4 className="text-lg font-bold text-[#173D32]">
              {searchTerm || filterSeverity !== "All"
                ? "No Alerts Match Your Search Criteria"
                : "No Active Landslide Alerts Published"}
            </h4>
            <p className="text-xs sm:text-sm text-[#173D32]/70 mt-2 leading-relaxed">
              {searchTerm || filterSeverity !== "All"
                ? "Try clearing the search box or switching to the 'All' severity tab."
                : "All highway corridors across the 8 Northeast states are operating under nominal safety levels."}
            </p>
            <div className="mt-5 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={loadAlerts}
                className="px-5 py-2 rounded-full bg-[#173D32] text-[#F6F4EC] text-xs font-bold hover:bg-[#1f4e40] transition-colors cursor-pointer"
              >
                Refresh Advisories ↻
              </button>
            </div>
          </div>
        )}

        {/* Alerts Feed */}
        {!isLoading && !error && filtered.length > 0 && (
          <div className="flex flex-col gap-4">
            {filtered.map((item) => {
              const alert = alertItemToAlertDetail(item);
              return (
                <div
                  key={alert.id}
                  onClick={() => openAlertModal(alert)}
                  className="bg-[#FAF8F2] rounded-2xl border border-[#173D32]/12 p-6 hover:border-[#173D32]/30 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-5 group"
                >
                  <div className="max-w-3xl">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold ${
                          alert.severity === "Critical"
                            ? "bg-red-50 text-red-700 border border-red-200"
                            : alert.severity === "Warning"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-yellow-50 text-yellow-800 border border-yellow-200"
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        {alert.severity}
                      </span>
                      <span className="text-xs font-bold text-[#173D32]/70">
                        {alert.state} · {alert.corridor}
                      </span>
                      <span className="text-xs text-[#173D32]/50">| {alert.timestamp}</span>
                    </div>

                    <h3 className="text-xl font-bold text-[#173D32] group-hover:text-[#133229]">
                      {alert.location}
                    </h3>
                    <p className="text-sm text-[#173D32]/80 mt-1.5 leading-relaxed font-normal">
                      {alert.description}
                    </p>
                  </div>

                  <div className="shrink-0 flex items-center justify-end">
                    <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#173D32] text-[#F6F4EC] text-xs font-bold group-hover:bg-[#1f4e40] transition-colors">
                      <span>View Telemetry</span>
                      <span aria-hidden="true">→</span>
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
