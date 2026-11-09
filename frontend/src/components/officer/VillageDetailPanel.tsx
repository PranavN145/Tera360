"use client";

import React, { useState } from "react";
import Link from "next/link";
import { VillageItem } from "@/types/village";
import { PublicAlertItem, HazardReportOutput } from "@/types/public";

interface VillageDetailPanelProps {
  village: VillageItem | null;
  activeAlerts: PublicAlertItem[];
  reportedIssues: HazardReportOutput[];
  onClose?: () => void;
}

export default function VillageDetailPanel({
  village,
  activeAlerts,
  reportedIssues,
  onClose,
}: VillageDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<
    "overview" | "alerts" | "shelters" | "reports" | "history"
  >("overview");

  if (!village) {
    return (
      <div className="bg-[#FAF8F2] border border-[#173D32]/12 rounded-3xl p-8 shadow-xs text-center flex flex-col items-center justify-center min-h-[420px]">
        <div className="w-14 h-14 rounded-2xl bg-[#173D32]/5 flex items-center justify-center text-2xl mb-3">
          🏘️
        </div>
        <h3 className="text-base font-extrabold text-[#173D32]">
          Select a Village to Inspect
        </h3>
        <p className="text-xs text-[#173D32]/65 max-w-xs mt-1.5 leading-relaxed">
          Click any village row in the directory to inspect geotechnical risk
          history, active alerts, evacuation corridors, and designated relief
          shelters.
        </p>
      </div>
    );
  }

  const getRiskBadgeClass = (risk: string) => {
    switch (risk) {
      case "Critical":
        return "bg-red-100 text-red-800 border-red-200 ring-1 ring-red-300";
      case "High":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "Medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
    }
  };

  const getRouteStatusBadge = (status?: string) => {
    switch (status) {
      case "blocked":
        return {
          label: "Blocked",
          className: "bg-red-100 text-red-800 border-red-200",
        };
      case "caution":
        return {
          label: "Caution",
          className: "bg-amber-100 text-amber-800 border-amber-200",
        };
      case "restricted":
        return {
          label: "Restricted",
          className: "bg-orange-100 text-orange-800 border-orange-200",
        };
      case "clear":
        return {
          label: "Clear / Open",
          className: "bg-emerald-100 text-emerald-800 border-emerald-200",
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
    <div className="bg-[#FAF8F2] border border-[#173D32]/12 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col justify-between transition-all">
      {/* Header Section */}
      <div>
        <div className="flex items-start justify-between gap-3 pb-4 border-b border-[#173D32]/10">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#173D32]/60">
                Village Dossier · ID: {village.id}
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${getRiskBadgeClass(
                  village.currentRiskLevel
                )}`}
              >
                {village.currentRiskLevel} Risk
              </span>
              {activeAlerts.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-600 text-white animate-pulse">
                  {activeAlerts.length} Active{" "}
                  {activeAlerts.length === 1 ? "Alert" : "Alerts"}
                </span>
              )}
            </div>

            <h3 className="text-xl sm:text-2xl font-black text-[#173D32]">
              {village.name}
            </h3>
            <p className="text-xs text-[#173D32]/75 font-medium mt-0.5">
              {village.district} District · {village.state} · Corridor:{" "}
              <span className="font-bold text-[#173D32]">
                {village.corridor}
              </span>
            </p>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-[#173D32]/10 text-[#173D32]/70 hover:text-[#173D32] transition-colors cursor-pointer"
              aria-label="Close detail panel"
            >
              ✕
            </button>
          )}
        </div>

        {/* Quick Nav Tabs */}
        <div className="flex items-center gap-1 my-4 pb-1 border-b border-[#173D32]/8 overflow-x-auto text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "overview"
                ? "bg-[#173D32] text-[#F6F4EC] shadow-2xs"
                : "text-[#173D32]/70 hover:bg-[#173D32]/5"
            }`}
          >
            Overview & Contact
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("alerts")}
            className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              activeTab === "alerts"
                ? "bg-[#173D32] text-[#F6F4EC] shadow-2xs"
                : "text-[#173D32]/70 hover:bg-[#173D32]/5"
            }`}
          >
            <span>Alerts</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                activeAlerts.length > 0
                  ? "bg-red-500 text-white font-extrabold"
                  : "bg-[#173D32]/10 text-[#173D32]"
              }`}
            >
              {activeAlerts.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("shelters")}
            className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "shelters"
                ? "bg-[#173D32] text-[#F6F4EC] shadow-2xs"
                : "text-[#173D32]/70 hover:bg-[#173D32]/5"
            }`}
          >
            Shelters & Routes
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("reports")}
            className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              activeTab === "reports"
                ? "bg-[#173D32] text-[#F6F4EC] shadow-2xs"
                : "text-[#173D32]/70 hover:bg-[#173D32]/5"
            }`}
          >
            <span>Field Reports</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                reportedIssues.length > 0
                  ? "bg-blue-600 text-white font-extrabold"
                  : "bg-[#173D32]/10 text-[#173D32]"
              }`}
            >
              {reportedIssues.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "history"
                ? "bg-[#173D32] text-[#F6F4EC] shadow-2xs"
                : "text-[#173D32]/70 hover:bg-[#173D32]/5"
            }`}
          >
            Risk History
          </button>
        </div>

        {/* Tab 1: Overview & Contact */}
        {activeTab === "overview" && (
          <div className="space-y-4 text-xs">
            {/* Population Information Card */}
            <div className="p-4 rounded-2xl bg-[#F6F4EC] border border-[#173D32]/10">
              <span className="text-[10px] font-black uppercase text-[#173D32]/60 tracking-wider block mb-2">
                Population & Settlement Readiness
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-2.5 rounded-xl bg-white/70 border border-[#173D32]/10">
                  <span className="text-[11px] text-[#173D32]/60 block font-medium">
                    Population Estimate
                  </span>
                  <span className="text-lg font-black text-[#173D32] block">
                    👥 {village.populationEstimate.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-[#173D32]/60 block mt-0.5">
                    registered residents
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-white/70 border border-[#173D32]/10">
                  <span className="text-[11px] text-[#173D32]/60 block font-medium">
                    Estimated Households
                  </span>
                  <span className="text-lg font-black text-[#173D32] block">
                    🏡{" "}
                    {village.householdsEstimate
                      ? village.householdsEstimate.toLocaleString()
                      : "Pending"}
                  </span>
                  <span className="text-[10px] text-[#173D32]/60 block mt-0.5">
                    {village.householdsEstimate
                      ? "dwelling units"
                      : "Census update pending"}
                  </span>
                </div>
              </div>

              {village.vulnerableGroups ? (
                <div className="mt-3 p-2.5 rounded-xl bg-white/50 border border-[#173D32]/8 text-[11px] text-[#173D32]/80 leading-relaxed">
                  <span className="font-extrabold text-[#173D32]">
                    High-Vulnerability Group:{" "}
                  </span>
                  {village.vulnerableGroups.elderlyChildrenPct}% elderly &
                  children. {village.vulnerableGroups.notes}
                </div>
              ) : (
                <div className="mt-3 p-2.5 rounded-xl bg-white/30 text-[11px] text-[#173D32]/60 italic">
                  Demographic vulnerability breakdown pending field census
                  audit.
                </div>
              )}
            </div>

            {/* Contact Person Card */}
            <div className="p-4 rounded-2xl bg-[#F6F4EC] border border-[#173D32]/10">
              <span className="text-[10px] font-black uppercase text-[#173D32]/60 tracking-wider block mb-2">
                Designated Village Point of Contact
              </span>

              {village.contactPerson ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-white/80 border border-[#173D32]/10">
                  <div>
                    <span className="font-black text-sm text-[#173D32] block">
                      {village.contactPerson.name}
                    </span>
                    <span className="text-[11px] font-medium text-[#173D32]/70 block">
                      {village.contactPerson.designation}
                    </span>
                    <span className="text-xs font-mono font-bold text-[#173D32] block mt-1">
                      {village.contactPerson.phone}
                    </span>
                  </div>

                  <a
                    href={`tel:${village.contactPerson.phone}`}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#173D32] hover:bg-[#1a4437] text-[#F6F4EC] text-xs font-bold transition-all shadow-2xs shrink-0"
                  >
                    <span>📞</span> Call Liaison
                  </a>
                </div>
              ) : (
                /* Honest Unavailable State */
                <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 text-amber-900">
                  <div className="flex items-start gap-2">
                    <span className="text-base">⚠️</span>
                    <div>
                      <span className="font-bold text-xs block">
                        No Contact Person Assigned
                      </span>
                      <p className="text-[11px] text-amber-800/80 mt-0.5 leading-relaxed">
                        No village elder or disaster committee liaison is
                        currently registered in the directory for this
                        settlement.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Geospatial and Weather Telemetry */}
            <div className="p-4 rounded-2xl bg-[#F6F4EC] border border-[#173D32]/10 grid grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] font-bold text-[#173D32]/60 block uppercase">
                  24h Precipitation
                </span>
                <span className="text-sm font-black text-[#173D32] mt-0.5 block">
                  🌧️ {village.lastRainfall || "Sensor Offline"}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-[#173D32]/60 block uppercase">
                  Coordinates
                </span>
                <span className="text-xs font-mono font-bold text-[#173D32] mt-0.5 block">
                  📍 {village.coordinatesText || "Unsurveyed"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Active Alerts */}
        {activeTab === "alerts" && (
          <div className="space-y-3 text-xs">
            {activeAlerts.length === 0 ? (
              <div className="py-10 text-center p-6 rounded-2xl bg-[#F6F4EC] border border-[#173D32]/8">
                <span className="text-3xl block mb-2">🟢</span>
                <h4 className="font-extrabold text-[#173D32] text-sm">
                  No Active Alerts for This Settlement
                </h4>
                <p className="text-[11px] text-[#173D32]/60 mt-1 max-w-xs mx-auto">
                  No live landslide or severe hazard warnings have been issued
                  affecting {village.name} or adjacent {village.corridor} sector.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="p-4 rounded-2xl bg-white border border-[#173D32]/12 shadow-2xs space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          alert.severity === "Critical"
                            ? "bg-red-100 text-red-800 border border-red-200"
                            : "bg-amber-100 text-amber-800 border border-amber-200"
                        }`}
                      >
                        {alert.severity} Alert
                      </span>
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
                ))}
              </div>
            )}

            <div className="pt-2">
              <Link
                href="/officer/alerts"
                className="w-full py-2.5 px-4 rounded-xl bg-[#173D32] text-[#F6F4EC] text-xs font-bold text-center hover:bg-[#1a4437] transition-all flex items-center justify-center gap-1.5"
              >
                <span>📢</span> Broadcast New Advisory for {village.name}
              </Link>
            </div>
          </div>
        )}

        {/* Tab 3: Shelters & Routes */}
        {activeTab === "shelters" && (
          <div className="space-y-4 text-xs">
            {/* Safe Evacuation Shelter */}
            <div className="p-4 rounded-2xl bg-[#F6F4EC] border border-[#173D32]/10">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[10px] font-black uppercase text-[#173D32]/60 tracking-wider block">
                  Nearest Designated Safe Shelter
                </span>
                {village.safeShelter && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800">
                    ✓ {village.safeShelter.status || "Operational"}
                  </span>
                )}
              </div>

              {village.safeShelter ? (
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-black text-sm text-[#173D32]">
                        🏫 {village.safeShelter.name}
                      </h4>
                      <p className="text-[11px] text-[#173D32]/70 mt-0.5">
                        {village.safeShelter.address}
                      </p>
                    </div>
                    <span className="text-xs font-black text-[#173D32] px-2 py-1 rounded-lg bg-white/70 border border-[#173D32]/10 shrink-0">
                      {village.safeShelter.distanceKm} km away
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2 rounded-lg bg-white/60">
                      <span className="text-[#173D32]/60 block">Capacity</span>
                      <span className="font-extrabold text-[#173D32]">
                        {village.safeShelter.capacity} persons
                      </span>
                    </div>
                    <div className="p-2 rounded-lg bg-white/60">
                      <span className="text-[#173D32]/60 block">Type</span>
                      <span className="font-extrabold text-[#173D32]">
                        {village.safeShelter.type || "Community Facility"}
                      </span>
                    </div>
                  </div>

                  {village.safeShelter.amenities &&
                    village.safeShelter.amenities.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {village.safeShelter.amenities.map((amenity) => (
                          <span
                            key={amenity}
                            className="px-2 py-0.5 rounded-md bg-white/80 border border-[#173D32]/10 text-[10px] font-medium text-[#173D32]"
                          >
                            ✓ {amenity}
                          </span>
                        ))}
                      </div>
                    )}
                </div>
              ) : (
                /* Honest Unavailable State */
                <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 text-amber-900">
                  <div className="flex items-start gap-2">
                    <span className="text-base">⚠️</span>
                    <div>
                      <span className="font-bold text-xs block">
                        No Designated Shelter Recorded
                      </span>
                      <p className="text-[11px] text-amber-800/80 mt-0.5 leading-relaxed">
                        A designated emergency high-ground shelter has not yet
                        been surveyed or registered for {village.name}.
                        Evacuees must be directed to district staging centers.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Nearest Evacuation Route */}
            <div className="p-4 rounded-2xl bg-[#F6F4EC] border border-[#173D32]/10">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[10px] font-black uppercase text-[#173D32]/60 tracking-wider block">
                  Designated Emergency Evacuation Route
                </span>
                {village.evacuationRoute && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${routeStatus.className}`}
                  >
                    {routeStatus.label}
                  </span>
                )}
              </div>

              {village.evacuationRoute ? (
                <div className="space-y-2">
                  <h4 className="font-black text-sm text-[#173D32]">
                    🛣️ {village.evacuationRoute.name}
                  </h4>
                  <p className="text-[11px] text-[#173D32]/70 leading-relaxed">
                    {village.evacuationRoute.bypassStretch}
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                    <div className="p-2 rounded-lg bg-white/60">
                      <span className="text-[#173D32]/60 block">Distance</span>
                      <span className="font-extrabold text-[#173D32]">
                        {village.evacuationRoute.distanceKm} km (Est.{" "}
                        {village.evacuationRoute.estimatedTransitTime})
                      </span>
                    </div>
                    <div className="p-2 rounded-lg bg-white/60">
                      <span className="text-[#173D32]/60 block">Corridor</span>
                      <span className="font-extrabold text-[#173D32]">
                        {village.evacuationRoute.corridor}
                      </span>
                    </div>
                  </div>

                  {village.evacuationRoute.vehicleEligibility && (
                    <div className="p-2.5 rounded-xl bg-white/60 border border-[#173D32]/8 text-[11px] text-[#173D32]">
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
                /* Honest Unavailable State */
                <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 text-amber-900">
                  <div className="flex items-start gap-2">
                    <span className="text-base">⚠️</span>
                    <div>
                      <span className="font-bold text-xs block">
                        Evacuation Corridor Unmapped
                      </span>
                      <p className="text-[11px] text-amber-800/80 mt-0.5 leading-relaxed">
                        No certified emergency diversion or bypass route is
                        currently cataloged for this village sector. Field survey
                        clearance required.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 4: Reported Issues */}
        {activeTab === "reports" && (
          <div className="space-y-3 text-xs">
            {reportedIssues.length === 0 ? (
              <div className="py-10 text-center p-6 rounded-2xl bg-[#F6F4EC] border border-[#173D32]/8">
                <span className="text-3xl block mb-2">📋</span>
                <h4 className="font-extrabold text-[#173D32] text-sm">
                  No Ground Hazard Reports Logged
                </h4>
                <p className="text-[11px] text-[#173D32]/60 mt-1 max-w-xs mx-auto">
                  No community or field hazard submissions currently match{" "}
                  {village.name} or {village.district} District.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {reportedIssues.map((report) => (
                  <div
                    key={report.reportId}
                    className="p-4 rounded-2xl bg-white border border-[#173D32]/12 shadow-2xs space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-[#173D32]">
                          {report.reportId}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            report.severity === "Critical"
                              ? "bg-red-100 text-red-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {report.severity}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded-md bg-[#173D32]/10 text-[#173D32] text-[10px] font-bold capitalize">
                        {report.status.replace("_", " ")}
                      </span>
                    </div>

                    <h4 className="font-extrabold text-[#173D32] text-sm">
                      {report.hazardType}
                    </h4>

                    <p className="text-[11px] text-[#173D32]/80 leading-relaxed">
                      {report.description}
                    </p>

                    <div className="pt-2 border-t border-[#173D32]/8 flex items-center justify-between text-[10px] text-[#173D32]/65">
                      <span>Location: {report.location}</span>
                      <span>
                        {new Date(report.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2">
              <Link
                href="/officer/reports"
                className="w-full py-2.5 px-4 rounded-xl bg-white border border-[#173D32]/20 text-[#173D32] text-xs font-bold text-center hover:bg-[#FAF8F2] transition-all flex items-center justify-center gap-1.5"
              >
                <span>🔎</span> Open Officer Reports Desk →
              </Link>
            </div>
          </div>
        )}

        {/* Tab 5: Risk History */}
        {activeTab === "history" && (
          <div className="space-y-3 text-xs">
            {village.riskHistory && village.riskHistory.length > 0 ? (
              <div className="relative pl-4 space-y-4 before:content-[''] before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#173D32]/20">
                {village.riskHistory.map((item, idx) => (
                  <div key={idx} className="relative group">
                    <div className="absolute -left-[17px] top-1 w-2.5 h-2.5 rounded-full bg-[#173D32] ring-4 ring-[#FAF8F2]" />
                    <div className="p-3 rounded-xl bg-[#F6F4EC] border border-[#173D32]/10">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${getRiskBadgeClass(
                            item.level
                          )}`}
                        >
                          {item.level} Risk
                        </span>
                        <span className="text-[10px] font-mono text-[#173D32]/60">
                          {item.date}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#173D32] font-medium leading-relaxed">
                        {item.trigger}
                      </p>
                      {item.source && (
                        <span className="text-[10px] text-[#173D32]/60 block mt-1">
                          Source: {item.source}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Honest Unavailable State */
              <div className="py-8 text-center p-6 rounded-2xl bg-[#F6F4EC] border border-[#173D32]/8">
                <span className="text-2xl block mb-2">📜</span>
                <h4 className="font-extrabold text-[#173D32] text-xs">
                  No Historical Audits Recorded
                </h4>
                <p className="text-[11px] text-[#173D32]/60 mt-1">
                  Historical telemetry and hazard audits have not been logged
                  for this settlement.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Navigation Bar */}
      <div className="mt-6 pt-4 border-t border-[#173D32]/10 flex items-center justify-between text-xs">
        <Link
          href={`/officer/map`}
          className="font-bold text-[#173D32] hover:underline flex items-center gap-1"
        >
          <span>🗺️</span> View on GIS Map
        </Link>
        <Link
          href={`/officer/routes`}
          className="font-bold text-[#173D32] hover:underline flex items-center gap-1"
        >
          <span>🛣️</span> Check Corridors →
        </Link>
      </div>
    </div>
  );
}
