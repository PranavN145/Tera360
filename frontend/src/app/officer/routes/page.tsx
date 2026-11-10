"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { officerApi } from "@/lib/api";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  Compass,
  MapPin,
  Megaphone,
  Route,
  ShieldCheck,
  Truck,
} from "lucide-react";
import PortalLayout from "@/components/portal/PortalLayout";
import PortalMetricGrid from "@/components/portal/PortalMetricGrid";
import PortalSplitLayout from "@/components/portal/PortalSplitLayout";
import OfficerKpiCard from "@/components/officer/OfficerKpiCard";
import StatusBadge from "@/components/ui/StatusBadge";

interface SafeRouteItem {
  id: string;
  name: string;
  state: string;
  primaryCorridor: string;
  bypassStretch: string;
  status: "clear" | "caution" | "restricted";
  distanceKm: number;
  estimatedTransitTime: string;
  vehicleEligibility: string;
  lastInspected: string;
  advisoryNote: string;
}

const EMERGENCY_SAFE_ROUTES: SafeRouteItem[] = [
  {
    id: "SR-01",
    name: "Peducha – Tsiesema Emergency Bypass",
    state: "Nagaland",
    primaryCorridor: "NH-29",
    bypassStretch: "KM 34 to KM 56 via Old Medziphema Range",
    status: "clear",
    distanceKm: 32,
    estimatedTransitTime: "1h 15m",
    vehicleEligibility: "Light Motor Vehicles (LMVs) & Emergency Ambulances Only",
    lastInspected: "Today, 09:30 AM",
    advisoryNote: "Bypasses the critical Dzüdza River landslide zone. Surface paved with single-lane gravel shoulders.",
  },
  {
    id: "SR-02",
    name: "Melli – Jorethang – Rangpo River Route",
    state: "Sikkim",
    primaryCorridor: "NH-10",
    bypassStretch: "Teesta Valley to South Sikkim Link",
    status: "caution",
    distanceKm: 48,
    estimatedTransitTime: "2h 10m",
    vehicleEligibility: "All vehicles under 12-tonne Gross Weight",
    lastInspected: "Today, 08:00 AM",
    advisoryNote: "Bypasses the Sevoke 29th Mile rockfall corridor. Pilot convoy escort required after sunset.",
  },
  {
    id: "SR-03",
    name: "Umrangso – Lanka Strategic Connection",
    state: "Assam",
    primaryCorridor: "NH-27",
    bypassStretch: "Dima Hasao to West Karbi Anglong Line",
    status: "clear",
    distanceKm: 64,
    estimatedTransitTime: "1h 50m",
    vehicleEligibility: "All Highway Traffic & Heavy Essential Freight",
    lastInspected: "Yesterday, 04:00 PM",
    advisoryNote: "Alternative transit corridor avoiding Jatinga cut-slope instability. Full dual-lane operational.",
  },
];

function getRouteStatusBarClass(status: SafeRouteItem["status"]): string {
  switch (status) {
    case "clear":
      return "bg-[#1E7A45]";
    case "caution":
      return "bg-[#D97706]";
    default:
      return "bg-[#DC2626]";
  }
}

export default function OfficerRoutesPage() {
  const [routesList, setRoutesList] = useState<SafeRouteItem[]>(EMERGENCY_SAFE_ROUTES);
  const [selectedRoute, setSelectedRoute] = useState<SafeRouteItem>(EMERGENCY_SAFE_ROUTES[0]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function loadRoutes() {
      try {
        setIsLoading(true);
        const data = await officerApi.listSafeRoutes();
        if (mounted && Array.isArray(data) && data.length > 0) {
          const mapped: SafeRouteItem[] = data.map((d: any, idx: number) => ({
            id: d.id || d._id || `SR-0${idx + 1}`,
            name: d.name || d.corridor || "Emergency Route",
            state: d.state || "Northeast",
            primaryCorridor: d.primaryCorridor || d.corridor || "NH Corridor",
            bypassStretch: d.bypassStretch || d.description || "Designated safe bypass corridor",
            status: d.status === "blocked" ? "restricted" : d.status === "restricted" ? "caution" : "clear",
            distanceKm: d.distanceKm || 35,
            estimatedTransitTime: d.estimatedTransitTime || "1h 30m",
            vehicleEligibility: d.vehicleEligibility || "LMVs & Emergency Ambulances",
            lastInspected: d.lastInspected ? new Date(d.lastInspected).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Today, 09:00 AM",
            advisoryNote: d.advisoryNote || d.notes || "Emergency diversion active.",
          }));
          setRoutesList(mapped);
          setSelectedRoute(mapped[0]);
        }
      } catch (err) {
        console.warn("Failed to load live safe routes, using defaults:", err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    loadRoutes();
    return () => {
      mounted = false;
    };
  }, []);

  const totalRoutes = routesList.length;
  const clearCount = routesList.filter((r) => r.status === "clear").length;
  const cautionCount = routesList.filter((r) => r.status === "caution").length;
  const heavyTransitCount = routesList.filter((r) =>
    r.vehicleEligibility.toLowerCase().includes("heavy") || r.vehicleEligibility.toLowerCase().includes("all highway")
  ).length;

  return (
    <PortalLayout
      allowedRoles={["officer", "admin"]}
      title="Safe Routes & Emergency Bypasses"
      subtitle="Supervise certified emergency diversion corridors, clearance authorizations, and heavy transit restrictions."
      headerActions={
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/officer/roads"
            className="px-3.5 py-1.5 rounded-full bg-white hover:bg-[#173D32]/5 border border-[#173D32]/15 text-[#173D32] text-xs font-bold transition-all inline-flex items-center gap-1.5 shadow-2xs"
          >
            <Route className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Check Road Impact</span>
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </Link>
          <Link
            href="/officer/dashboard"
            className="px-3.5 py-1.5 rounded-full bg-[#173D32] text-[#F6F4EC] text-xs font-bold hover:bg-[#1a4437] transition-all inline-flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Dashboard</span>
          </Link>
        </div>
      }
    >
      <div className="space-y-6 sm:space-y-8 w-full">
        {/* ── 1. Top Summary Metric Cards (4-column responsive grid) ── */}
        <PortalMetricGrid columns={4} ariaLabel="Emergency Routes Summary">
          <OfficerKpiCard
            id="metric-total-bypasses"
            variant="summary"
            title="Emergency Bypasses"
            value={totalRoutes}
            unit="Certified Corridors"
            icon={Compass}
            badge="Certified Grid"
            badgeTone="neutral"
            detail="Designated alternate routes for critical highway closures"
          />

          <OfficerKpiCard
            id="metric-clear-bypasses"
            variant="summary"
            title="Clear & Operational"
            value={clearCount}
            unit="Immediate Transit"
            icon={CheckCircle2}
            accent="green"
            badge="Open Passage"
            badgeTone="green"
            detail="Bypass stretches clear of active debris and rockfall"
          />

          <OfficerKpiCard
            id="metric-caution-bypasses"
            variant="summary"
            title="Under Caution / Escort"
            value={cautionCount}
            unit="Pilot Escort"
            icon={AlertTriangle}
            accent={cautionCount > 0 ? "amber" : "green"}
            badge="Caution Stage"
            badgeTone={cautionCount > 0 ? "amber" : "green"}
            detail="Single-lane pilot convoy or weight restrictions active"
          />

          <OfficerKpiCard
            id="metric-freight-bypasses"
            variant="summary"
            title="Freight Permitted"
            value={heavyTransitCount}
            unit="Heavy Vehicles"
            icon={Truck}
            accent="blue"
            badge="Freight Route"
            badgeTone="blue"
            detail="Dual-lane bypasses capable of essential supply transport"
          />
        </PortalMetricGrid>

        {/* ── 2. Split Workspace: Routes List (7 cols) + Directive Dossier (5 cols) ── */}
        <PortalSplitLayout
          leftSpan={7}
          stickyRight={true}
          left={
            <div className="bg-[#FAF8F2] border border-[#173D32]/12 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-start justify-between gap-3 pb-4 border-b border-[#173D32]/10">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#EAF0E6] border border-[#173D32]/10 flex items-center justify-center text-[#173D32] shrink-0">
                    <Compass className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#173D32]/55">
                      Certified Evacuation Network
                    </p>
                    <h3 className="text-base font-extrabold text-[#173D32] leading-tight">
                      Active Emergency &amp; Transit Bypasses
                    </h3>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full bg-white border border-[#173D32]/12 text-[11px] font-bold text-[#173D32]/75 shrink-0">
                  {routesList.length} Verified
                </span>
              </div>

              <div className="space-y-3">
                {routesList.map((route) => {
                  const isSelected = selectedRoute.id === route.id;
                  return (
                    <button
                      type="button"
                      key={route.id}
                      onClick={() => setSelectedRoute(route)}
                      className={`w-full text-left p-4 sm:p-5 rounded-2xl border bg-white transition-all cursor-pointer ${
                        isSelected
                          ? "border-[#173D32] shadow-[0_6px_20px_-6px_rgba(23,61,50,0.16)] ring-1 ring-[#173D32]/25"
                          : "border-[#173D32]/10 shadow-[0_2px_10px_-3px_rgba(23,61,50,0.05)] hover:border-[#173D32]/25"
                      }`}
                    >
                      <div className="flex items-stretch gap-3.5">
                        <div
                          className={`w-1 rounded-full shrink-0 ${getRouteStatusBarClass(route.status)}`}
                        />

                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-start justify-between gap-2 mb-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="px-2 py-0.5 rounded-md bg-[#173D32] text-[#F6F4EC] text-[11px] font-black tracking-wide">
                                {route.id}
                              </span>
                              <span className="font-extrabold text-sm text-[#173D32]">
                                {route.name}
                              </span>
                            </div>
                            <StatusBadge
                              status={route.status === "clear" ? "open" : "caution"}
                              label={route.status.toUpperCase()}
                              size="xs"
                            />
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-xs text-[#173D32]/75 font-medium mt-1">
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-[#173D32]/50" />
                              <span>
                                Bypassing <strong className="font-bold text-[#173D32]">{route.primaryCorridor}</strong> · {route.state}
                              </span>
                            </span>
                          </div>

                          <div className="mt-3 pt-2.5 border-t border-[#173D32]/10 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#173D32]/70 font-semibold">
                            <span className="inline-flex items-center gap-3">
                              <span className="inline-flex items-center gap-1">
                                <Route className="w-3.5 h-3.5 text-[#173D32]/50" />
                                <span>{route.distanceKm} km</span>
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-[#173D32]/50" />
                                <span>{route.estimatedTransitTime}</span>
                              </span>
                            </span>
                            <span>Verified: {route.lastInspected}</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          }
          right={
            <div className="relative overflow-hidden bg-[#FAF8F2] border border-[#173D32]/12 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
              {/* Subtle top-right mountain SVG watermark matching dashboard / dossier style */}
              <svg
                aria-hidden="true"
                viewBox="0 0 220 90"
                className="pointer-events-none absolute right-0 top-0 h-24 w-56 text-[#173D32] opacity-[0.07]"
                preserveAspectRatio="none"
              >
                <path
                  d="M0 90 L52 38 L88 64 L138 14 L182 54 L220 26 L220 90 Z"
                  fill="currentColor"
                />
              </svg>

              <div className="relative">
                <span className="text-[10px] uppercase font-bold text-[#173D32]/55 tracking-[0.12em] block mb-1">
                  Corridor Directive
                </span>
                <h3 className="text-xl font-extrabold text-[#173D32] leading-tight">
                  {selectedRoute.name}
                </h3>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#173D32] text-[#F6F4EC] text-xs font-black">
                    {selectedRoute.state}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-white border border-[#173D32]/12 text-xs font-bold text-[#173D32]/75">
                    Alternative to {selectedRoute.primaryCorridor}
                  </span>
                  <StatusBadge
                    status={selectedRoute.status === "clear" ? "open" : "caution"}
                    label={selectedRoute.status === "clear" ? "Clear" : "Caution"}
                    size="xs"
                  />
                </div>

                <div className="mt-5 space-y-3 text-xs">
                  <div className="p-3.5 rounded-2xl bg-white border border-[#173D32]/10 shadow-[0_2px_8px_-2px_rgba(23,61,50,0.04)]">
                    <span className="text-[10px] uppercase tracking-[0.1em] text-[#173D32]/55 inline-flex items-center gap-1.5 font-bold">
                      <MapPin className="w-3.5 h-3.5 text-[#173D32]/65" />
                      <span>Bypass Alignment</span>
                    </span>
                    <span className="font-bold text-[#173D32] text-sm mt-1 block">
                      {selectedRoute.bypassStretch}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-2xl bg-white border border-[#173D32]/10 shadow-[0_2px_8px_-2px_rgba(23,61,50,0.04)]">
                      <span className="text-[10px] uppercase tracking-[0.1em] text-[#173D32]/55 inline-flex items-center gap-1.5 font-bold">
                        <Route className="w-3.5 h-3.5 text-[#173D32]/65" />
                        <span>Corridor Span</span>
                      </span>
                      <span className="font-extrabold text-[#173D32] text-sm mt-1 block">
                        {selectedRoute.distanceKm} km
                      </span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-white border border-[#173D32]/10 shadow-[0_2px_8px_-2px_rgba(23,61,50,0.04)]">
                      <span className="text-[10px] uppercase tracking-[0.1em] text-[#173D32]/55 inline-flex items-center gap-1.5 font-bold">
                        <Clock className="w-3.5 h-3.5 text-[#173D32]/65" />
                        <span>Transit Est.</span>
                      </span>
                      <span className="font-extrabold text-[#173D32] text-sm mt-1 block">
                        {selectedRoute.estimatedTransitTime}
                      </span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white border border-[#173D32]/10 shadow-[0_2px_8px_-2px_rgba(23,61,50,0.04)]">
                    <span className="text-[10px] uppercase tracking-[0.1em] text-[#173D32]/55 inline-flex items-center gap-1.5 font-bold">
                      <Truck className="w-3.5 h-3.5 text-[#173D32]/65" />
                      <span>Vehicle Permissibility</span>
                    </span>
                    <span className="font-bold text-[#173D32] mt-1 block leading-snug">
                      {selectedRoute.vehicleEligibility}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#EAF0E6]/70 border border-[#173D32]/15 text-[#173D32]">
                    <span className="font-extrabold inline-flex items-center gap-1.5 mb-1">
                      <ShieldCheck className="w-4 h-4 text-[#1E7A45]" />
                      <span>Operational Field Advisory</span>
                    </span>
                    <p className="leading-relaxed text-[#173D32]/85">{selectedRoute.advisoryNote}</p>
                  </div>
                </div>
              </div>

              <div className="relative mt-6 pt-4 border-t border-[#173D32]/10 flex flex-wrap items-center justify-between gap-3 text-xs">
                <span className="text-[#173D32]/65 inline-flex items-center gap-1.5 font-medium">
                  <Clock className="w-3.5 h-3.5 text-[#173D32]/50" />
                  <span>Synced: {selectedRoute.lastInspected}</span>
                </span>
                <Link
                  href="/officer/alerts"
                  className="px-4 py-2 rounded-full bg-[#173D32] hover:bg-[#1a4437] text-[#F6F4EC] font-bold inline-flex items-center gap-1.5 transition-all shadow-2xs"
                >
                  <Megaphone className="w-3.5 h-3.5" />
                  <span>Broadcast Route Advisory</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          }
        />
      </div>
    </PortalLayout>
  );
}
