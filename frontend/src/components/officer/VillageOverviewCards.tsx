"use client";

import React from "react";
import { VillageOverviewMetrics } from "@/types/village";

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
      value: metrics.populationAtRisk.toLocaleString(),
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

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-5 sm:p-6 rounded-3xl bg-[#FAF8F2] border border-[#173D32]/10 animate-pulse space-y-3"
          >
            <div className="h-4 bg-[#173D32]/10 rounded-md w-1/2" />
            <div className="h-8 bg-[#173D32]/15 rounded-md w-3/4" />
            <div className="h-3 bg-[#173D32]/10 rounded-md w-5/6" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-6">
      {cards.map((card) => (
        <div
          key={card.id}
          className={`relative p-5 sm:p-6 rounded-3xl border transition-all duration-200 flex flex-col justify-between ${
            card.pulse
              ? "bg-[#FAF8F2] border-red-300 shadow-sm ring-1 ring-red-200"
              : "bg-[#FAF8F2] border-[#173D32]/12 shadow-xs hover:border-[#173D32]/25"
          }`}
        >
          {/* Top Row: Icon + Badge */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-2xl" role="img" aria-hidden="true">
              {card.icon}
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${card.badgeColor}`}
            >
              {card.badge}
            </span>
          </div>

          {/* Metric Value */}
          <div className="my-1.5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#173D32] tracking-tight">
                {card.value}
              </span>
              <span className="text-xs font-bold text-[#173D32]/60">
                {card.unit}
              </span>
            </div>
            <h4 className="text-xs font-extrabold text-[#173D32] mt-0.5">
              {card.title}
            </h4>
          </div>

          {/* Descriptive Subtitle */}
          <div className="pt-2.5 mt-2 border-t border-[#173D32]/8 text-[11px] text-[#173D32]/70 leading-relaxed font-medium">
            {card.detail}
          </div>
        </div>
      ))}
    </div>
  );
}
