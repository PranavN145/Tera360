"use client";

import React from "react";
import PortalLayout from "@/components/portal/PortalLayout";
import { useApp } from "@/context/AppContext";
import { UserRole } from "@/types/auth";

interface PortalShellProps {
  title: string;
  subtitle: string;
  icon: string;
  badgeColor?: string;
  maxWidth?: string;
  allowedRoles?: UserRole[];
  children?: React.ReactNode;
}

export default function PortalShell({
  title,
  subtitle,
  icon,
  badgeColor = "bg-[#DCE8D4] text-[#173D32]",
  maxWidth = "max-w-4xl",
  allowedRoles,
  children,
}: PortalShellProps) {
  const { user } = useApp();

  return (
    <div className="min-h-[85vh] bg-[#FAF8F2] py-10 px-4 sm:px-6 lg:px-8">
      <div className={`${maxWidth} mx-auto`}>
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
    <PortalLayout
      allowedRoles={allowedRoles || (user?.role ? [user.role] : ["officer", "citizen", "field_officer"])}
      title={title}
      subtitle={subtitle}
    >
      <div className="space-y-6">
        {/* User Account Info Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-4 bg-[#FAF8F2] rounded-2xl border border-[#173D32]/10 shadow-2xs">
            <span className="text-[#173D32]/60 font-medium block">Authenticated User</span>
            <span className="font-extrabold text-[#173D32] text-sm mt-0.5 block truncate">
              {user?.name || "Unknown"}
            </span>
          </div>
          <div className="p-4 bg-[#FAF8F2] rounded-2xl border border-[#173D32]/10 shadow-2xs">
            <span className="text-[#173D32]/60 font-medium block">Email Address</span>
            <span className="font-extrabold text-[#173D32] text-sm mt-0.5 block truncate">
              {user?.email || "Unknown"}
            </span>
          </div>
          <div className="p-4 bg-[#FAF8F2] rounded-2xl border border-[#173D32]/10 shadow-2xs">
            <span className="text-[#173D32]/60 font-medium block">Assigned Role</span>
            <span className="font-extrabold text-[#173D32] text-sm mt-0.5 block capitalize">
              {user?.role?.replace("_", " ") || "Portal User"}
            </span>
          </div>
        </div>

        {/* Portal Body Content */}
        <div className="bg-[#FAF8F2] border border-[#173D32]/12 rounded-3xl p-6 sm:p-8 shadow-2xs">
          {children || (
            <div className="text-center py-10">
              <div className="w-14 h-14 rounded-2xl bg-[#DCE8D4]/50 border border-[#173D32]/15 flex items-center justify-center text-3xl shadow-2xs mx-auto mb-3">
                {icon}
              </div>
              <h3 className="text-lg font-extrabold text-[#173D32] mb-1">
                {user?.role?.replace("_", " ").toUpperCase()} PORTAL ACTIVE
              </h3>
              <p className="text-xs sm:text-sm text-[#173D32]/75 max-w-md mx-auto leading-relaxed">
                Shared portal shell with mountain header artwork, vertical navigation sidebar, and footer branding is live.
              </p>
            </div>
          )}
        </div>
      </div>
    </PortalLayout>
  );
}
