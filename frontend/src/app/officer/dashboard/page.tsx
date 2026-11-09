"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import PortalLayout from "@/components/portal/PortalLayout";
import { useApp } from "@/context/AppContext";
import { publicApi, reportsApi } from "@/lib/api";
import {
  PublicStats,
  PublicAlertItem,
  PublicRoadStatusItem,
  HazardReportOutput,
} from "@/types/public";

export default function OfficerDashboardPage() {
  const { user } = useApp();

  const [stats, setStats] = useState<PublicStats | null>(null);
  const [alerts, setAlerts] = useState<PublicAlertItem[]>([]);
  const [roads, setRoads] = useState<PublicRoadStatusItem[]>([]);
  const [reports, setReports] = useState<HazardReportOutput[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    let mounted = true;
    async function loadDashboard() {
      try {
        const [statsRes, alertsRes, roadsRes, reportsRes] = await Promise.allSettled([
          publicApi.getStats(),
          publicApi.getAlerts({ limit: 4 }),
          publicApi.getRoadStatus(),
          reportsApi.getReports({ limit: 4 }),
        ]);

        if (!mounted) return;
        if (statsRes.status === "fulfilled") setStats(statsRes.value);
        if (alertsRes.status === "fulfilled") setAlerts(alertsRes.value.alerts);
        if (roadsRes.status === "fulfilled") setRoads(roadsRes.value);
        if (reportsRes.status === "fulfilled") setReports(reportsRes.value);

        setLastRefreshed(new Date());
        setError(null);
      } catch (err: unknown) {
        if (!mounted) return;
        const msg = err instanceof Error ? err.message : "Failed to load operational dashboard data";
        setError(msg);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    void loadDashboard();
    return () => {
      mounted = false;
    };
  }, [refreshTrigger]);

  const handleManualRefresh = () => {
    setIsLoading(true);
    setRefreshTrigger((prev) => prev + 1);
  };

  // Derive alert counts
  const criticalCount = alerts.filter((a) => a.severity === "Critical").length;
  const warningCount = alerts.filter((a) => a.severity === "Warning").length;
  const watchCount = alerts.filter((a) => a.severity === "Watch").length;

  return (
    <PortalLayout
      allowedRoles={["officer", "admin"]}
      title={`Operations Dashboard — ${user?.name || "Officer"}`}
      subtitle="Regional landslide early warning, corridor clearance tracking, and emergency incident supervision."
      headerActions={
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-block text-[11px] font-semibold text-[#173D32]/60">
            Updated: {lastRefreshed ? lastRefreshed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "Live"}
          </span>
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={isLoading}
            className="px-3.5 py-1.5 rounded-full bg-[#173D32]/10 hover:bg-[#173D32]/15 text-[#173D32] text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Refresh operational data"
          >
            <span className={isLoading ? "animate-spin" : ""}>↻</span>
            <span>Refresh</span>
          </button>
          <Link
            href="/officer/alerts"
            className="px-3.5 py-1.5 rounded-full bg-[#D6A65D] hover:bg-[#c9984e] text-[#173D32] text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span>📢</span> Broadcast Alert
          </Link>
        </div>
      }
    >
      {/* Error Banner */}
      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-900 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={handleManualRefresh}
            className="px-3 py-1 rounded-full bg-red-700 text-white text-xs font-bold hover:bg-red-800 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── SECTION 1: Key Metric Overview Cards ── */}
      <section className="mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" aria-label="Key Operational Metrics">
        {/* Card 1: Regional Alert Status */}
        <div className="bg-[#FAF8F2] border border-[#173D32]/12 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#173D32]/60 mb-2">
              <span>Active Alerts</span>
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-[#173D32]">
                {isLoading ? "..." : stats?.publishedAlerts ?? alerts.length}
              </span>
              <span className="text-xs font-bold text-red-700">
                ({isLoading ? "..." : stats?.criticalAlerts ?? criticalCount} Critical)
              </span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-[#173D32]/10 flex items-center justify-between text-[11px] font-semibold text-[#173D32]/70">
            <span>Warning: {isLoading ? "..." : warningCount}</span>
            <span>Watch: {isLoading ? "..." : watchCount}</span>
            <Link href="/officer/alerts" className="text-[#173D32] hover:underline font-bold">
              View →
            </Link>
          </div>
        </div>

        {/* Card 2: Highway & Corridor Status */}
        <div className="bg-[#FAF8F2] border border-[#173D32]/12 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#173D32]/60 mb-2">
              <span>Highway Corridors</span>
              <span className="text-sm">🛣️</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-[#173D32]">
                {isLoading ? "..." : stats?.totalMonitoredCorridors ?? roads.length}
              </span>
              <span className="text-xs font-semibold text-[#173D32]/60">Monitored</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-[#173D32]/10 flex items-center justify-between text-[11px] font-semibold text-[#173D32]/70">
            <span className="text-red-600 font-bold">Blocked: {isLoading ? "..." : stats?.blockedRoads ?? 0}</span>
            <span className="text-amber-600 font-bold">Caution: {isLoading ? "..." : stats?.roadsUnderCaution ?? 0}</span>
            <span className="text-emerald-700 font-bold">Open: {isLoading ? "..." : stats?.openRoads ?? 0}</span>
          </div>
        </div>

        {/* Card 3: Community Hazard Reports */}
        <div className="bg-[#FAF8F2] border border-[#173D32]/12 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#173D32]/60 mb-2">
              <span>Ground Truth Reports</span>
              <span className="text-sm">📍</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-[#173D32]">
                {isLoading ? "..." : stats?.communityReportsSubmitted ?? reports.length}
              </span>
              <span className="text-xs font-semibold text-[#173D32]/60">Submitted</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-[#173D32]/10 flex items-center justify-between text-[11px] font-semibold text-[#173D32]/70">
            <span>Pending Review: {isLoading ? "..." : reports.filter((r) => r.status === "submitted").length}</span>
            <Link href="/officer/reports" className="text-[#173D32] hover:underline font-bold">
              Inspect →
            </Link>
          </div>
        </div>

        {/* Card 4: Command Center Sync State */}
        <div className="bg-[#FAF8F2] border border-[#173D32]/12 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#173D32]/60 mb-2">
              <span>Operational Risk</span>
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-extrabold uppercase">
                Active
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-black text-[#173D32]">
                {stats && stats.criticalAlerts > 0 ? "Elevated Warning" : "Moderate Risk"}
              </span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-[#173D32]/10 flex items-center justify-between text-[11px] font-semibold text-[#173D32]/70">
            <span>GIS Hotspots Active</span>
            <Link href="/officer/map" className="text-[#173D32] hover:underline font-bold">
              View Map →
            </Link>
          </div>
        </div>

      </section>

      {/* ── SECTION 2: Core Two-Column Workspaces ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        {/* Left Column: Alerts & Road Impact (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Active Alerts Feed */}
          <div className="bg-[#FAF8F2] border border-[#173D32]/12 rounded-3xl p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-[#173D32]/10 mb-4">
              <div>
                <h3 className="text-base sm:text-lg font-extrabold text-[#173D32]">
                  Priority Hazard Broadcasts
                </h3>
                <p className="text-xs text-[#173D32]/70 mt-0.5">
                  Published advisories currently active on Northeast highways.
                </p>
              </div>
              <Link
                href="/officer/alerts"
                className="text-xs font-bold text-[#173D32] hover:underline flex items-center gap-1"
              >
                Alert Center →
              </Link>
            </div>

            {isLoading && (
              <div className="space-y-3">
                {[1, 2].map((n) => (
                  <div key={n} className="h-20 bg-[#173D32]/5 rounded-xl animate-pulse" />
                ))}
              </div>
            )}

            {!isLoading && alerts.length === 0 && (
              <div className="text-center py-8 text-[#173D32]/60 text-xs">
                <span>🌱 No active alerts in database.</span>
              </div>
            )}

            {!isLoading && alerts.length > 0 && (
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="p-4 rounded-2xl bg-[#F6F4EC] border border-[#173D32]/10 hover:border-[#173D32]/25 transition-all"
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider ${
                            alert.severity === "Critical"
                              ? "bg-red-100 text-red-800 border border-red-200"
                              : alert.severity === "Warning"
                              ? "bg-amber-100 text-amber-800 border border-amber-200"
                              : "bg-yellow-100 text-yellow-800 border border-yellow-200"
                          }`}
                        >
                          {alert.severity}
                        </span>
                        <span className="font-bold text-xs text-[#173D32]">
                          {alert.corridor} · {alert.state}
                        </span>
                      </div>
                      <span className="text-[10px] text-[#173D32]/60 font-semibold">
                        {new Date(alert.publishedAt).toLocaleDateString()}
                      </span>
                    </div>

                    <h4 className="font-extrabold text-sm text-[#173D32] leading-snug">
                      {alert.title}
                    </h4>

                    {alert.location && (
                      <p className="text-xs text-[#173D32]/75 font-medium mt-1">
                        📍 {alert.location}
                      </p>
                    )}

                    <div className="mt-2.5 pt-2 border-t border-[#173D32]/8 flex flex-wrap items-center gap-3 text-[11px] text-[#173D32]/70 font-semibold">
                      {alert.rainfall24h && <span>🌧️ {alert.rainfall24h}</span>}
                      {alert.saturation && <span>💧 {alert.saturation}</span>}
                      {alert.trafficStatus && (
                        <span className="text-red-700 font-bold truncate max-w-xs">
                          ⚠️ {alert.trafficStatus}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Highway Clearance & Road Impact */}
          <div className="bg-[#FAF8F2] border border-[#173D32]/12 rounded-3xl p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-[#173D32]/10 mb-4">
              <div>
                <h3 className="text-base sm:text-lg font-extrabold text-[#173D32]">
                  Monitored Highway Corridors
                </h3>
                <p className="text-xs text-[#173D32]/70 mt-0.5">
                  Clearance states and geotechnical slope risks along key arterial highways.
                </p>
              </div>
              <Link
                href="/officer/roads"
                className="text-xs font-bold text-[#173D32] hover:underline flex items-center gap-1"
              >
                All Corridors →
              </Link>
            </div>

            {isLoading && (
              <div className="space-y-3">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-14 bg-[#173D32]/5 rounded-xl animate-pulse" />
                ))}
              </div>
            )}

            {!isLoading && roads.length === 0 && (
              <div className="text-center py-8 text-[#173D32]/60 text-xs">
                <span>🌿 No corridors currently registered in database.</span>
              </div>
            )}

            {!isLoading && roads.length > 0 && (
              <div className="space-y-2.5">
                {roads.map((road) => (
                  <div
                    key={road.id}
                    className="p-3.5 rounded-xl bg-[#F6F4EC] border border-[#173D32]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-[#173D32] text-[#F6F4EC] text-xs font-black tracking-wide">
                          {road.code}
                        </span>
                        <span className="font-bold text-xs text-[#173D32]">
                          {road.name}
                        </span>
                      </div>
                      <p className="text-xs text-[#173D32]/70 mt-1">
                        {road.stretch} ({road.state})
                      </p>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider ${
                          road.status === "blocked"
                            ? "bg-red-100 text-red-800 border border-red-200"
                            : road.status === "caution" || road.status === "partial"
                            ? "bg-amber-100 text-amber-800 border border-amber-200"
                            : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                        }`}
                      >
                        {road.status}
                      </span>
                      <span className="text-[11px] font-bold text-[#173D32]/70">
                        Risk: {road.riskLevel}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Right Column: Spatial Map Overview & Field Reports (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Spatial Risk Radar Card */}
          <div className="bg-[#FAF8F2] border border-[#173D32]/12 rounded-3xl p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#173D32]/10 mb-3">
              <div>
                <h3 className="text-base sm:text-lg font-extrabold text-[#173D32]">
                  Live Spatial Risk Map
                </h3>
                <p className="text-xs text-[#173D32]/70 mt-0.5">
                  Real-time spatial monitoring of slope saturation.
                </p>
              </div>
              <Link
                href="/officer/map"
                className="px-3 py-1 rounded-full bg-[#173D32] text-[#F6F4EC] text-xs font-bold hover:bg-[#1a4437] transition-colors"
              >
                Expand Map ↗
              </Link>
            </div>

            {/* Radar Mini Visual Section */}
            <div className="relative rounded-2xl overflow-hidden bg-[#173D32] text-[#F6F4EC] p-4 min-h-[190px] flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#DCE8D4]">
                  GIS Radar Engine · 8 States
                </span>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 text-[10px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />
                  Live Sync
                </span>
              </div>

              <div className="my-3 py-2 space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-[#F6F4EC]/90">
                  <span>📍 NH-29 Paglapahar / Dzüdza</span>
                  <span className="text-red-400 font-bold">Blocked (94% Sat)</span>
                </div>
                <div className="flex items-center justify-between text-[#F6F4EC]/90">
                  <span>📍 NH-10 Teesta Gorge (29th Mile)</span>
                  <span className="text-amber-400 font-bold">Caution (82% Sat)</span>
                </div>
                <div className="flex items-center justify-between text-[#F6F4EC]/90">
                  <span>📍 NH-27 Borail Range / Jatinga</span>
                  <span className="text-emerald-400 font-bold">Open (68% Sat)</span>
                </div>
              </div>

              <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-[#DCE8D4]">
                <span>2dsphere Spatial Index Active</span>
                <Link href="/officer/map" className="font-bold underline hover:text-white">
                  Launch Fullscreen →
                </Link>
              </div>
            </div>
          </div>

          {/* Recent Field Reports Feed */}
          <div className="bg-[#FAF8F2] border border-[#173D32]/12 rounded-3xl p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-[#173D32]/10 mb-4">
              <div>
                <h3 className="text-base sm:text-lg font-extrabold text-[#173D32]">
                  Recent Field Reports
                </h3>
                <p className="text-xs text-[#173D32]/70 mt-0.5">
                  Citizen and field officer crowd-sourced incident submissions.
                </p>
              </div>
              <Link
                href="/officer/reports"
                className="text-xs font-bold text-[#173D32] hover:underline flex items-center gap-1"
              >
                All Reports →
              </Link>
            </div>

            {isLoading && (
              <div className="space-y-3">
                {[1, 2].map((n) => (
                  <div key={n} className="h-16 bg-[#173D32]/5 rounded-xl animate-pulse" />
                ))}
              </div>
            )}

            {!isLoading && reports.length === 0 && (
              <div className="text-center py-8 text-[#173D32]/60 text-xs">
                <span>📋 No recent field reports submitted.</span>
              </div>
            )}

            {!isLoading && reports.length > 0 && (
              <div className="space-y-2.5">
                {reports.map((report) => (
                  <div
                    key={report.reportId}
                    className="p-3.5 rounded-xl bg-[#F6F4EC] border border-[#173D32]/10"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="font-black text-xs text-[#173D32]">
                        {report.reportId}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          report.status === "verified"
                            ? "bg-emerald-100 text-emerald-800"
                            : report.status === "under_review"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {report.status.replace("_", " ")}
                      </span>
                    </div>

                    <p className="text-xs font-bold text-[#173D32] leading-tight">
                      {report.hazardType} · {report.location}
                    </p>

                    <p className="text-[11px] text-[#173D32]/75 line-clamp-2 mt-1 leading-snug">
                      {report.description}
                    </p>

                    <div className="mt-2 pt-1.5 border-t border-[#173D32]/8 flex items-center justify-between text-[10px] text-[#173D32]/60 font-semibold">
                      <span>By: {report.reporterName || "Anonymous Citizen"}</span>
                      <span>{new Date(report.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
    </PortalLayout>
  );
}
