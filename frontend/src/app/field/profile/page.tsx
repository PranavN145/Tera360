"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Compass,
  Radio,
  Settings,
  ShieldCheck,
  Users,
  Wrench,
} from "lucide-react";
import PortalLayout from "@/components/portal/PortalLayout";
import { useApp } from "@/context/AppContext";

export default function FieldProfilePage() {
  const { user } = useApp();

  const initials = user?.name
    ? user.name
        .split(" ")
        .filter(Boolean)
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "FO";

  return (
    <PortalLayout
      allowedRoles={["field_officer"]}
      title="Field Responder Profile & Clearance"
      subtitle="Operational deployment credentials, equipment status, and assigned hill sector clearances."
      headerActions={
        <Link
          href="/field/tasks"
          className="px-3.5 py-1.5 rounded-full bg-[#173D32] text-[#F6F4EC] text-xs font-bold hover:bg-[#1a4437] transition-all inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          <span>My Tasks</span>
        </Link>
      }
    >
      <div className="space-y-6 w-full">
        {/* Responder Card */}
        <div className="relative overflow-hidden p-6 sm:p-8 bg-[#FAF8F2] rounded-3xl border border-[#173D32]/12 shadow-xs">
          <svg
            aria-hidden="true"
            viewBox="0 0 220 90"
            className="pointer-events-none absolute right-0 top-0 h-24 w-56 text-[#173D32] opacity-[0.06]"
            preserveAspectRatio="none"
          >
            <path
              d="M0 90 L52 38 L88 64 L138 14 L182 54 L220 26 L220 90 Z"
              fill="currentColor"
            />
          </svg>

          <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-5 pb-6 border-b border-[#173D32]/10">
            <div className="w-16 h-16 rounded-2xl bg-[#173D32] text-[#F6F4EC] font-black text-xl flex items-center justify-center shadow-xs shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full bg-[#DCE8D4] text-[#173D32] text-[11px] font-extrabold uppercase tracking-wider">
                  Field Response Officer
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#DCFCE7] text-[#166534] text-[11px] font-bold">
                  <ShieldCheck className="w-3 h-3" aria-hidden="true" />
                  <span>Active On-Duty</span>
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#173D32] truncate">
                {user?.name || "Field Officer"}
              </h2>
              <p className="text-xs sm:text-sm text-[#173D32]/70 mt-0.5">
                {user?.email || "field@terra360.in"}
              </p>
            </div>
            <Link
              href="/account?tab=profile"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white hover:bg-[#F6F4EC] text-[#173D32] border border-[#173D32]/15 text-xs font-bold shadow-2xs transition-colors shrink-0"
            >
              <Settings className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Account Settings</span>
            </Link>
          </div>

          {/* Operational Details Grid */}
          <div className="relative grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 mt-6 text-xs">
            <div className="p-4 rounded-2xl bg-white border border-[#173D32]/10 shadow-[0_2px_8px_-2px_rgba(23,61,50,0.04)]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#173D32]/55 inline-flex items-center gap-1.5 mb-1.5">
                <Compass className="w-3.5 h-3.5 text-[#173D32]/65" aria-hidden="true" />
                <span>Assigned Operational Sector</span>
              </span>
              <span className="text-sm font-extrabold text-[#173D32] block">
                NH-29 &amp; NH-27 (Assam - Nagaland Corridor)
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-[#173D32]/10 shadow-[0_2px_8px_-2px_rgba(23,61,50,0.04)]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#173D32]/55 inline-flex items-center gap-1.5 mb-1.5">
                <Users className="w-3.5 h-3.5 text-[#173D32]/65" aria-hidden="true" />
                <span>Emergency Dispatch Unit</span>
              </span>
              <span className="text-sm font-extrabold text-[#173D32] block">
                Northeast Sector Quick Response Team 4
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-[#173D32]/10 shadow-[0_2px_8px_-2px_rgba(23,61,50,0.04)]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#173D32]/55 inline-flex items-center gap-1.5 mb-1.5">
                <Radio className="w-3.5 h-3.5 text-[#173D32]/65" aria-hidden="true" />
                <span>Radio Call Sign</span>
              </span>
              <span className="text-sm font-extrabold font-mono text-[#173D32] block">
                TERRA-ECHO-42
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-[#173D32]/10 shadow-[0_2px_8px_-2px_rgba(23,61,50,0.04)]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#173D32]/55 inline-flex items-center gap-1.5 mb-1.5">
                <Wrench className="w-3.5 h-3.5 text-[#173D32]/65" aria-hidden="true" />
                <span>Geotechnical Equipment Kit</span>
              </span>
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
