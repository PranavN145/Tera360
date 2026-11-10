"use client";

import React from "react";
import { AlertTriangle, Bell, Houses, LucideIcon, Users } from "lucide-react";
import { VillageOverviewMetrics } from "@/types/village";
import PortalMetricGrid from "@/components/portal/PortalMetricGrid";
import OfficerKpiCard from "@/components/officer/OfficerKpiCard";

interface VillageOverviewCardsProps {
  metrics: VillageOverviewMetrics;
  isLoading?: boolean;
}

interface SummaryCardConfig {
  id: string;
  title: string;
  value: string | number;
  unit: string;
  badge: string;
  badgeTone: "red" | "amber" | "green" | "blue" | "neutral";
  accent?: "red" | "amber" | "green" | "blue";
  detail: string;
  icon: LucideIcon;
}

export default function VillageOverviewCards({
  metrics,
  isLoading = false,
}: VillageOverviewCardsProps) {
  const cards: SummaryCardConfig[] = [
    {
      id: "total-villages",
      title: "Total Monitored",
      value: metrics.totalMonitored,
      unit: "Settlements",
      badge: "Active Grid",
      badgeTone: "neutral",
      detail: "Monitored across Northeast mountain corridors",
      icon: Houses,
    },
    {
      id: "high-risk-villages",
      title: "High-Risk Villages",
      value: metrics.highRiskCount,
      unit: "Critical / High",
      badge: metrics.highRiskCount > 0 ? "Vulnerable" : "Nominal",
      badgeTone: metrics.highRiskCount > 0 ? "red" : "green",
      accent: metrics.highRiskCount > 0 ? "red" : "green",
      detail:
        metrics.highRiskCount > 0
          ? "Settlements located in critical runoff zones"
          : "No settlements currently in critical threat band",
      icon: AlertTriangle,
    },
    {
      id: "population-at-risk",
      title: "Population at Risk",
      value: metrics.populationAtRisk.toLocaleString("en-IN"),
      unit: "Residents",
      badge: metrics.populationAtRisk > 0 ? "Priority Target" : "Protected",
      badgeTone: metrics.populationAtRisk > 0 ? "amber" : "green",
      accent: metrics.populationAtRisk > 0 ? "amber" : "green",
      detail: "Estimated population within elevated hazard slopes",
      icon: Users,
    },
    {
      id: "villages-active-alerts",
      title: "Active Alerts",
      value: metrics.villagesWithActiveAlerts,
      unit: "Villages impacted",
      badge:
        metrics.villagesWithActiveAlerts > 0 ? "Advisories Active" : "No Alerts",
      badgeTone: metrics.villagesWithActiveAlerts > 0 ? "red" : "green",
      accent: metrics.villagesWithActiveAlerts > 0 ? "red" : "green",
      detail: "Live public alerts broadcasting to local residents",
      icon: Bell,
    },
  ];

  return (
    <PortalMetricGrid columns={4} ariaLabel="Village Overview Metrics">
      {cards.map((card) => (
        <OfficerKpiCard
          key={card.id}
          id={card.id}
          variant="summary"
          title={card.title}
          value={card.value}
          unit={card.unit}
          icon={card.icon}
          accent={card.accent}
          badge={card.badge}
          badgeTone={card.badgeTone}
          detail={card.detail}
          isLoading={isLoading}
        />
      ))}
    </PortalMetricGrid>
  );
}
