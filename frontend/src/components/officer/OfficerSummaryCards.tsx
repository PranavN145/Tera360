"use client";

import React from "react";
import Link from "next/link";

export interface SummaryMetrics {
  criticalZonesCount: number;
  highRiskRoadsCount: number;
  blockedRoadsCount: number;
  cautionRoadsCount: number;
  activeAlertsCount: number;
  criticalAlertsCount: number;
  warningAlertsCount: number;
  villagesAtRiskCount: number;
  pendingReportsCount: number;
  totalReportsCount: number;
}

interface OfficerSummaryCardsProps {
  metrics: SummaryMetrics;
  isLoading?: boolean;
}

export default function OfficerSummaryCards({
  metrics,
  isLoading = false,
}: OfficerSummaryCardsProps) {
  const cards = [
    {
      id: "critical-zones",
      title: "Critical Zones",
      value: metrics.criticalZonesCount,
      badge: metrics.criticalZonesCount > 0 ? "Red Alert" : "Stable",
      badgeColor:
        metrics.criticalZonesCount > 0
          ? "bg-red-100 text-red-800 border-red-200"
          : "bg-emerald-100 text-emerald-800 border-emerald-200",
      detail:
        metrics.criticalZonesCount > 0
          ? "High slope saturation & active displacement"
          : "All monitored zones within nominal thresholds",
      href: "/officer/map",
      linkText: "GIS Hotspots →",
      icon: "⛰️",
      pulse: metrics.criticalZonesCount > 0,
    },
    {
      id: "high-risk-roads",
      title: "High-Risk Roads",
      value: metrics.highRiskRoadsCount,
      badge: `${metrics.blockedRoadsCount} Blocked`,
      badgeColor:
        metrics.blockedRoadsCount > 0
          ? "bg-red-100 text-red-800 border-red-200"
          : "bg-amber-100 text-amber-800 border-amber-200",
      detail: `${metrics.blockedRoadsCount} blocked, ${metrics.cautionRoadsCount} under caution`,
      href: "/officer/roads",
      linkText: "Corridors →",
      icon: "🛣️",
      pulse: metrics.blockedRoadsCount > 0,
    },
    {
      id: "active-alerts",
      title: "Active Alerts",
      value: metrics.activeAlertsCount,
      badge: `${metrics.criticalAlertsCount} Critical`,
      badgeColor:
        metrics.criticalAlertsCount > 0
          ? "bg-red-100 text-red-800 border-red-200"
          : "bg-yellow-100 text-yellow-800 border-yellow-200",
      detail: `${metrics.criticalAlertsCount} critical, ${metrics.warningAlertsCount} warning advisories`,
      href: "/officer/alerts",
      linkText: "Alert Center →",
      icon: "📢",
      pulse: metrics.criticalAlertsCount > 0,
    },
    {
      id: "villages-at-risk",
      title: "Villages at Risk",
      value: metrics.villagesAtRiskCount,
      badge: "Vulnerable",
      badgeColor: "bg-amber-100 text-amber-800 border-amber-200",
      detail: "Settlements in steep drainage runoff corridors",
      href: "/officer/villages",
      linkText: "Shelters →",
      icon: "🏘️",
      pulse: false,
    },
    {
      id: "pending-reports",
      title: "Pending Reports",
      value: metrics.pendingReportsCount,
      badge: `${metrics.pendingReportsCount} New`,
      badgeColor:
        metrics.pendingReportsCount > 0
          ? "bg-blue-100 text-blue-800 border-blue-200"
          : "bg-gray-100 text-gray-700 border-gray-200",
      detail: `${metrics.pendingReportsCount} awaiting officer verification (${metrics.totalReportsCount} total)`,
      href: "/officer/reports",
      linkText: "Triage Queue →",
      icon: "📍",
      pulse: metrics.pendingReportsCount > 0,
    },
  ];

  return (
    <section aria-label="Operational Summary Metrics">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {cards.map((card) => (
          <div
            key={card.id}
            className="bg-[#FAF8F2] border border-[#173D32]/12 rounded-2xl p-4 sm:p-5 shadow-2xs hover:shadow-xs hover:border-[#173D32]/25 transition-all flex flex-col justify-between"
          >
            <div>
              {/* Card Header: Title & Indicator */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-base select-none" aria-hidden="true">
                    {card.icon}
                  </span>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#173D32]/65">
                    {card.title}
                  </span>
                </div>
                {card.pulse ? (
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                  </span>
                ) : (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${card.badgeColor}`}
                  >
                    {card.badge}
                  </span>
                )}
              </div>

              {/* Big Metric Display */}
              <div className="flex items-baseline gap-2 my-1">
                {isLoading ? (
                  <div className="h-9 w-16 bg-[#173D32]/10 rounded-lg animate-pulse" />
                ) : (
                  <span className="text-3xl font-black text-[#173D32] tracking-tight">
                    {card.value}
                  </span>
                )}
                {card.pulse && !isLoading && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${card.badgeColor}`}
                  >
                    {card.badge}
                  </span>
                )}
              </div>

              {/* Detail Line */}
              <p className="text-[11px] text-[#173D32]/75 font-medium line-clamp-2 mt-1 leading-snug">
                {isLoading ? (
                  <span className="inline-block h-3 w-3/4 bg-[#173D32]/8 rounded animate-pulse" />
                ) : (
                  card.detail
                )}
              </p>
            </div>

            {/* Bottom Link Action */}
            <div className="mt-3 pt-2.5 border-t border-[#173D32]/8 flex items-center justify-between text-[11px]">
              <span className="text-[#173D32]/50 font-medium">Status</span>
              <Link
                href={card.href}
                className="font-bold text-[#173D32] hover:underline flex items-center gap-1 focus:outline-none focus:ring-1 focus:ring-[#173D32] rounded"
              >
                <span>{card.linkText}</span>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
