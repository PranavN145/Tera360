"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Map,
  PhoneCall,
  Road,
  ShieldAlert,
  ShieldCheck,
  User,
} from "lucide-react";
import PortalLayout from "@/components/portal/PortalLayout";
import PortalMetricGrid from "@/components/portal/PortalMetricGrid";
import { PortalKpiCard } from "@/components/portal";
import { useApp } from "@/context/AppContext";
import { publicApi } from "@/lib/api";

export default function CitizenHomePage() {
  const { user } = useApp();

  const [alertsCount, setAlertsCount] = useState<number>(0);
  const [criticalAlertsCount, setCriticalAlertsCount] = useState<number>(0);
  const [impactedRoadsCount, setImpactedRoadsCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    async function loadCommunityTelemetry() {
      try {
        const [alertsRes, roadsRes] = await Promise.allSettled([
          publicApi.getAlerts({ limit: 50 }),
          publicApi.getRoadStatus({}),
        ]);

        if (!mounted) return;

        if (alertsRes.status === "fulfilled") {
          setAlertsCount(alertsRes.value.alerts.length);
          setCriticalAlertsCount(
            alertsRes.value.alerts.filter((a) => a.severity === "Critical").length
          );
        }
        if (roadsRes.status === "fulfilled") {
          setImpactedRoadsCount(
            roadsRes.value.filter(
              (r) => r.status === "blocked" || r.status === "caution"
            ).length
          );
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    void loadCommunityTelemetry();
    return () => {
      mounted = false;
    };
  }, []);

  const communityModules = [
    {
      id: "my-area",
      eyebrow: "Local Mapping",
      title: "My Area Risk Map",
      description:
        "Check real-time slope hazard assessments, road clearance, and weather advisories for your locality before traveling.",
      href: "/citizen/my-area",
      cta: "Explore My Area",
      icon: Map,
      iconBg: "bg-[#E2F4E8] text-[#1E7A45]",
      secondaryHref: "/risk-map",
      secondaryLabel: "Full GIS Map",
    },
    {
      id: "report-hazard",
      eyebrow: "Community Safety",
      title: "Report Local Hazard",
      description:
        "Notice cracks on the hillside, sudden muddy runoff, or falling rocks? File a rapid hazard report to alert authorities.",
      href: "/citizen/report",
      cta: "Submit Report",
      icon: AlertTriangle,
      iconBg: "bg-[#FEF1DC] text-[#B45E09]",
      secondaryHref: "/alerts",
      secondaryLabel: "Public Advisories",
    },
    {
      id: "safe-places",
      eyebrow: "Emergency Zones",
      title: "Safe Places & Shelters",
      description:
        "Find geotechnically vetted evacuation shelters, high-elevation community halls, and district emergency helplines.",
      href: "/citizen/safe-place",
      cta: "Find Safe Places",
      icon: ShieldCheck,
      iconBg: "bg-[#E2F1F8] text-[#17688A]",
      secondaryHref: "/alerts",
      secondaryLabel: "Active Warnings",
    },
    {
      id: "resident-profile",
      eyebrow: "Account Settings",
      title: "Resident Profile",
      description:
        "Configure your emergency phone number, preferred alert language (English, Assamese, Bengali, Hindi, Manipuri, Mizo), and security.",
      href: "/citizen/profile",
      cta: "Open Profile",
      icon: User,
      iconBg: "bg-[#EAF0E6] text-[#173D32]",
      secondaryHref: "/account?tab=security",
      secondaryLabel: "Security Settings",
    },
  ];

  return (
    <PortalLayout
      allowedRoles={["citizen"]}
      title="Citizen Community Portal"
      subtitle="Community advisories, danger reporting, and local landslide risk monitoring for your area."
      headerActions={
        <div className="flex items-center gap-2">
          <Link
            href="/citizen/report"
            className="px-3.5 py-1.5 rounded-full bg-[#D6A65D] hover:bg-[#c9984e] text-[#173D32] text-xs font-bold shadow-xs transition-all inline-flex items-center gap-1.5"
          >
            <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Report Hazard</span>
          </Link>
          <Link
            href="/citizen/safe-place"
            className="px-3.5 py-1.5 rounded-full bg-[#173D32] text-[#F6F4EC] text-xs font-bold hover:bg-[#1a4437] transition-all inline-flex items-center gap-1.5"
          >
            <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Safe Places</span>
          </Link>
        </div>
      }
    >
      <div className="space-y-6 sm:space-y-8 w-full">
        {/* ── 1. Top Community Summary Cards ────────────────────────────── */}
        <PortalMetricGrid columns={4} ariaLabel="Citizen Community Status">
          <PortalKpiCard
            id="citizen-resident-status"
            variant="summary"
            title="Resident Desk"
            value="Active"
            unit={user?.name ? user.name.split(" ")[0] : "Community"}
            icon={User}
            accent="green"
            badge="Receiving Alerts"
            badgeTone="green"
            detail="Connected to Northeast Hill Districts early warning feed"
            isLoading={false}
          />

          <PortalKpiCard
            id="citizen-active-warnings"
            variant="summary"
            title="Regional Advisories"
            value={alertsCount}
            unit={`${criticalAlertsCount} Critical`}
            icon={Bell}
            accent={criticalAlertsCount > 0 ? "red" : "amber"}
            badge={criticalAlertsCount > 0 ? "Red Alert" : "Monitored"}
            badgeTone={criticalAlertsCount > 0 ? "red" : "amber"}
            detail="Live landslide and heavy rainfall warnings"
            isLoading={isLoading}
          />

          <PortalKpiCard
            id="citizen-road-advisories"
            variant="summary"
            title="Impacted Highways"
            value={impactedRoadsCount}
            unit="Corridors"
            icon={Road}
            accent={impactedRoadsCount > 0 ? "amber" : "green"}
            badge={impactedRoadsCount > 0 ? "Caution / Blocked" : "Open"}
            badgeTone={impactedRoadsCount > 0 ? "amber" : "green"}
            detail="Arterial stretches under clearance or caution"
            isLoading={isLoading}
          />

          <PortalKpiCard
            id="citizen-evacuation-shelters"
            variant="summary"
            title="Verified Shelters"
            value={4}
            unit="Safe Centers"
            icon={ShieldCheck}
            accent="blue"
            badge="Operational"
            badgeTone="blue"
            detail="High-ground community relief shelters ready"
            isLoading={false}
          />
        </PortalMetricGrid>

        {/* ── 2. Community Workspaces Grid ──────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {communityModules.map((mod) => {
            const Icon = mod.icon;
            return (
              <div
                key={mod.id}
                className="p-5 sm:p-6 bg-[#FAF8F2] rounded-2xl sm:rounded-3xl border border-[#173D32]/12 shadow-xs flex flex-col justify-between transition-all hover:border-[#173D32]/25"
              >
                <div>
                  <div className="flex items-center justify-between gap-3 mb-3.5">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${mod.iconBg}`}
                      aria-hidden="true"
                    >
                      <Icon className="w-5 h-5" strokeWidth={2} />
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-white border border-[#173D32]/12 text-[10px] font-bold uppercase tracking-wider text-[#173D32]/70">
                      {mod.eyebrow}
                    </span>
                  </div>
                  <h3 className="text-base font-extrabold text-[#173D32]">
                    {mod.title}
                  </h3>
                  <p className="text-xs text-[#173D32]/75 mt-1.5 leading-relaxed">
                    {mod.description}
                  </p>
                </div>

                <div className="mt-5 pt-4 border-t border-[#173D32]/10 flex items-center justify-between gap-3">
                  <Link
                    href={mod.secondaryHref}
                    className="text-[11px] font-bold text-[#173D32]/70 hover:text-[#173D32] hover:underline"
                  >
                    {mod.secondaryLabel}
                  </Link>
                  <Link
                    href={mod.href}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#173D32] text-[#F6F4EC] text-xs font-bold hover:bg-[#1a4437] transition-all shadow-2xs"
                  >
                    <span>{mod.cta}</span>
                    <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── 3. Emergency Hotline Banner ───────────────────────────────── */}
        <div className="p-5 rounded-2xl sm:rounded-3xl bg-[#EAF0E6]/75 border border-[#173D32]/15 text-[#173D32] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#FDECEC] text-[#C52936] flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-[#173D32]">
                Emergency Disaster Helplines
              </h4>
              <p className="text-xs text-[#173D32]/80 mt-0.5">
                SDMA Emergency Control Room: <strong>1070</strong> · District
                Disaster Line: <strong>1077</strong> · National Emergency
                Response: <strong>112</strong>
              </p>
            </div>
          </div>

          <a
            href="tel:1070"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#173D32] bg-white px-4 py-2 rounded-full border border-[#173D32]/15 hover:bg-[#FAF8F2] transition-colors shrink-0 self-start sm:self-center shadow-2xs"
          >
            <PhoneCall className="w-3.5 h-3.5 text-[#1E7A45]" aria-hidden="true" />
            <span>Toll-Free 24×7</span>
          </a>
        </div>
      </div>
    </PortalLayout>
  );
}
