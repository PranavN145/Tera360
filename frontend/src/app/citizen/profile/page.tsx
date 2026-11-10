"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Globe,
  Phone,
  ShieldCheck,
} from "lucide-react";
import PortalLayout from "@/components/portal/PortalLayout";
import { useApp } from "@/context/AppContext";

export default function CitizenProfilePage() {
  const { user } = useApp();

  const initials = user?.name
    ? user.name
        .split(" ")
        .filter(Boolean)
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "CZ";

  return (
    <PortalLayout
      allowedRoles={["citizen"]}
      title="Citizen Profile"
      subtitle="View your registered details, communication preferences, and security settings."
      headerActions={
        <Link
          href="/citizen/home"
          className="px-3.5 py-1.5 rounded-full bg-[#173D32] text-[#F6F4EC] text-xs font-bold hover:bg-[#1a4437] transition-all inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Home</span>
        </Link>
      }
    >
      <div className="space-y-6 w-full">
        {/* Profile Details Card */}
        <div className="relative overflow-hidden p-6 sm:p-8 bg-[#FAF8F2] rounded-3xl border border-[#173D32]/12 shadow-xs space-y-6">
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

          <div className="relative flex flex-col sm:flex-row sm:items-center gap-4 pb-6 border-b border-[#173D32]/10">
            <div className="w-16 h-16 rounded-2xl bg-[#173D32] text-[#F6F4EC] font-black text-xl flex items-center justify-center shadow-xs shrink-0">
              {initials}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full bg-[#DCE8D4] text-[#173D32] text-[11px] font-extrabold uppercase tracking-wider">
                  Citizen Community
                </span>
                {user?.emailVerified && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#DCFCE7] text-[#166534] text-[11px] font-bold">
                    <ShieldCheck className="w-3 h-3" aria-hidden="true" />
                    <span>Email Verified</span>
                  </span>
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#173D32]">
                {user?.name || "Citizen"}
              </h2>
              <p className="text-xs sm:text-sm text-[#173D32]/70 mt-0.5">
                {user?.email}
              </p>
            </div>
          </div>

          <div className="relative grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 bg-white rounded-2xl border border-[#173D32]/10 shadow-[0_2px_8px_-2px_rgba(23,61,50,0.04)]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#173D32]/55 inline-flex items-center gap-1.5 mb-1.5">
                <Phone className="w-3.5 h-3.5 text-[#173D32]/65" aria-hidden="true" />
                <span>Phone Number</span>
              </span>
              <span className="font-extrabold text-[#173D32] text-sm block">
                {user?.phone || "Not configured"}
              </span>
            </div>
            <div className="p-4 bg-white rounded-2xl border border-[#173D32]/10 shadow-[0_2px_8px_-2px_rgba(23,61,50,0.04)]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#173D32]/55 inline-flex items-center gap-1.5 mb-1.5">
                <Globe className="w-3.5 h-3.5 text-[#173D32]/65" aria-hidden="true" />
                <span>Preferred Alert Language</span>
              </span>
              <span className="font-extrabold text-[#173D32] text-sm block uppercase">
                {user?.language || "en"}
              </span>
            </div>
          </div>

          <div className="relative pt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-t border-[#173D32]/10">
            <p className="text-xs text-[#173D32]/75">
              Need to change your password, update your phone number, or manage
              active sessions?
            </p>
            <Link
              href="/account?tab=profile"
              className="w-full sm:w-auto px-5 py-2.5 rounded-full bg-[#173D32] text-[#F6F4EC] text-xs font-bold hover:bg-[#1a4437] transition-colors text-center shrink-0 shadow-2xs inline-flex items-center justify-center gap-1.5"
            >
              <span>Manage Account &amp; Security</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
