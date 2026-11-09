"use client";

import React, { useState } from "react";
import Link from "next/link";
import PortalLayout from "@/components/portal/PortalLayout";

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

export default function OfficerRoutesPage() {
  const [selectedRoute, setSelectedRoute] = useState<SafeRouteItem>(EMERGENCY_SAFE_ROUTES[0]);

  return (
    <PortalLayout
      allowedRoles={["officer", "admin"]}
      title="Safe Routes & Emergency Bypasses"
      subtitle="Supervise certified emergency diversion corridors, clearance authorizations, and heavy transit restrictions."
      headerActions={
        <div className="flex items-center gap-2">
          <Link
            href="/officer/roads"
            className="px-3.5 py-1.5 rounded-full bg-[#173D32]/10 hover:bg-[#173D32]/15 text-[#173D32] text-xs font-bold transition-all"
          >
            Check Road Impact →
          </Link>
          <Link
            href="/officer/dashboard"
            className="px-3.5 py-1.5 rounded-full bg-[#173D32] text-[#F6F4EC] text-xs font-bold hover:bg-[#1a4437] transition-all"
          >
            ← Dashboard
          </Link>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Safe Routes List (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-[#FAF8F2] border border-[#173D32]/12 rounded-3xl p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#173D32]/10 mb-4">
              <h3 className="text-base font-extrabold text-[#173D32]">
                Active Certified Evacuation & Transit Corridors
              </h3>
              <span className="text-xs font-bold text-[#173D32]/60">
                {EMERGENCY_SAFE_ROUTES.length} Verified
              </span>
            </div>

            <div className="space-y-3">
              {EMERGENCY_SAFE_ROUTES.map((route) => {
                const isSelected = selectedRoute.id === route.id;
                return (
                  <div
                    key={route.id}
                    onClick={() => setSelectedRoute(route)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-[#F6F4EC] border-[#173D32] shadow-sm ring-1 ring-[#173D32]/30"
                        : "bg-[#FAF8F2] border-[#173D32]/10 hover:border-[#173D32]/25"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-[#173D32] text-[#F6F4EC] text-[11px] font-black">
                          {route.id}
                        </span>
                        <span className="font-extrabold text-sm text-[#173D32]">
                          {route.name}
                        </span>
                      </div>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          route.status === "clear"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {route.status}
                      </span>
                    </div>

                    <p className="text-xs text-[#173D32]/75 font-medium">
                      Bypassing {route.primaryCorridor} · {route.state}
                    </p>

                    <div className="mt-3 pt-2 border-t border-[#173D32]/8 flex items-center justify-between text-[11px] text-[#173D32]/70 font-semibold">
                      <span>Length: {route.distanceKm} km ({route.estimatedTransitTime})</span>
                      <span>Verified: {route.lastInspected}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Route Telemetry & Directives (5 cols) */}
        <div className="lg:col-span-5 bg-[#FAF8F2] border border-[#173D32]/12 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-[#173D32]/60 tracking-wider block mb-1">
              Corridor Directive
            </span>
            <h3 className="text-xl font-extrabold text-[#173D32] leading-tight">
              {selectedRoute.name}
            </h3>
            <span className="inline-block mt-1 px-2.5 py-0.5 rounded-md bg-[#173D32] text-[#F6F4EC] text-xs font-black">
              {selectedRoute.state} · Alternative to {selectedRoute.primaryCorridor}
            </span>

            <div className="mt-5 space-y-3.5 text-xs">
              <div className="p-3.5 rounded-xl bg-[#F6F4EC] border border-[#173D32]/10">
                <span className="text-[#173D32]/60 block font-medium">Bypass Alignment</span>
                <span className="font-bold text-[#173D32] text-sm mt-0.5 block">
                  {selectedRoute.bypassStretch}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-[#F6F4EC] border border-[#173D32]/10">
                <span className="text-[#173D32]/60 block font-medium">Vehicle Permissibility</span>
                <span className="font-bold text-[#173D32] mt-0.5 block leading-snug">
                  {selectedRoute.vehicleEligibility}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950">
                <span className="font-bold block mb-1">Operational Field Advisory</span>
                <p className="leading-relaxed">{selectedRoute.advisoryNote}</p>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-[#173D32]/10 flex items-center justify-between text-xs">
            <span className="text-[#173D32]/60">Status: {selectedRoute.lastInspected}</span>
            <Link
              href="/officer/alerts"
              className="font-bold text-[#173D32] hover:underline"
            >
              Broadcast Route Advisory →
            </Link>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}

