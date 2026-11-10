"use client";

import React from "react";
import { Bell, ClipboardList, Houses, Mountain, Road } from "lucide-react";
import OfficerKpiCard, { OfficerKpiCardProps } from "@/components/officer/OfficerKpiCard";

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
  const cards: Array<OfficerKpiCardProps & { id: string }> = [
    {
      id: "critical-zones",
      title: "Critical Zones",
      value: metrics.criticalZonesCount,
      icon: Mountain,
      accent: "red",
      badge: metrics.criticalZonesCount > 0 ? "Red Alert" : "Stable",
      badgeTone: metrics.criticalZonesCount > 0 ? "red" : "green",
      detail:
        metrics.criticalZonesCount > 0
          ? "High slope saturation & active displacement"
          : "All monitored zones within nominal thresholds",
      href: "/officer/map",
    },
    {
      id: "high-risk-roads",
      title: "High-Risk Roads",
      value: metrics.highRiskRoadsCount,
      icon: Road,
      accent: "amber",
      badge: `${metrics.blockedRoadsCount} Blocked`,
      badgeTone:
        metrics.blockedRoadsCount > 0 || metrics.cautionRoadsCount > 0
          ? "amber"
          : "green",
      detail: `${metrics.blockedRoadsCount} blocked, ${metrics.cautionRoadsCount} under caution`,
      href: "/officer/roads",
    },
    {
      id: "active-alerts",
      title: "Active Alerts",
      value: metrics.activeAlertsCount,
      icon: Bell,
      accent: "red",
      badge: `${metrics.criticalAlertsCount} Critical`,
      badgeTone:
        metrics.criticalAlertsCount > 0
          ? "red"
          : metrics.warningAlertsCount > 0
          ? "amber"
          : "green",
      detail: `${metrics.criticalAlertsCount} critical, ${metrics.warningAlertsCount} warning advisories`,
      href: "/officer/alerts",
    },
    {
      id: "villages-at-risk",
      title: "Villages at Risk",
      value: metrics.villagesAtRiskCount,
      icon: Houses,
      accent: "green",
      badge: metrics.villagesAtRiskCount > 0 ? "Vulnerable" : "Nominal",
      badgeTone: metrics.villagesAtRiskCount > 0 ? "amber" : "green",
      detail:
        metrics.villagesAtRiskCount > 0
          ? "Settlements in steep drainage runoff corridors"
          : "No settlements in active runoff alert zones",
      href: "/officer/villages",
    },
    {
      id: "pending-reports",
      title: "Pending Reports",
      value: metrics.pendingReportsCount,
      icon: ClipboardList,
      accent: "blue",
      badge: `${metrics.pendingReportsCount} New`,
      badgeTone: metrics.pendingReportsCount > 0 ? "blue" : "neutral",
      detail: `${metrics.pendingReportsCount} awaiting officer verification (${metrics.totalReportsCount} total)`,
      href: "/officer/reports",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5 xl:gap-4 w-full">
      {cards.map((card) => (
        <OfficerKpiCard
          key={card.id}
          id={card.id}
          title={card.title}
          value={card.value}
          icon={card.icon}
          accent={card.accent}
          badge={card.badge}
          badgeTone={card.badgeTone}
          detail={card.detail}
          href={card.href}
          isLoading={isLoading}
        />
      ))}
    </div>
  );
}
