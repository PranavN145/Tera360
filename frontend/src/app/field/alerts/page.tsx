"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  CloudRain,
  Droplets,
  MapPin,
  Road,
  Search,
  ShieldAlert,
  X,
  Zap,
} from "lucide-react";
import PortalLayout from "@/components/portal/PortalLayout";
import PortalMetricGrid from "@/components/portal/PortalMetricGrid";
import PortalFilterBar from "@/components/portal/PortalFilterBar";
import PortalSectionCard from "@/components/portal/PortalSectionCard";
import { PortalKpiCard } from "@/components/portal";
import StatusBadge from "@/components/ui/StatusBadge";
import { publicApi, fieldOfficerApi } from "@/lib/api";
import { PublicAlertItem } from "@/types/public";

const SEVERITY_FILTERS = ["All", "Critical", "Warning", "Watch"];

export default function FieldAlertsPage() {
  const [alerts, setAlerts] = useState<PublicAlertItem[]>([]);
  const [severityFilter, setSeverityFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acknowledgedIds, setAcknowledgedIds] = useState<Set<string>>(new Set());

  const handleAcknowledge = async (id: string) => {
    try {
      await fieldOfficerApi.acknowledgeAlert(id);
      setAcknowledgedIds((prev) => new Set([...prev, id]));
    } catch (err: unknown) {
      console.warn("Acknowledge note:", err);
    }
  };

  useEffect(() => {
    let mounted = true;
    async function loadAlerts() {
      try {
        const data = await publicApi.getAlerts({ limit: 50 });
        if (mounted) {
          setAlerts(data.alerts);
          setError(null);
        }
      } catch (err: unknown) {
        if (mounted) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load operational alerts"
          );
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
  }, []);

  const criticalCount = alerts.filter((a) => a.severity === "Critical").length;
  const warningCount = alerts.filter((a) => a.severity === "Warning").length;
  const watchCount = alerts.filter((a) => a.severity === "Watch").length;

  const filteredAlerts = alerts.filter((alert) => {
    if (severityFilter !== "All" && alert.severity !== severityFilter) {
      return false;
    }
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      alert.title.toLowerCase().includes(q) ||
      alert.corridor.toLowerCase().includes(q) ||
      alert.state.toLowerCase().includes(q) ||
      alert.description.toLowerCase().includes(q)
    );
  });

  return (
    <PortalLayout
      allowedRoles={["field_officer"]}
      title="Field Alerts & Operational Bulletins"
      subtitle="Priority hazard broadcasts, precipitation warnings, and geotechnical landslide watches."
      headerActions={
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/field/roads"
            className="px-3.5 py-1.5 rounded-full bg-[#173D32]/10 hover:bg-[#173D32]/15 text-[#173D32] text-xs font-bold transition-all inline-flex items-center gap-1.5"
          >
            <Road className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Road Status</span>
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
        {/* ── 1. Summary KPI Row ─────────────────────────────────────────── */}
        <PortalMetricGrid columns={4} ariaLabel="Field Alert Summary">
          <PortalKpiCard
            id="field-critical-alerts"
            variant="summary"
            title="Critical Bulletins"
            value={criticalCount}
            unit="Red Stage"
            icon={ShieldAlert}
            accent={criticalCount > 0 ? "red" : "green"}
            badge={criticalCount > 0 ? "Red Alert" : "Clear"}
            badgeTone={criticalCount > 0 ? "red" : "green"}
            detail="Immediate slope collapse & evacuation directives"
            isLoading={isLoading}
          />

          <PortalKpiCard
            id="field-warning-alerts"
            variant="summary"
            title="Warning Advisories"
            value={warningCount}
            unit="Amber Stage"
            icon={AlertTriangle}
            accent={warningCount > 0 ? "amber" : "green"}
            badge="Amber Notice"
            badgeTone={warningCount > 0 ? "amber" : "green"}
            detail="Corridor restrictions & active debris clearance"
            isLoading={isLoading}
          />

          <PortalKpiCard
            id="field-watch-alerts"
            variant="summary"
            title="Watch State"
            value={watchCount}
            unit="Yellow Stage"
            icon={Zap}
            accent={watchCount > 0 ? "amber" : "green"}
            badge="Yellow Watch"
            badgeTone={watchCount > 0 ? "amber" : "green"}
            detail="Early pore-water saturation watch notices"
            isLoading={isLoading}
          />

          <PortalKpiCard
            id="field-total-alerts"
            variant="summary"
            title="Active Feed"
            value={alerts.length}
            unit="Synchronized"
            icon={Bell}
            accent="blue"
            badge="SDMA Synced"
            badgeTone="blue"
            detail="Live bulletins synchronized with state centers"
            isLoading={isLoading}
          />
        </PortalMetricGrid>

        {/* ── 2. Filter Bar ─────────────────────────────────────────────── */}
        <PortalFilterBar
          left={
            <div className="flex items-center gap-1.5 flex-wrap">
              {SEVERITY_FILTERS.map((sev) => {
                const isActive = severityFilter === sev;
                return (
                  <button
                    key={sev}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => setSeverityFilter(sev)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? "bg-[#173D32] text-[#F6F4EC] shadow-2xs"
                        : "text-[#173D32]/75 hover:text-[#173D32] hover:bg-white/70"
                    }`}
                  >
                    {sev === "All" ? "All Severities" : sev}
                  </button>
                );
              })}
            </div>
          }
          right={
            <div className="relative w-full sm:w-64">
              <Search
                className="w-3.5 h-3.5 text-[#173D32]/45 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                id="field-alerts-search"
                name="field-alerts-search"
                type="text"
                aria-label="Search field bulletins"
                placeholder="Search corridor, state, keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 pl-9 pr-8 rounded-full bg-white border border-[#173D32]/15 text-xs text-[#173D32] placeholder:text-[#173D32]/45 focus:outline-none focus:ring-1 focus:ring-[#173D32] w-full"
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
          }
        />

        {/* ── 3. Alerts Feed ────────────────────────────────────────────── */}
        <PortalSectionCard
          title={`Active Bulletins (${filteredAlerts.length})`}
          subtitle="Synchronized with State Emergency Centers"
          icon={<Bell className="w-4 h-4" aria-hidden="true" />}
        >
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="h-32 rounded-2xl bg-white border border-[#173D32]/10 animate-pulse"
                />
              ))}
            </div>
          ) : error ? (
            <div className="p-4 rounded-2xl bg-red-50 text-red-900 text-xs border border-red-200 flex items-center gap-2 font-semibold">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          ) : filteredAlerts.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#173D32]/65 bg-white rounded-2xl border border-[#173D32]/10">
              No active hazard advisories match the selected filters.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAlerts.map((alert) => (
                <div
                  key={alert.id || alert.title}
                  className="p-5 rounded-2xl bg-white border border-[#173D32]/12 shadow-[0_2px_8px_-2px_rgba(23,61,50,0.04)]"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <StatusBadge
                        status={alert.severity}
                        size="xs"
                        pulse={alert.severity === "Critical"}
                      />
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-[#173D32]">
                        <MapPin className="w-3.5 h-3.5 text-[#173D32]/55" aria-hidden="true" />
                        <span>
                          {alert.corridor} · {alert.state}
                        </span>
                      </span>
                    </div>
                    <span className="text-xs text-[#173D32]/60 font-medium">
                      {new Date(
                        alert.publishedAt || alert.createdAt
                      ).toLocaleDateString()}
                    </span>
                  </div>

                  <h4 className="text-base font-extrabold text-[#173D32]">
                    {alert.title}
                  </h4>
                  <p className="text-xs text-[#173D32]/80 mt-1.5 leading-relaxed">
                    {alert.description}
                  </p>

                  {alert.advisory && (
                    <div className="mt-3 p-3 rounded-xl bg-[#FAF8F2] border border-[#173D32]/10 text-xs text-[#173D32]">
                      <strong className="block mb-0.5 font-bold">
                        Field Directive:
                      </strong>
                      {alert.advisory}
                    </div>
                  )}

                  <div className="mt-4 pt-3 border-t border-[#173D32]/10 flex flex-wrap items-center justify-between gap-4 text-xs text-[#173D32]/75">
                    <div className="flex flex-wrap items-center gap-4">
                      {alert.rainfall24h && (
                        <span className="inline-flex items-center gap-1.5">
                          <CloudRain className="w-3.5 h-3.5 text-[#1D4ED8]" aria-hidden="true" />
                          <span>
                            24h Rain: <strong className="text-[#173D32]">{alert.rainfall24h}</strong>
                          </span>
                        </span>
                      )}
                      {alert.saturation && (
                        <span className="inline-flex items-center gap-1.5">
                          <Droplets className="w-3.5 h-3.5 text-[#17688A]" aria-hidden="true" />
                          <span>
                            Saturation: <strong className="text-[#173D32]">{alert.saturation}</strong>
                          </span>
                        </span>
                      )}
                      {alert.trafficStatus && (
                        <span className="inline-flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-[#D97706]" aria-hidden="true" />
                          <span>
                            Traffic: <strong className="text-[#173D32]">{alert.trafficStatus}</strong>
                          </span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {acknowledgedIds.has(alert.id) ? (
                        <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs">
                          ✓ Acknowledged
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleAcknowledge(alert.id)}
                          className="px-3.5 py-1 rounded-full bg-[#173D32] hover:bg-[#1f4e40] text-[#F6F4EC] font-bold text-xs transition-colors cursor-pointer"
                        >
                          Acknowledge Advisory
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </PortalSectionCard>
      </div>
    </PortalLayout>
  );
}
