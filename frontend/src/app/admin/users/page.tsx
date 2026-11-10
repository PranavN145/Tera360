"use client";

import React from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Bell,
  ClipboardList,
  Compass,
  Settings,
  Shield,
  Users,
} from "lucide-react";
import PortalLayout from "@/components/portal/PortalLayout";
import PortalMetricGrid from "@/components/portal/PortalMetricGrid";
import { PortalKpiCard } from "@/components/portal";
import { useApp } from "@/context/AppContext";

export default function AdminUsersPage() {
  const { user } = useApp();

  const adminModules = [
    {
      title: "Operations Command Dashboard",
      description:
        "Monitor live regional metrics, AI risk updates, priority response actions, and SAR satellite ingestion.",
      href: "/officer/dashboard",
      cta: "Open Dashboard",
      icon: Activity,
      iconBg: "bg-[#E2F4E8] text-[#1E7A45]",
    },
    {
      title: "Disaster Alert Center",
      description:
        "Review and broadcast multi-channel landslide warnings and emergency advisories across Northeast corridors.",
      href: "/officer/alerts",
      cta: "Manage Alerts",
      icon: Bell,
      iconBg: "bg-[#FDECEC] text-[#C52936]",
    },
    {
      title: "Settlement Directory",
      description:
        "Inspect vulnerable hill villages, emergency liaisons, and designated high-ground evacuation shelters.",
      href: "/officer/villages",
      cta: "Open Villages",
      icon: Compass,
      iconBg: "bg-[#FEF1DC] text-[#B45E09]",
    },
    {
      title: "Field Reports Desk",
      description:
        "Audit ground truth submissions, severity classifications, and verification workflows.",
      href: "/officer/reports",
      cta: "Review Reports",
      icon: ClipboardList,
      iconBg: "bg-[#E2F1F8] text-[#17688A]",
    },
  ];

  return (
    <PortalLayout
      allowedRoles={["admin"]}
      title="System Administration & Users"
      subtitle="Administrative overview, command portal access, and security session controls."
      headerActions={
        <Link
          href="/account?tab=profile"
          className="px-3.5 py-1.5 rounded-full bg-[#173D32] text-[#F6F4EC] text-xs font-bold hover:bg-[#1a4437] transition-all inline-flex items-center gap-1.5"
        >
          <Settings className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Account &amp; Security</span>
        </Link>
      }
    >
      <div className="space-y-6 sm:space-y-8 w-full">
        <PortalMetricGrid columns={4} ariaLabel="Administration Status">
          <PortalKpiCard
            id="admin-role-status"
            variant="summary"
            title="Admin Console"
            value="Active"
            unit={user?.name ? user.name.split(" ")[0] : "Administrator"}
            icon={Shield}
            accent="green"
            badge="Authorized"
            badgeTone="green"
            detail="Full command supervision and operational access"
          />
          <PortalKpiCard
            id="admin-role-tiers"
            variant="summary"
            title="Portal Tiers"
            value={5}
            unit="Role Portals"
            icon={Users}
            accent="blue"
            badge="RBAC Active"
            badgeTone="blue"
            detail="Officer, Field Officer, Citizen, Driver, and Admin"
          />
          <PortalKpiCard
            id="admin-command-access"
            variant="summary"
            title="Command Suite"
            value={7}
            unit="Modules"
            icon={Activity}
            accent="green"
            badge="Operational"
            badgeTone="green"
            detail="Live GIS, roads, alerts, routes, villages, reports"
          />
          <PortalKpiCard
            id="admin-security"
            variant="summary"
            title="Session Security"
            value="Enforced"
            unit="Auth Guard"
            icon={Settings}
            accent="amber"
            badge="Protected"
            badgeTone="amber"
            detail="Role-based access control and audit logging active"
          />
        </PortalMetricGrid>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {adminModules.map((mod) => {
            const Icon = mod.icon;
            return (
              <div
                key={mod.href}
                className="p-5 sm:p-6 bg-[#FAF8F2] rounded-2xl sm:rounded-3xl border border-[#173D32]/12 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3.5 ${mod.iconBg}`}
                    aria-hidden="true"
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-extrabold text-[#173D32]">
                    {mod.title}
                  </h3>
                  <p className="text-xs text-[#173D32]/75 mt-1.5 leading-relaxed">
                    {mod.description}
                  </p>
                </div>
                <div className="mt-5 pt-4 border-t border-[#173D32]/10 flex justify-end">
                  <Link
                    href={mod.href}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#173D32] text-[#F6F4EC] text-xs font-bold hover:bg-[#1a4437] transition-colors"
                  >
                    <span>{mod.cta}</span>
                    <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </PortalLayout>
  );
}
