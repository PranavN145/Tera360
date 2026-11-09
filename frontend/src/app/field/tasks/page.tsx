"use client";

import React from "react";
import Link from "next/link";
import PortalLayout from "@/components/portal/PortalLayout";
import { useApp } from "@/context/AppContext";

export default function FieldTasksPage() {
  const { user } = useApp();

  return (
    <PortalLayout
      allowedRoles={["field_officer"]}
      title="Field Operations & Tasks"
      subtitle="Sensor telemetry checks, incident verification, and ground team dispatches across Northeast corridors."
    >
      <div className="space-y-6">
        {/* Field Responder Operational Status Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="p-4 bg-[#FAF8F2] rounded-2xl border border-[#173D32]/12 shadow-2xs">
            <span className="text-[#173D32]/60 font-medium block">Field Responder</span>
            <span className="font-extrabold text-[#173D32] text-sm mt-0.5 block truncate">
              {user?.name || "Field Officer"}
            </span>
          </div>
          <div className="p-4 bg-[#FAF8F2] rounded-2xl border border-[#173D32]/12 shadow-2xs">
            <span className="text-[#173D32]/60 font-medium block">Duty Status</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-extrabold text-[#173D32] text-sm">Active On-Call</span>
            </div>
          </div>
          <div className="p-4 bg-[#FAF8F2] rounded-2xl border border-[#173D32]/12 shadow-2xs">
            <span className="text-[#173D32]/60 font-medium block">Assigned Sector</span>
            <span className="font-extrabold text-[#173D32] text-sm mt-0.5 block truncate">
              Dima Hasao & Kohima
            </span>
          </div>
          <div className="p-4 bg-[#FAF8F2] rounded-2xl border border-[#173D32]/12 shadow-2xs">
            <span className="text-[#173D32]/60 font-medium block">Telemetry Link</span>
            <span className="font-extrabold text-emerald-800 text-sm mt-0.5 block">
              100% Synchronized
            </span>
          </div>
        </div>

        {/* Operational Modules & Workspaces Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Card 1: Assigned Area Map */}
          <div className="p-6 bg-[#FAF8F2] rounded-2xl border border-[#173D32]/12 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-[#DCE8D4]/60 border border-[#173D32]/15 flex items-center justify-center text-xl mb-3 text-[#173D32]">
                🗺️
              </div>
              <h3 className="text-base font-extrabold text-[#173D32]">Assigned Area Map</h3>
              <p className="text-xs text-[#173D32]/75 mt-1 leading-relaxed">
                Inspect corridor risk ratings, precipitation thresholds, and active geotechnical sensor stations across your assigned hill sector.
              </p>
            </div>
            <div className="mt-5 pt-4 border-t border-[#173D32]/10 flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#173D32]/60 uppercase tracking-wider">GIS Live Feed</span>
              <Link
                href="/risk-map"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#173D32] text-[#F6F4EC] text-xs font-bold hover:bg-[#1f4e40] transition-colors"
              >
                Launch Map →
              </Link>
            </div>
          </div>

          {/* Card 2: Incident Reporting */}
          <div className="p-6 bg-[#FAF8F2] rounded-2xl border border-[#173D32]/12 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-[#DCE8D4]/60 border border-[#173D32]/15 flex items-center justify-center text-xl mb-3 text-[#173D32]">
                📝
              </div>
              <h3 className="text-base font-extrabold text-[#173D32]">Field Hazard Reports</h3>
              <p className="text-xs text-[#173D32]/75 mt-1 leading-relaxed">
                Submit direct ground observation reports, attach field photographs, and log slope tension cracks or road subsidence.
              </p>
            </div>
            <div className="mt-5 pt-4 border-t border-[#173D32]/10 flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#173D32]/60 uppercase tracking-wider">Incident Logging</span>
              <Link
                href="/report"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#173D32] text-[#F6F4EC] text-xs font-bold hover:bg-[#1f4e40] transition-colors"
              >
                File Report →
              </Link>
            </div>
          </div>

          {/* Card 3: Road Corridor Status */}
          <div className="p-6 bg-[#FAF8F2] rounded-2xl border border-[#173D32]/12 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-[#DCE8D4]/60 border border-[#173D32]/15 flex items-center justify-center text-xl mb-3 text-[#173D32]">
                🚧
              </div>
              <h3 className="text-base font-extrabold text-[#173D32]">Road Status & Impact</h3>
              <p className="text-xs text-[#173D32]/75 mt-1 leading-relaxed">
                Monitor highway corridor blockages, one-way traffic restrictions, and heavy vehicle advisories on NH-27, NH-29, and NH-10.
              </p>
            </div>
            <div className="mt-5 pt-4 border-t border-[#173D32]/10 flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#173D32]/60 uppercase tracking-wider">Transit Bulletins</span>
              <Link
                href="/alerts"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#173D32] text-[#F6F4EC] text-xs font-bold hover:bg-[#1f4e40] transition-colors"
              >
                View Road Feed →
              </Link>
            </div>
          </div>

          {/* Card 4: Operational Protocols & Communications */}
          <div className="p-6 bg-[#FAF8F2] rounded-2xl border border-[#173D32]/12 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-[#DCE8D4]/60 border border-[#173D32]/15 flex items-center justify-center text-xl mb-3 text-[#173D32]">
                📡
              </div>
              <h3 className="text-base font-extrabold text-[#173D32]">Operational Communications</h3>
              <p className="text-xs text-[#173D32]/75 mt-1 leading-relaxed">
                Maintain contact with Central Command Ops Center. Verify your emergency radio frequency and contact credentials.
              </p>
            </div>
            <div className="mt-5 pt-4 border-t border-[#173D32]/10 flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#173D32]/60 uppercase tracking-wider">Responder Settings</span>
              <Link
                href="/account"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#173D32] text-[#F6F4EC] text-xs font-bold hover:bg-[#1f4e40] transition-colors"
              >
                Profile & Settings →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
