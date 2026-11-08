"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useApp } from "@/context/AppContext";

interface PortalShellProps {
  title: string;
  subtitle: string;
  icon: string;
  badgeColor?: string;
  children?: React.ReactNode;
}

export default function PortalShell({
  title,
  subtitle,
  icon,
  badgeColor = "bg-[#DCE8D4] text-[#173D32]",
  children,
}: PortalShellProps) {
  const { user, logout } = useApp();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  return (
    <div className="min-h-[85vh] bg-[#FAF8F2] py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Top Header Card */}
        <div className="bg-[#F6F4EC] border border-[#173D32]/15 rounded-3xl p-6 sm:p-8 shadow-sm mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#173D32]/10">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#FAF8F2] border border-[#173D32]/15 flex items-center justify-center text-3xl shadow-xs">
                {icon}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${badgeColor}`}>
                    {user?.role} Portal
                  </span>
                  {user?.emailVerified && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-semibold">
                      Verified
                    </span>
                  )}
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#173D32] tracking-tight">
                  {title}
                </h1>
                <p className="text-sm text-[#173D32]/70 mt-0.5">
                  {subtitle}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <Link
                href="/account"
                className="px-3.5 py-1.5 rounded-full border border-[#173D32]/25 text-[#173D32] text-xs font-bold hover:bg-[#173D32]/5 transition-colors"
              >
                Account Settings
              </Link>
              <Link
                href="/"
                className="px-3.5 py-1.5 rounded-full border border-[#173D32]/20 text-[#173D32] text-xs font-semibold hover:bg-[#173D32]/5 transition-colors"
              >
                Homepage
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="px-3.5 py-1.5 rounded-full bg-[#173D32] text-[#F6F4EC] text-xs font-bold hover:bg-[#1f4e40] transition-colors cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          </div>

          {/* User Account Info Bar */}
          <div className="pt-5 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-3 bg-[#FAF8F2] rounded-xl border border-[#173D32]/10">
              <span className="text-[#173D32]/60 font-medium block">Authenticated User</span>
              <span className="font-bold text-[#173D32] text-sm mt-0.5 block truncate">
                {user?.name || "Unknown"}
              </span>
            </div>
            <div className="p-3 bg-[#FAF8F2] rounded-xl border border-[#173D32]/10">
              <span className="text-[#173D32]/60 font-medium block">Email Address</span>
              <span className="font-bold text-[#173D32] text-sm mt-0.5 block truncate">
                {user?.email || "Unknown"}
              </span>
            </div>
            <div className="p-3 bg-[#FAF8F2] rounded-xl border border-[#173D32]/10">
              <span className="text-[#173D32]/60 font-medium block">Assigned Role</span>
              <span className="font-bold text-[#173D32] text-sm mt-0.5 block capitalize">
                {user?.role?.replace("_", " ") || "Citizen"}
              </span>
            </div>
          </div>
        </div>

        {/* Portal Body Content / Placeholder */}
        <div className="bg-[#F6F4EC] border border-[#173D32]/15 rounded-3xl p-6 sm:p-8 shadow-sm">
          {children || (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#DCE8D4]/60 text-[#173D32] mb-3">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-[#173D32] mb-1">
                Portal Placeholder Active
              </h3>
              <p className="text-sm text-[#173D32]/70 max-w-md mx-auto">
                Authentication and role-based access control are fully operational. Portal module workflows will be implemented in subsequent phases.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

