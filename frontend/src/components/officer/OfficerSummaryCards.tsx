"use client";

import React from "react";
import PortalMetricGrid from "@/components/portal/PortalMetricGrid";
import PortalMetricCard from "@/components/portal/PortalMetricCard";

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
      linkText: "GIS Hotspots",
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
      linkText: "Corridors",
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
      linkText: "Alert Center",
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
      linkText: "Shelters",
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
      linkText: "Triage Queue",
      icon: "📍",
      pulse: metrics.pendingReportsCount > 0,
    },
  ];

  return (
    <PortalMetricGrid columns={5} ariaLabel="Operational Summary Metrics">
      {cards.map((card) => (
        <PortalMetricCard
          key={card.id}
          id={card.id}
          title={card.title}
          value={card.value}
          icon={card.icon}
          badge={card.badge}
          badgeColor={card.badgeColor}
          detail={card.detail}
          href={card.href}
          linkText={card.linkText}
          pulse={card.pulse}
          isLoading={isLoading}
        />
      ))}
    </PortalMetricGrid>
  );
}
