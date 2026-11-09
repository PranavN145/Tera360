"use client";

import React from "react";
import Link from "next/link";
import PortalLayout from "@/components/portal/PortalLayout";
import { useApp } from "@/context/AppContext";

export default function CitizenHomePage() {
  const { user } = useApp();

  return (
    <PortalLayout
      allowedRoles={["citizen"]}
      title="Citizen Community Portal"
      subtitle="Community advisories, danger reporting, and local landslide risk monitoring for your area."
    >
      <div className="space-y-6">
        {/* Resident Status Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="p-4 bg-[#FAF8F2] rounded-2xl border border-[#173D32]/12 shadow-2xs">
            <span className="text-[#173D32]/60 font-medium block">Community Resident</span>
            <span className="font-extrabold text-[#173D32] text-sm mt-0.5 block truncate">
              {user?.name || "Resident"}
            </span>
          </div>
          <div className="p-4 bg-[#FAF8F2] rounded-2xl border border-[#173D32]/12 shadow-2xs">
            <span className="text-[#173D32]/60 font-medium block">Monitored Region</span>
            <span className="font-extrabold text-[#173D32] text-sm mt-0.5 block truncate">
              Northeast Hill Districts
            </span>
          </div>
          <div className="p-4 bg-[#FAF8F2] rounded-2xl border border-[#173D32]/12 shadow-2xs">
            <span className="text-[#173D32]/60 font-medium block">Regional Risk Level</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="font-extrabold text-emerald-800 text-sm">Moderate / Monitored</span>
            </div>
          </div>
          <div className="p-4 bg-[#FAF8F2] rounded-2xl border border-[#173D32]/12 shadow-2xs">
            <span className="text-[#173D32]/60 font-medium block">Early Warning Network</span>
            <span className="font-extrabold text-emerald-800 text-sm mt-0.5 block">
              Active & Receiving
            </span>
          </div>
        </div>

        {/* Community Workspaces Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Card 1: My Area */}
          <div className="p-6 bg-[#FAF8F2] rounded-2xl border border-[#173D32]/12 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-[#DCE8D4]/60 border border-[#173D32]/15 flex items-center justify-center text-xl mb-3 text-[#173D32]">
                🗺️
              </div>
              <h3 className="text-base font-extrabold text-[#173D32]">My Area Risk Map</h3>
              <p className="text-xs text-[#173D32]/75 mt-1 leading-relaxed">
                Check real-time slope hazard assessments, road clearance, and weather forecasts for your locality before traveling.
              </p>
            </div>
            <div className="mt-5 pt-4 border-t border-[#173D32]/10 flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#173D32]/60 uppercase tracking-wider">Local Mapping</span>
              <Link
                href="/risk-map"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#173D32] text-[#F6F4EC] text-xs font-bold hover:bg-[#1f4e40] transition-colors"
              >
                Explore Area →
              </Link>
            </div>
          </div>

          {/* Card 2: Report Hazard */}
          <div className="p-6 bg-[#FAF8F2] rounded-2xl border border-[#173D32]/12 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-[#DCE8D4]/60 border border-[#173D32]/15 flex items-center justify-center text-xl mb-3 text-[#173D32]">
                ⚠️
              </div>
              <h3 className="text-base font-extrabold text-[#173D32]">Report Hazard</h3>
              <p className="text-xs text-[#173D32]/75 mt-1 leading-relaxed">
                Notice cracks on the hillside, sudden muddy water, or falling rocks? File a rapid citizen hazard report to alert authorities.
              </p>
            </div>
            <div className="mt-5 pt-4 border-t border-[#173D32]/10 flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#173D32]/60 uppercase tracking-wider">Community Safety</span>
              <Link
                href="/report"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#173D32] text-[#F6F4EC] text-xs font-bold hover:bg-[#1f4e40] transition-colors"
              >
                Submit Report →
              </Link>
            </div>
          </div>

          {/* Card 3: Safe Place & Advisories */}
          <div className="p-6 bg-[#FAF8F2] rounded-2xl border border-[#173D32]/12 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-[#DCE8D4]/60 border border-[#173D32]/15 flex items-center justify-center text-xl mb-3 text-[#173D32]">
                🛡️
              </div>
              <h3 className="text-base font-extrabold text-[#173D32]">Safe Places & Advisories</h3>
              <p className="text-xs text-[#173D32]/75 mt-1 leading-relaxed">
                Find designated emergency evacuation points, safe community centers, and active early warnings for your district.
              </p>
            </div>
            <div className="mt-5 pt-4 border-t border-[#173D32]/10 flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#173D32]/60 uppercase tracking-wider">Emergency Zones</span>
              <Link
                href="/alerts"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#173D32] text-[#F6F4EC] text-xs font-bold hover:bg-[#1f4e40] transition-colors"
              >
                View Advisories →
              </Link>
            </div>
          </div>

          {/* Card 4: Resident Profile */}
          <div className="p-6 bg-[#FAF8F2] rounded-2xl border border-[#173D32]/12 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-[#DCE8D4]/60 border border-[#173D32]/15 flex items-center justify-center text-xl mb-3 text-[#173D32]">
                👤
              </div>
              <h3 className="text-base font-extrabold text-[#173D32]">Resident Profile</h3>
              <p className="text-xs text-[#173D32]/75 mt-1 leading-relaxed">
                Configure your emergency phone number, preferred alert language (English, Assamese, Bengali, Hindi, Manipuri, Mizo), and password.
              </p>
            </div>
            <div className="mt-5 pt-4 border-t border-[#173D32]/10 flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#173D32]/60 uppercase tracking-wider">Account Settings</span>
              <Link
                href="/citizen/profile"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#173D32] text-[#F6F4EC] text-xs font-bold hover:bg-[#1f4e40] transition-colors"
              >
                Open Profile →
              </Link>
            </div>
          </div>
        </div>

        {/* Emergency Hotline Banner */}
        <div className="p-5 rounded-2xl bg-[#DCE8D4]/40 border border-[#173D32]/15 text-[#173D32] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🚨</span>
            <div>
              <h4 className="font-extrabold text-sm text-[#173D32]">Emergency Disaster Helplines</h4>
              <p className="text-xs text-[#173D32]/75 mt-0.5">
                SDMA Emergency Control Room: <strong>1070</strong> | National Emergency Response: <strong>112</strong>
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-[#173D32] bg-white/70 px-3 py-1.5 rounded-xl border border-[#173D32]/15 shrink-0 self-start sm:self-center">
            Toll-Free 24×7
          </span>
        </div>
      </div>
    </PortalLayout>
  );
}
