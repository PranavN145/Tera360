"use client";

import React from "react";
import { VillageOverviewMetrics } from "@/types/village";
import PortalMetricGrid from "@/components/portal/PortalMetricGrid";
import PortalMetricCard from "@/components/portal/PortalMetricCard";

interface VillageOverviewCardsProps {
  metrics: VillageOverviewMetrics;
  isLoading?: boolean;
}

export default function VillageOverviewCards({
  metrics,
  isLoading = false,
}: VillageOverviewCardsProps) {
  const cards = [
    {
      id: "total-villages",
      title: "Total Monitored",
      value: metrics.totalMonitored,
      unit: "Settlements",
      badge: "Active Grid",
      badgeColor: "bg-[#173D32]/10 text-[#173D32] border-[#173D32]/20",
      detail: "Monitored across Northeast mountain corridors",
      icon: "🏘️",
      pulse: false,
    },
    {
      id: "high-risk-villages",
      title: "High-Risk Villages",
      value: metrics.highRiskCount,
      unit: "Critical / High",
      badge: metrics.highRiskCount > 0 ? "Vulnerable" : "Nominal",
      badgeColor:
        metrics.highRiskCount > 0
          ? "bg-red-100 text-red-800 border-red-200"
          : "bg-emerald-100 text-emerald-800 border-emerald-200",
      detail:
        metrics.highRiskCount > 0
          ? "Settlements located in critical runoff zones"
          : "No settlements currently in critical threat band",
      icon: "⚠️",
      pulse: metrics.highRiskCount > 0,
    },
    {
      id: "population-at-risk",
      title: "Population at Risk",
      value: metrics.populationAtRisk,
      unit: "Residents",
      badge: metrics.populationAtRisk > 0 ? "Priority Target" : "Protected",
      badgeColor:
        metrics.populationAtRisk > 0
          ? "bg-amber-100 text-amber-900 border-amber-300"
          : "bg-emerald-100 text-emerald-800 border-emerald-200",
      detail: "Estimated population within elevated hazard slopes",
      icon: "👥",
      pulse: metrics.populationAtRisk > 0,
    },
    {
      id: "villages-active-alerts",
      title: "Active Alerts",
      value: metrics.villagesWithActiveAlerts,
      unit: "Villages impacted",
      badge:
        metrics.villagesWithActiveAlerts > 0 ? "Advisories Active" : "No Alerts",
      badgeColor:
        metrics.villagesWithActiveAlerts > 0
          ? "bg-red-100 text-red-800 border-red-200"
          : "bg-[#173D32]/10 text-[#173D32] border-[#173D32]/20",
      detail: "Live public alerts broadcasting to local residents",
      icon: "📢",
      pulse: metrics.villagesWithActiveAlerts > 0,
    },
  ];

  return (
    <PortalMetricGrid columns={4} ariaLabel="Village Overview Metrics">
      {cards.map((card) => (
        <PortalMetricCard
          key={card.id}
          id={card.id}
          title={card.title}
          value={card.value}
          unit={card.unit}
          icon={card.icon}
          badge={card.badge}
          badgeColor={card.badgeColor}
          detail={card.detail}
          pulse={card.pulse}
          isLoading={isLoading}
        />
      ))}
    </PortalMetricGrid>
  );
}
