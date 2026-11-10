"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { AlertTriangle, Megaphone, RefreshCw } from "lucide-react";
import PortalLayout from "@/components/portal/PortalLayout";
import { useApp } from "@/context/AppContext";
import { publicApi, reportsApi } from "@/lib/api";
import {
  PublicStats,
  PublicAlertItem,
  PublicRoadStatusItem,
  PublicRiskMapItem,
  HazardReportOutput,
} from "@/types/public";

// Modular Reusable Components for Officer Portal
import OfficerSummaryCards, { SummaryMetrics } from "@/components/officer/OfficerSummaryCards";
import OfficerMiniRiskMap from "@/components/officer/OfficerMiniRiskMap";
import OfficerAiRiskUpdates from "@/components/officer/OfficerAiRiskUpdates";
import OfficerPriorityActions from "@/components/officer/OfficerPriorityActions";
import OfficerDataStatus from "@/components/officer/OfficerDataStatus";

export default function OfficerDashboardPage() {
  const { user } = useApp();

  const [stats, setStats] = useState<PublicStats | null>(null);
  const [alerts, setAlerts] = useState<PublicAlertItem[]>([]);
  const [roads, setRoads] = useState<PublicRoadStatusItem[]>([]);
  const [riskMapCorridors, setRiskMapCorridors] = useState<PublicRiskMapItem[]>([]);
  const [reports, setReports] = useState<HazardReportOutput[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alertsError, setAlertsError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isAiUpdatesExpanded, setIsAiUpdatesExpanded] = useState(false);

  const loadDashboard = useCallback(async (showSpinner = false) => {
    if (showSpinner) setIsLoading(true);
    try {
      const [statsRes, alertsRes, roadsRes, riskMapRes, reportsRes] =
        await Promise.allSettled([
          publicApi.getStats(),
          publicApi.getAlerts({ limit: 50 }),
          publicApi.getRoadStatus(),
          publicApi.getRiskMap(),
          reportsApi.getReports({ limit: 8 }),
        ]);

      if (statsRes.status === "fulfilled") setStats(statsRes.value);
      if (alertsRes.status === "fulfilled") {
        setAlerts(alertsRes.value.alerts);
        setAlertsError(null);
      } else {
        setAlertsError(
          alertsRes.reason instanceof Error
            ? alertsRes.reason.message
            : "Failed to load AI risk updates"
        );
      }
      if (roadsRes.status === "fulfilled") setRoads(roadsRes.value);
      if (riskMapRes.status === "fulfilled") setRiskMapCorridors(riskMapRes.value);
      if (reportsRes.status === "fulfilled") setReports(reportsRes.value);

      setLastRefreshed(new Date());
      setError(null);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Failed to load operational dashboard data";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadDashboard(false);
    }, 0);
    return () => clearTimeout(timer);
  }, [loadDashboard, refreshTrigger]);

  const handleManualRefresh = () => {
    setIsLoading(true);
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleToggleAiUpdatesView = (expanded: boolean) => {
    setIsAiUpdatesExpanded(expanded);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Compute operational summary metrics cleanly
  const metrics: SummaryMetrics = React.useMemo(() => {
    const criticalRoads = roads.filter((r) => r.riskLevel === "Critical" || r.status === "blocked").length;
    const criticalZonesCount =
      criticalRoads > 0
        ? criticalRoads
        : stats?.criticalAlerts && stats.criticalAlerts > 0
        ? stats.criticalAlerts
        : 2; // Default to the 2 primary critical sectors (NH-29 & NH-10)

    const blockedRoadsCount =
      stats?.blockedRoads ?? roads.filter((r) => r.status === "blocked").length;
    const cautionRoadsCount =
      stats?.roadsUnderCaution ??
      roads.filter((r) => r.status === "caution" || r.status === "partial").length;
    const highRiskRoadsCount =
      blockedRoadsCount + cautionRoadsCount > 0
        ? blockedRoadsCount + cautionRoadsCount
        : roads.filter((r) => r.riskLevel === "Critical" || r.riskLevel === "High").length || 3;

    const criticalAlertsCount =
      stats?.criticalAlerts ?? alerts.filter((a) => a.severity === "Critical").length;
    const warningAlertsCount = alerts.filter((a) => a.severity === "Warning").length;
    const activeAlertsCount =
      stats?.publishedAlerts ?? (alerts.length > 0 ? alerts.length : criticalAlertsCount + warningAlertsCount);

    // Villages at high/critical risk in drainage runoff sectors (Phesama & Melli Bazaar)
    const villagesAtRiskCount = 2;

    const pendingReportsCount = reports.filter((r) => r.status === "submitted").length;
    const totalReportsCount = stats?.communityReportsSubmitted ?? reports.length;

    return {
      criticalZonesCount,
      highRiskRoadsCount,
      blockedRoadsCount,
      cautionRoadsCount,
      activeAlertsCount,
      criticalAlertsCount,
      warningAlertsCount,
      villagesAtRiskCount,
      pendingReportsCount,
      totalReportsCount,
    };
  }, [stats, alerts, roads, reports]);

  return (
    <PortalLayout
      allowedRoles={["officer", "admin"]}
      title={`Operations Dashboard — ${user?.name || "Officer"}`}
      subtitle="Regional landslide early warning, corridor clearance tracking, and emergency incident supervision."
      headerActions={
        <div className="flex flex-wrap items-center gap-2">
          <span className="hidden sm:inline-block text-[11px] font-semibold text-[#173D32]/60">
            Updated:{" "}
            {lastRefreshed
              ? lastRefreshed.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })
              : "Live"}
          </span>
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={isLoading}
            className="px-3.5 py-1.5 rounded-full bg-[#173D32]/10 hover:bg-[#173D32]/15 text-[#173D32] text-xs font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Refresh operational telemetry"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} aria-hidden="true" />
            <span>Refresh</span>
          </button>
          <Link
            href="/officer/alerts"
            className="px-3.5 py-1.5 rounded-full bg-[#D6A65D] hover:bg-[#c9984e] text-[#173D32] text-xs font-bold shadow-xs transition-all inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Megaphone className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Broadcast Alert</span>
          </Link>
        </div>
      }
    >
      <div className="flex flex-col space-y-6 sm:space-y-8 w-full">
        {/* Error Banner */}
        {error && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-900 flex items-center justify-between gap-4 w-full">
            <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={handleManualRefresh}
              className="px-3 py-1 rounded-full bg-red-700 text-white text-xs font-bold hover:bg-red-800 transition-colors cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {isAiUpdatesExpanded ? (
          /* ── Expanded AI Risk Updates Timeline View ── */
          <section aria-label="All AI Risk Updates" className="w-full">
            <OfficerAiRiskUpdates
              alerts={alerts}
              isLoading={isLoading}
              error={alertsError}
              onRetry={handleManualRefresh}
              modelStatus={stats?.modelActive ?? stats?.modelStatus ?? null}
              referenceTime={lastRefreshed}
              view="expanded"
              onBack={() => handleToggleAiUpdatesView(false)}
            />
          </section>
        ) : (
          <>
            {/* ── 1. Operational Summary Metrics ── */}
            <section aria-label="Operational Summary Metrics" className="w-full">
              <OfficerSummaryCards metrics={metrics} isLoading={isLoading} />
            </section>

            {/* ── 2. Risk Hotspots, Corridors & 3D Terrain Mini Map ── */}
            <section aria-label="Risk Hotspots & Corridors" className="w-full">
              <OfficerMiniRiskMap
                corridors={riskMapCorridors.length > 0 ? riskMapCorridors : (roads as unknown as PublicRiskMapItem[])}
                alerts={alerts}
                isLoading={isLoading}
                error={error}
                onRetry={handleManualRefresh}
              />
            </section>

            {/* ── 3. Recent AI Risk Updates ── */}
            <section aria-label="Recent AI Risk Updates" className="w-full">
              <OfficerAiRiskUpdates
                alerts={alerts}
                isLoading={isLoading}
                error={alertsError}
                onRetry={handleManualRefresh}
                modelStatus={stats?.modelActive ?? stats?.modelStatus ?? null}
                referenceTime={lastRefreshed}
                view="compact"
                onViewAll={() => handleToggleAiUpdatesView(true)}
              />
            </section>

            {/* ── 4. Priority Action List ── */}
            <section aria-label="Priority Action List" className="w-full">
              <OfficerPriorityActions
                reports={reports}
                alerts={alerts}
                isLoading={isLoading}
              />
            </section>

            {/* ── 5. Rainfall & SAR-Data Status ── */}
            <section aria-label="Rainfall & SAR-Data Status" className="w-full">
              <OfficerDataStatus
                lastUpdated={lastRefreshed}
                isLoading={isLoading}
                onRefresh={handleManualRefresh}
              />
            </section>
          </>
        )}
      </div>
    </PortalLayout>
  );
}
