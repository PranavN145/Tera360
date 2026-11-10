"use client";

import React from "react";
import Link from "next/link";
import PortalLayout from "@/components/portal/PortalLayout";
import { useApp } from "@/context/AppContext";
import { Settings } from "lucide-react";

export default function FieldProfilePage() {
  const { user } = useApp();

  return (
    <PortalLayout
      allowedRoles={["field_officer"]}
      title="Field Responder Profile & Clearance"
      subtitle="Operational deployment credentials, equipment status, and assigned hill sector clearances."
    >
      <div className="space-y-6 max-w-4xl">
        {/* Responder Card */}
        <div className="p-6 sm:p-8 bg-[#FAF8F2] rounded-3xl border border-[#173D32]/12 shadow-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 pb-6 border-b border-[#173D32]/10">
            <div className="w-16 h-16 rounded-2xl bg-[#173D32] text-[#F6F4EC] font-black text-2xl flex items-center justify-center shadow-xs shrink-0">
              {user?.name ? user.name[0].toUpperCase() : "F"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full bg-[#DCE8D4] text-[#173D32] text-xs font-black uppercase tracking-wider">
                  Field Response Officer
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                  Active On-Duty
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-[#173D32] truncate">
                {user?.name || "Field Officer"}
              </h2>
              <p className="text-xs sm:text-sm text-[#173D32]/70 mt-0.5">
                {user?.email || "field@terra360.in"}
              </p>
            </div>
            <Link
              href="/account"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-white/95 text-[#173D32] border border-[#173D32]/15 text-xs font-bold shadow-2xs transition-colors shrink-0"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Account Settings</span>
            </Link>
          </div>

          {/* Operational Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-6 text-xs">
            <div className="p-4 rounded-xl bg-white border border-[#173D32]/10">
              <span className="text-[#173D32]/60 block mb-1">Assigned Operational Sector</span>
              <span className="text-sm font-extrabold text-[#173D32] block">
                NH-29 & NH-27 (Assam - Nagaland Corridor)
              </span>
            </div>
            <div className="p-4 rounded-xl bg-white border border-[#173D32]/10">
              <span className="text-[#173D32]/60 block mb-1">Emergency Dispatch Unit</span>
              <span className="text-sm font-extrabold text-[#173D32] block">
                Northeast Sector Quick Response Team 4
              </span>
            </div>
            <div className="p-4 rounded-xl bg-white border border-[#173D32]/10">
              <span className="text-[#173D32]/60 block mb-1">Radio Call Sign</span>
              <span className="text-sm font-extrabold font-mono text-[#173D32] block">
                TERRA-ECHO-42
              </span>
            </div>
            <div className="p-4 rounded-xl bg-white border border-[#173D32]/10">
              <span className="text-[#173D32]/60 block mb-1">Geotechnical Equipment Kit</span>
              <span className="text-sm font-extrabold text-[#173D32] block">
                Inclinometer · Soil Moisture Probe · Starlink Terminal
              </span>
            </div>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}

