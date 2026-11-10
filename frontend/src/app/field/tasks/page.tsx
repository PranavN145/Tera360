"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  ClipboardList,
  Compass,
  FilePlus2,
  Map,
  Radio,
  Road,
  ShieldCheck,
} from "lucide-react";
import PortalLayout from "@/components/portal/PortalLayout";
import PortalMetricGrid from "@/components/portal/PortalMetricGrid";
import { PortalKpiCard } from "@/components/portal";
import { useApp } from "@/context/AppContext";
import { publicApi, reportsApi } from "@/lib/api";

export default function FieldTasksPage() {
  const { user } = useApp();

  const [corridorsCount, setCorridorsCount] = useState<number>(0);
  const [blockedCount, setBlockedCount] = useState<number>(0);
  const [alertsCount, setAlertsCount] = useState<number>(0);
  const [criticalAlertsCount, setCriticalAlertsCount] = useState<number>(0);
  const [reportsCount, setReportsCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    async function loadFieldTelemetry() {
      try {
        const [roadsRes, alertsRes, reportsRes] = await Promise.allSettled([
          publicApi.getRoadStatus({}),
          publicApi.getAlerts({ limit: 50 }),
          reportsApi.getReports({ limit: 50 }),
        ]);

        if (!mounted) return;

        if (roadsRes.status === "fulfilled") {
          setCorridorsCount(roadsRes.value.length);
          setBlockedCount(
            roadsRes.value.filter(
              (r) => r.status === "blocked" || r.status === "caution"
            ).length
          );
        }
        if (alertsRes.status === "fulfilled") {
          setAlertsCount(alertsRes.value.alerts.length);
          setCriticalAlertsCount(
            alertsRes.value.alerts.filter((a) => a.severity === "Critical").length
          );
        }
        if (reportsRes.status === "fulfilled") {
          setReportsCount(reportsRes.value.length);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    void loadFieldTelemetry();
    return () => {
      mounted = false;
    };
  }, []);

  const workspaceCards = [
    {
      id: "area-map",
      eyebrow: "GIS Live Feed",
      title: "Assigned Area Map",
      description:
        "Inspect corridor risk ratings, precipitation thresholds, and active geotechnical sensor stations across your assigned hill sector.",
      href: "/field/map",
      cta: "Launch Sector Map",
      icon: Map,
      iconBg: "bg-[#E2F4E8] text-[#1E7A45]",
    },
    {
      id: "field-reports",
      eyebrow: "Incident Logging",
      title: "Field Hazard Reports",
      description:
        "Review ground observation submissions, verify active field telemetry, and log slope tension cracks or road subsidence.",
      href: "/field/reports",
      cta: "Open Ground Reports",
      icon: ClipboardList,
      iconBg: "bg-[#E2F1F8] text-[#17688A]",
    },
    {
      id: "road-status",
      eyebrow: "Transit Bulletins",
      title: "Road Status & Impact",
      description:
        "Monitor highway corridor blockages, one-way traffic restrictions, and heavy vehicle advisories on NH-27, NH-29, and NH-10.",
      href: "/field/roads",
      cta: "View Road Feed",
      icon: Road,
      iconBg: "bg-[#FEF1DC] text-[#B45E09]",
    },
    {
      id: "communications",
      eyebrow: "Responder Settings",
      title: "Profile & Communications",
      description:
        "Maintain contact with Central Command Ops Center and verify your radio call sign, equipment kit, and emergency credentials.",
      href: "/field/profile",
      cta: "Profile & Clearance",
      icon: Radio,
      iconBg: "bg-[#EAF0E6] text-[#173D32]",
    },
  ];

  return (
    <PortalLayout
      allowedRoles={["field_officer"]}
      title="Field Operations & Tasks"
      subtitle="Sensor telemetry checks, incident verification, and ground team dispatches across Northeast corridors."
      headerActions={
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/field"
            className="px-3.5 py-1.5 rounded-full bg-[#173D32] text-[#F6F4EC] text-xs font-bold hover:bg-[#1a4437] transition-all inline-flex items-center gap-1.5"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
            <span>Field Workbench</span>
          </Link>
          <Link
            href="/report"
            className="px-3.5 py-1.5 rounded-full bg-[#D6A65D] hover:bg-[#c9984e] text-[#173D32] text-xs font-bold shadow-xs transition-all inline-flex items-center gap-1.5"
          >
            <FilePlus2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>File Field Report</span>
          </Link>
          <Link
            href="/field/map"
            className="px-3.5 py-1.5 rounded-full bg-white border border-[#173D32]/20 text-[#173D32] text-xs font-bold hover:bg-[#FAF8F2] transition-all inline-flex items-center gap-1.5"
          >
            <Compass className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Area Map</span>
          </Link>
        </div>
      }
    >
      <div className="space-y-6 sm:space-y-8 w-full">
        {/* ── 1. Top Field Responder KPI Metrics ────────────────────────── */}
        <PortalMetricGrid columns={4} ariaLabel="Field Operations Metrics">
          <PortalKpiCard
            id="field-duty-status"
            variant="summary"
            title="Active Duty Sector"
            value="On-Call"
            unit={user?.name ? user.name.split(" ")[0] : "Responder"}
            icon={ShieldCheck}
            accent="green"
            badge="100% Synced"
            badgeTone="green"
            detail="Dima Hasao & Kohima quick response grid active"
            isLoading={false}
          />

          <PortalKpiCard
            id="field-corridors-impacted"
            variant="summary"
            title="Monitored Corridors"
            value={corridorsCount}
            unit={`${blockedCount} Alerted`}
            icon={Road}
            accent={blockedCount > 0 ? "amber" : "green"}
            badge={blockedCount > 0 ? `${blockedCount} Impacted` : "Clear"}
            badgeTone={blockedCount > 0 ? "amber" : "green"}
            detail="Strategic arterial highways under field patrol"
            isLoading={isLoading}
          />

          <PortalKpiCard
            id="field-active-alerts"
            variant="summary"
            title="Active Bulletins"
            value={alertsCount}
            unit={`${criticalAlertsCount} Critical`}
            icon={Bell}
            accent={criticalAlertsCount > 0 ? "red" : "amber"}
            badge={criticalAlertsCount > 0 ? "Red Alert" : "Active Feed"}
            badgeTone={criticalAlertsCount > 0 ? "red" : "amber"}
            detail="Published hazard directives for ground verification"
            isLoading={isLoading}
          />

          <PortalKpiCard
            id="field-ground-reports"
            variant="summary"
            title="Ground Reports"
            value={reportsCount}
            unit="Submissions"
            icon={AlertTriangle}
            accent="blue"
            badge="Telemetry Live"
            badgeTone="blue"
            detail="Field observations and community danger reports"
            isLoading={isLoading}
          />
        </PortalMetricGrid>

        {/* ── 2. Operational Modules & Workspaces Grid ──────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {workspaceCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.id}
                className="p-5 sm:p-6 bg-[#FAF8F2] rounded-2xl sm:rounded-3xl border border-[#173D32]/12 shadow-xs flex flex-col justify-between transition-all hover:border-[#173D32]/25"
              >
                <div>
                  <div className="flex items-center justify-between gap-3 mb-3.5">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${card.iconBg}`}
                      aria-hidden="true"
                    >
                      <Icon className="w-5 h-5" strokeWidth={2} />
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-white border border-[#173D32]/12 text-[10px] font-bold uppercase tracking-wider text-[#173D32]/70">
                      {card.eyebrow}
                    </span>
                  </div>
                  <h3 className="text-base font-extrabold text-[#173D32]">
                    {card.title}
                  </h3>
                  <p className="text-xs text-[#173D32]/75 mt-1.5 leading-relaxed">
                    {card.description}
                  </p>
                </div>

                <div className="mt-5 pt-4 border-t border-[#173D32]/10 flex items-center justify-between gap-3">
                  <Link
                    href="/field/alerts"
                    className="text-[11px] font-bold text-[#173D32]/70 hover:text-[#173D32] hover:underline"
                  >
                    Check Active Alerts
                  </Link>
                  <Link
                    href={card.href}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#173D32] text-[#F6F4EC] text-xs font-bold hover:bg-[#1a4437] transition-all shadow-2xs"
                  >
                    <span>{card.cta}</span>
                    <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </PortalLayout>
  );
}
