"use client";

import React, { useId, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Building2,
  CheckCircle2,
  ClipboardList,
  CloudRain,
  Home,
  LayoutGrid,
  Map,
  MapPin,
  Megaphone,
  Phone,
  PhoneCall,
  Route,
  Search,
  Users,
  X,
} from "lucide-react";
import { VillageItem } from "@/types/village";
import { PublicAlertItem, HazardReportOutput } from "@/types/public";
import StatusBadge from "@/components/ui/StatusBadge";
import VillageRiskBadge from "@/components/officer/VillageRiskBadge";

interface VillageDetailPanelProps {
  village: VillageItem | null;
  activeAlerts: PublicAlertItem[];
  reportedIssues: HazardReportOutput[];
  onClose?: () => void;
}

type DossierTab = "overview" | "alerts" | "shelters" | "contact";

export default function VillageDetailPanel({
  village,
  activeAlerts,
  reportedIssues,
  onClose,
}: VillageDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<DossierTab>("overview");
  const uid = useId().replace(/:/g, "");
  const hillBackGradId = `dossier-hill-back-${uid}`;
  const hillMidGradId = `dossier-hill-mid-${uid}`;
  const hillFrontGradId = `dossier-hill-front-${uid}`;

  if (!village) {
    return (
      <div className="bg-[#FCFBF8] border border-[#173D32]/12 rounded-2xl p-8 shadow-[0_2px_10px_-3px_rgba(23,61,50,0.06)] text-center flex flex-col items-center justify-center min-h-[420px]">
        <div className="w-14 h-14 rounded-2xl bg-[#EAF0E6] border border-[#173D32]/10 flex items-center justify-center text-[#173D32] mb-3.5">
          <Home className="w-6 h-6" />
        </div>
        <h3 className="text-base font-extrabold text-[#173D32]">
          Select a Settlement to Inspect
        </h3>
        <p className="text-xs text-[#173D32]/65 max-w-xs mt-1.5 leading-relaxed">
          Click any settlement row in the directory to inspect population readiness,
          active alerts, evacuation corridors, and designated relief shelters.
        </p>
      </div>
    );
  }

  const getRouteStatusBadge = (status?: string) => {
    switch (status) {
      case "blocked":
        return {
          label: "Blocked",
          className: "bg-[#FDE8E8] text-[#B91C1C] border-red-200",
        };
      case "caution":
        return {
          label: "Caution",
          className: "bg-[#FEEFD6] text-[#9A5B06] border-amber-200",
        };
      case "restricted":
        return {
          label: "Restricted",
          className: "bg-orange-100 text-orange-800 border-orange-200",
        };
      case "clear":
        return {
          label: "Clear / Open",
          className: "bg-[#DCFCE7] text-[#166534] border-emerald-200",
        };
      default:
        return {
          label: "Status Pending",
          className: "bg-gray-100 text-gray-700 border-gray-200",
        };
    }
  };

  const routeStatus = getRouteStatusBadge(village.evacuationRoute?.status);

  return (
    <div className="bg-[#FCFBF8] border border-[#173D32]/12 rounded-2xl shadow-[0_2px_10px_-3px_rgba(23,61,50,0.06)] overflow-hidden flex flex-col justify-between transition-all">
      <div>
        {/* ── Dossier Header with Misty Hills & Pine Artwork ───────────────── */}
        <div className="relative overflow-hidden bg-[#FAF8F2] px-5 pt-5 pb-4 border-b border-[#173D32]/10">
          <svg
            viewBox="0 0 420 130"
            preserveAspectRatio="xMaxYMax slice"
            aria-hidden="true"
            className="pointer-events-none select-none absolute right-0 bottom-0 h-full w-[78%] opacity-90"
          >
            <defs>
              <linearGradient id={hillBackGradId} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#DCE8D4" stopOpacity="0" />
                <stop offset="45%" stopColor="#C4D8C1" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#9AB8A2" stopOpacity="0.52" />
              </linearGradient>
              <linearGradient id={hillMidGradId} x1="5%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#B8CEB6" stopOpacity="0" />
                <stop offset="55%" stopColor="#7EA388" stopOpacity="0.32" />
                <stop offset="100%" stopColor="#4F775C" stopOpacity="0.58" />
              </linearGradient>
              <linearGradient id={hillFrontGradId} x1="15%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#4D775A" stopOpacity="0" />
                <stop offset="55%" stopColor="#2E5942" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#173D32" stopOpacity="0.72" />
              </linearGradient>
            </defs>
            <path
              d="M 40 130 Q 140 58, 235 84 T 420 40 L 420 130 Z"
              fill={`url(#${hillBackGradId})`}
            />
            <path
              d="M 110 130 Q 210 74, 305 94 T 420 62 L 420 130 Z"
              fill={`url(#${hillMidGradId})`}
            />
            <path
              d="M 190 130 Q 285 96, 355 104 L 420 88 L 420 130 Z"
              fill={`url(#${hillFrontGradId})`}
            />
            <g fill="#234F3A" fillOpacity="0.65">
              <polygon points="348,118 353,94 358,118" />
              <polygon points="359,120 366,86 373,120" />
              <polygon points="361,102 366,78 371,102" />
              <polygon points="376,122 382,92 388,122" />
              <polygon points="390,122 397,82 404,122" />
              <polygon points="392,102 397,74 402,102" />
              <polygon points="406,122 412,92 418,122" />
            </g>
          </svg>

          {/* Top Meta & Status Badges */}
          <div className="relative z-10 flex items-center justify-between gap-2 flex-wrap">
            <span className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-[#173D32]/65 whitespace-nowrap">
              VILLAGE DOSSIER &bull; {village.id}
            </span>

            <div className="flex items-center gap-1.5 flex-wrap">
              <VillageRiskBadge
                level={village.currentRiskLevel}
                showRiskSuffix
                compact
              />

              {activeAlerts.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold leading-none bg-[#EA5B5B] text-white shadow-2xs whitespace-nowrap">
                  <Bell className="w-3 h-3 shrink-0" aria-hidden="true" />
                  <span>
                    {activeAlerts.length} Active{" "}
                    {activeAlerts.length === 1 ? "Alert" : "Alerts"}
                  </span>
                </span>
              )}

              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-full bg-white/90 border border-[#173D32]/12 hover:bg-white text-[#173D32]/70 hover:text-[#173D32] transition-colors cursor-pointer shrink-0"
                  aria-label="Close detail panel"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Settlement Title & Location */}
          <h3 className="relative z-10 text-2xl sm:text-[26px] font-extrabold text-[#173D32] tracking-tight leading-tight mt-2">
            {village.name}
          </h3>

          <div className="relative z-10 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-[#173D32]/75 font-medium mt-1.5">
            <span className="inline-flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-[#173D32]/70 shrink-0" aria-hidden="true" />
              <span>
                {village.district} District, {village.state}
              </span>
            </span>
            <span className="text-[#173D32]/25" aria-hidden="true">
              |
            </span>
            <span>
              Corridor:{" "}
              <strong className="font-bold text-[#173D32]">{village.corridor}</strong>
            </span>
          </div>
        </div>

        {/* ── Tab Bar (4 Clean Tabs Matching Reference) ─────────────────────── */}
        <div
          role="tablist"
          aria-label="Village Dossier Sections"
          className="px-4 pt-3.5 pb-1 flex flex-wrap sm:flex-nowrap items-center justify-start sm:justify-between gap-1.5 overflow-x-auto"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "overview"}
            onClick={() => setActiveTab("overview")}
            className={`px-2 py-1.5 rounded-xl text-[11px] transition-all whitespace-nowrap inline-flex items-center gap-1 cursor-pointer shrink-0 ${
              activeTab === "overview"
                ? "bg-[#173D32] text-[#F6F4EC] font-bold shadow-xs"
                : "text-[#173D32]/80 hover:text-[#173D32] hover:bg-[#173D32]/6 font-semibold"
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>Overview</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "alerts"}
            onClick={() => setActiveTab("alerts")}
            className={`px-2 py-1.5 rounded-xl text-[11px] transition-all whitespace-nowrap inline-flex items-center gap-1 cursor-pointer shrink-0 ${
              activeTab === "alerts"
                ? "bg-[#173D32] text-[#F6F4EC] font-bold shadow-xs"
                : "text-[#173D32]/80 hover:text-[#173D32] hover:bg-[#173D32]/6 font-semibold"
            }`}
          >
            <Bell className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>Alerts</span>
            <span
              className={`min-w-[16px] h-[16px] px-1 rounded-full text-[9.5px] font-extrabold inline-flex items-center justify-center leading-none ${
                activeAlerts.length > 0
                  ? "bg-[#DC2626] text-white"
                  : activeTab === "alerts"
                    ? "bg-white/20 text-white"
                    : "bg-[#173D32]/10 text-[#173D32]/75"
              }`}
            >
              {activeAlerts.length}
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "shelters"}
            onClick={() => setActiveTab("shelters")}
            className={`px-2 py-1.5 rounded-xl text-[11px] transition-all whitespace-nowrap inline-flex items-center gap-1 cursor-pointer shrink-0 ${
              activeTab === "shelters"
                ? "bg-[#173D32] text-[#F6F4EC] font-bold shadow-xs"
                : "text-[#173D32]/80 hover:text-[#173D32] hover:bg-[#173D32]/6 font-semibold"
            }`}
          >
            <Route className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>Shelters &amp; Routes</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "contact"}
            onClick={() => setActiveTab("contact")}
            className={`px-2 py-1.5 rounded-xl text-[11px] transition-all whitespace-nowrap inline-flex items-center gap-1 cursor-pointer shrink-0 ${
              activeTab === "contact"
                ? "bg-[#173D32] text-[#F6F4EC] font-bold shadow-xs"
                : "text-[#173D32]/80 hover:text-[#173D32] hover:bg-[#173D32]/6 font-semibold"
            }`}
          >
            <Phone className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>Contact</span>
          </button>
        </div>

        {/* ── Tab Content Viewport ──────────────────────────────────────────── */}
        <div className="px-4 sm:px-5 py-3">
          {/* Tab 1: Overview */}
          {activeTab === "overview" && (
            <div className="space-y-3 text-xs">
              {/* Population & Readiness Card */}
              <div className="p-3.5 rounded-2xl bg-white border border-[#173D32]/12 shadow-[0_1px_4px_rgba(23,61,50,0.03)]">
                <h4 className="text-sm font-bold text-[#173D32] mb-3">
                  Population &amp; Readiness
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="p-2.5 sm:p-3 rounded-xl bg-[#FAF8F2] border border-[#173D32]/10 flex items-center gap-2.5">
                    <div
                      className="w-9 h-9 rounded-xl bg-[#DCE8D4]/80 text-[#173D32] flex items-center justify-center shrink-0"
                      aria-hidden="true"
                    >
                      <Users className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-lg sm:text-xl font-extrabold text-[#173D32] leading-none block tabular-nums">
                        {village.populationEstimate.toLocaleString()}
                      </span>
                      <span className="text-[10.5px] font-medium text-[#173D32]/65 block mt-1 whitespace-nowrap">
                        Registered residents
                      </span>
                    </div>
                  </div>

                  <div className="p-2.5 sm:p-3 rounded-xl bg-[#FAF8F2] border border-[#173D32]/10 flex items-center gap-2.5">
                    <div
                      className="w-9 h-9 rounded-xl bg-[#F3E9D2] text-[#8B6320] flex items-center justify-center shrink-0"
                      aria-hidden="true"
                    >
                      <Home className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-lg sm:text-xl font-extrabold text-[#173D32] leading-none block tabular-nums">
                        {village.householdsEstimate
                          ? village.householdsEstimate.toLocaleString()
                          : "Pending"}
                      </span>
                      <span className="text-[10.5px] font-medium text-[#173D32]/65 block mt-1 whitespace-nowrap">
                        {village.householdsEstimate
                          ? "Estimated households"
                          : "Census update pending"}
                      </span>
                    </div>
                  </div>
                </div>

                {village.vulnerableGroups ? (
                  <div className="mt-3 p-3 rounded-xl bg-[#EEF4EB] border border-[#173D32]/8 flex items-start gap-2.5 text-xs text-[#173D32]/85 leading-relaxed">
                    <Users
                      className="w-4 h-4 text-[#173D32] shrink-0 mt-0.5"
                      aria-hidden="true"
                    />
                    <p>
                      <strong className="font-bold text-[#173D32]">
                        High-Vulnerability Group:
                      </strong>{" "}
                      {village.vulnerableGroups.elderlyChildrenPct}% elderly &amp;
                      children. {village.vulnerableGroups.notes}
                    </p>
                  </div>
                ) : (
                  <div className="mt-3 p-3 rounded-xl bg-[#FAF8F2] border border-[#173D32]/8 text-[11px] text-[#173D32]/60 italic">
                    Demographic vulnerability breakdown pending field census audit.
                  </div>
                )}
              </div>

              {/* Telemetry & Location */}
              <div className="p-3.5 rounded-2xl bg-white border border-[#173D32]/12 shadow-[0_1px_4px_rgba(23,61,50,0.03)]">
                <h4 className="text-sm font-bold text-[#173D32] mb-2.5">
                  Telemetry &amp; Location
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="p-2.5 sm:p-3 rounded-xl bg-[#FAF8F2] border border-[#173D32]/10 flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded-xl bg-[#E2F1F8] text-[#17688A] flex items-center justify-center shrink-0"
                      aria-hidden="true"
                    >
                      <CloudRain className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-extrabold text-[#173D32] block">
                        {village.lastRainfall || "Sensor Offline"}
                      </span>
                      <span className="text-[10.5px] text-[#173D32]/60 block mt-0.5">
                        24h precipitation
                      </span>
                    </div>
                  </div>

                  <div className="p-2.5 sm:p-3 rounded-xl bg-[#FAF8F2] border border-[#173D32]/10 flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded-xl bg-[#DCE8D4]/75 text-[#173D32] flex items-center justify-center shrink-0"
                      aria-hidden="true"
                    >
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[11px] font-mono font-bold text-[#173D32] block break-words">
                        {village.coordinatesText || "Unsurveyed"}
                      </span>
                      <span className="text-[10.5px] text-[#173D32]/60 block mt-0.5">
                        GIS coordinates
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Alerts & Ground Reports */}
          {activeTab === "alerts" && (
            <div className="space-y-4 text-xs">
              <div className="space-y-3">
                {activeAlerts.length === 0 ? (
                  <div className="py-8 text-center p-6 rounded-2xl bg-white border border-[#173D32]/12 shadow-[0_1px_4px_rgba(23,61,50,0.03)]">
                    <div className="w-11 h-11 rounded-2xl bg-[#E2F4E8] text-[#1E7A45] flex items-center justify-center mx-auto mb-2.5">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <h4 className="font-bold text-[#173D32] text-sm">
                      No Active Alerts for This Settlement
                    </h4>
                    <p className="text-[11px] text-[#173D32]/60 mt-1 max-w-xs mx-auto">
                      No live landslide or severe hazard warnings affect{" "}
                      {village.name} or the adjacent {village.corridor} sector.
                    </p>
                  </div>
                ) : (
                  activeAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="p-4 rounded-2xl bg-white border border-[#173D32]/12 shadow-[0_1px_4px_rgba(23,61,50,0.03)] space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <StatusBadge
                          status={alert.severity}
                          size="xs"
                          pulse={alert.severity === "Critical"}
                        />
                        <span className="text-[10px] font-medium text-[#173D32]/60">
                          {new Date(alert.publishedAt).toLocaleDateString()}
                        </span>
                      </div>

                      <h4 className="font-extrabold text-[#173D32] text-sm leading-snug">
                        {alert.title}
                      </h4>

                      <p className="text-[11px] text-[#173D32]/80 leading-relaxed">
                        {alert.description}
                      </p>

                      {alert.advisory && (
                        <div className="p-2.5 rounded-xl bg-amber-50/80 border border-amber-200/80 text-[11px] text-amber-900">
                          <span className="font-bold">Official Advisory: </span>
                          {alert.advisory}
                        </div>
                      )}

                      <div className="pt-2 border-t border-[#173D32]/8 flex items-center justify-between text-[10px] text-[#173D32]/65 font-medium">
                        <span>Corridor: {alert.corridor}</span>
                        <span>
                          Rainfall: {alert.rainfall24h || "Not reported"}
                        </span>
                      </div>
                    </div>
                  ))
                )}

                <Link
                  href="/officer/alerts"
                  className="w-full py-2.5 px-4 rounded-xl bg-[#173D32] text-[#F6F4EC] text-xs font-bold text-center hover:bg-[#1a4437] transition-all inline-flex items-center justify-center gap-1.5 shadow-2xs"
                >
                  <Megaphone className="w-3.5 h-3.5" />
                  <span>Broadcast New Advisory for {village.name}</span>
                </Link>
              </div>

              {/* Ground Hazard Reports Section */}
              <div className="pt-3 border-t border-[#173D32]/10 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-[#173D32]">
                    Ground Hazard Reports
                  </h4>
                  <span className="px-2 py-0.5 rounded-full bg-[#173D32]/8 text-[#173D32] text-[10px] font-bold">
                    {reportedIssues.length}
                  </span>
                </div>

                {reportedIssues.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-white border border-[#173D32]/12 text-center">
                    <ClipboardList className="w-5 h-5 text-[#173D32]/45 mx-auto mb-1.5" />
                    <p className="text-[11px] text-[#173D32]/60">
                      No field hazard submissions logged for {village.name}.
                    </p>
                  </div>
                ) : (
                  reportedIssues.map((report) => (
                    <div
                      key={report.reportId}
                      className="p-3.5 rounded-2xl bg-white border border-[#173D32]/12 space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-[11px] text-[#173D32]">
                            {report.reportId}
                          </span>
                          <StatusBadge status={report.severity} size="xs" />
                        </div>
                        <StatusBadge status={report.status} size="xs" showDot={false} />
                      </div>
                      <h5 className="font-bold text-[#173D32] text-xs">
                        {report.hazardType}
                      </h5>
                      <p className="text-[11px] text-[#173D32]/75 leading-relaxed">
                        {report.description}
                      </p>
                    </div>
                  ))
                )}

                <Link
                  href="/officer/reports"
                  className="w-full py-2 px-4 rounded-xl bg-white border border-[#173D32]/15 text-[#173D32] text-xs font-bold text-center hover:bg-[#FAF8F2] transition-all inline-flex items-center justify-center gap-1.5"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Open Officer Reports Desk</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}

          {/* Tab 3: Shelters & Routes */}
          {activeTab === "shelters" && (
            <div className="space-y-3.5 text-xs">
              {/* Safe Evacuation Shelter */}
              <div className="p-4 rounded-2xl bg-white border border-[#173D32]/12 shadow-[0_1px_4px_rgba(23,61,50,0.03)]">
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <h4 className="text-sm font-bold text-[#173D32]">
                    Nearest Safe Shelter
                  </h4>
                  {village.safeShelter && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#DCFCE7] text-[#166534] inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{village.safeShelter.status || "Operational"}</span>
                    </span>
                  )}
                </div>

                {village.safeShelter ? (
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h5 className="font-bold text-sm text-[#173D32] inline-flex items-center gap-1.5">
                          <Building2 className="w-4 h-4 text-[#173D32]/75 shrink-0" />
                          <span>{village.safeShelter.name}</span>
                        </h5>
                        <p className="text-[11px] text-[#173D32]/70 mt-0.5">
                          {village.safeShelter.address}
                        </p>
                      </div>
                      <span className="text-xs font-bold text-[#173D32] px-2.5 py-1 rounded-full bg-[#FAF8F2] border border-[#173D32]/10 shrink-0">
                        {village.safeShelter.distanceKm} km away
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 text-[11px]">
                      <div className="p-2.5 rounded-xl bg-[#FAF8F2] border border-[#173D32]/10">
                        <span className="text-[#173D32]/60 block">Capacity</span>
                        <span className="font-extrabold text-[#173D32]">
                          {village.safeShelter.capacity} persons
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#FAF8F2] border border-[#173D32]/10">
                        <span className="text-[#173D32]/60 block">Type</span>
                        <span className="font-extrabold text-[#173D32]">
                          {village.safeShelter.type || "Community Facility"}
                        </span>
                      </div>
                    </div>

                    {village.safeShelter.amenities &&
                      village.safeShelter.amenities.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {village.safeShelter.amenities.map((amenity) => (
                            <span
                              key={amenity}
                              className="px-2.5 py-0.5 rounded-full bg-[#EEF4EB] border border-[#173D32]/10 text-[10px] font-semibold text-[#173D32] inline-flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3 h-3 text-[#1E7A45]" />
                              <span>{amenity}</span>
                            </span>
                          ))}
                        </div>
                      )}
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200/80 text-amber-900">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-xs block">
                          No Designated Shelter Recorded
                        </span>
                        <p className="text-[11px] text-amber-800/85 mt-0.5 leading-relaxed">
                          A designated emergency high-ground shelter has not yet been
                          surveyed or registered for {village.name}. Direct evacuees
                          to district staging centers.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Nearest Evacuation Route */}
              <div className="p-4 rounded-2xl bg-white border border-[#173D32]/12 shadow-[0_1px_4px_rgba(23,61,50,0.03)]">
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <h4 className="text-sm font-bold text-[#173D32]">
                    Evacuation Route
                  </h4>
                  {village.evacuationRoute && (
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${routeStatus.className}`}
                    >
                      {routeStatus.label}
                    </span>
                  )}
                </div>

                {village.evacuationRoute ? (
                  <div className="space-y-2.5">
                    <h5 className="font-bold text-sm text-[#173D32] inline-flex items-center gap-1.5">
                      <Route className="w-4 h-4 text-[#173D32]/75 shrink-0" />
                      <span>{village.evacuationRoute.name}</span>
                    </h5>
                    <p className="text-[11px] text-[#173D32]/70 leading-relaxed">
                      {village.evacuationRoute.bypassStretch}
                    </p>

                    <div className="grid grid-cols-2 gap-2.5 text-[11px] pt-1">
                      <div className="p-2.5 rounded-xl bg-[#FAF8F2] border border-[#173D32]/10">
                        <span className="text-[#173D32]/60 block">Distance</span>
                        <span className="font-extrabold text-[#173D32]">
                          {village.evacuationRoute.distanceKm} km (Est.{" "}
                          {village.evacuationRoute.estimatedTransitTime})
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#FAF8F2] border border-[#173D32]/10">
                        <span className="text-[#173D32]/60 block">Corridor</span>
                        <span className="font-extrabold text-[#173D32]">
                          {village.evacuationRoute.corridor}
                        </span>
                      </div>
                    </div>

                    {village.evacuationRoute.vehicleEligibility && (
                      <div className="p-2.5 rounded-xl bg-[#FAF8F2] border border-[#173D32]/10 text-[11px] text-[#173D32]">
                        <span className="font-bold">Vehicle Restrictions: </span>
                        {village.evacuationRoute.vehicleEligibility}
                      </div>
                    )}

                    {village.evacuationRoute.advisoryNote && (
                      <p className="text-[10px] text-[#173D32]/70 italic mt-1">
                        Note: {village.evacuationRoute.advisoryNote}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200/80 text-amber-900">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-xs block">
                          Evacuation Corridor Unmapped
                        </span>
                        <p className="text-[11px] text-amber-800/85 mt-0.5 leading-relaxed">
                          No certified emergency diversion or bypass route is currently
                          cataloged for this village sector. Field survey clearance
                          required.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 4: Contact */}
          {activeTab === "contact" && (
            <div className="space-y-3.5 text-xs">
              <div className="p-4 rounded-2xl bg-white border border-[#173D32]/12 shadow-[0_1px_4px_rgba(23,61,50,0.03)]">
                <h4 className="text-sm font-bold text-[#173D32] mb-3">
                  Village Point of Contact
                </h4>

                {village.contactPerson ? (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-[#FAF8F2] border border-[#173D32]/10">
                    <div>
                      <span className="font-extrabold text-sm text-[#173D32] block">
                        {village.contactPerson.name}
                      </span>
                      <span className="text-[11px] font-medium text-[#173D32]/65 block mt-0.5">
                        {village.contactPerson.designation}
                      </span>
                      <span className="text-xs font-mono font-bold text-[#173D32] block mt-1.5">
                        {village.contactPerson.phone}
                      </span>
                    </div>

                    <a
                      href={`tel:${village.contactPerson.phone}`}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#173D32] hover:bg-[#1a4437] text-[#F6F4EC] text-xs font-bold transition-all shadow-2xs shrink-0"
                    >
                      <PhoneCall className="w-3.5 h-3.5" />
                      <span>Call Liaison</span>
                    </a>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200/80 text-amber-900">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-xs block">
                          No Contact Person Assigned
                        </span>
                        <p className="text-[11px] text-amber-800/85 mt-0.5 leading-relaxed">
                          No village elder or disaster committee liaison is currently
                          registered in the directory for this settlement.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {village.safeShelter?.helpline && (
                <div className="p-4 rounded-2xl bg-white border border-[#173D32]/12 shadow-[0_1px_4px_rgba(23,61,50,0.03)]">
                  <h4 className="text-sm font-bold text-[#173D32] mb-3">
                    Shelter &amp; District Control Desk
                  </h4>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-[#FAF8F2] border border-[#173D32]/10">
                    <div>
                      <span className="font-bold text-xs text-[#173D32] block">
                        {village.safeShelter.name}
                      </span>
                      <span className="text-[11px] text-[#173D32]/65 block mt-0.5">
                        {village.district} District Emergency Helpline
                      </span>
                      <span className="text-xs font-mono font-bold text-[#173D32] block mt-1.5">
                        {village.safeShelter.helpline}
                      </span>
                    </div>

                    <a
                      href={`tel:${village.safeShelter.helpline}`}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-[#173D32]/20 hover:bg-[#173D32]/5 text-[#173D32] text-xs font-bold transition-all shrink-0"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Call Desk</span>
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Footer Navigation Bar ─────────────────────────────────────────── */}
      <div className="px-5 py-3.5 border-t border-[#173D32]/10 bg-[#FAF8F2]/70 flex flex-wrap items-center justify-between gap-2 text-xs">
        <Link
          href="/officer/map"
          className="font-bold text-[#173D32] hover:underline inline-flex items-center gap-1.5"
        >
          <Map className="w-3.5 h-3.5" aria-hidden="true" />
          <span>View on GIS Map</span>
        </Link>
        <Link
          href="/officer/routes"
          className="font-bold text-[#173D32] hover:underline inline-flex items-center gap-1.5"
        >
          <Route className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Check Corridors</span>
          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
