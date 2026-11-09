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
  allowedRoles?: UserRole[];
  children?: React.ReactNode;
}

export default function PortalShell({
  title,
  subtitle,
  icon,
  allowedRoles,
  children,
}: PortalShellProps) {
  const { user } = useApp();

  return (
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
