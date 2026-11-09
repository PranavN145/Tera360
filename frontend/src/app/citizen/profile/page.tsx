"use client";

import React from "react";
import Link from "next/link";
import PortalLayout from "@/components/portal/PortalLayout";
import { useApp } from "@/context/AppContext";

export default function CitizenProfilePage() {
  const { user } = useApp();

  return (
    <PortalLayout
      allowedRoles={["citizen"]}
      title="Citizen Profile"
      subtitle="View your registered details, communication preferences, and security settings."
    >
      <div className="space-y-6 max-w-4xl">
        {/* Profile Details Card */}
        <div className="p-6 sm:p-8 bg-[#FAF8F2] rounded-3xl border border-[#173D32]/12 shadow-2xs space-y-6">
          <div className="flex items-center gap-4 pb-6 border-b border-[#173D32]/10">
            <div className="w-16 h-16 rounded-2xl bg-[#173D32] text-[#F6F4EC] font-black text-xl flex items-center justify-center shadow-xs">
              {user?.name
                ? user.name
                    .split(" ")
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()
                : "CZ"}
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-[#173D32]">{user?.name || "Citizen"}</h2>
              <p className="text-xs text-[#173D32]/70 mt-0.5">{user?.email}</p>
              <div className="mt-2 flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-[#DCE8D4] text-[#173D32] text-xs font-bold uppercase tracking-wider">
                  Citizen Community
                </span>
                {user?.emailVerified && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">
                    Email Verified
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 bg-white/70 rounded-2xl border border-[#173D32]/10">
              <span className="text-[#173D32]/60 font-medium block">Phone Number</span>
              <span className="font-extrabold text-[#173D32] text-sm mt-0.5 block">
                {user?.phone || "Not configured"}
              </span>
            </div>
            <div className="p-4 bg-white/70 rounded-2xl border border-[#173D32]/10">
              <span className="text-[#173D32]/60 font-medium block">Preferred Language</span>
              <span className="font-extrabold text-[#173D32] text-sm mt-0.5 block uppercase">
                {user?.language || "en"}
              </span>
            </div>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[#173D32]/10">
            <p className="text-xs text-[#173D32]/75">
              Need to change your password, update phone number, or manage active sessions?
            </p>
            <Link
              href="/account"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#173D32] text-[#F6F4EC] text-xs font-bold hover:bg-[#1f4e40] transition-colors text-center shrink-0 shadow-2xs"
            >
              Manage Account & Security →
            </Link>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
