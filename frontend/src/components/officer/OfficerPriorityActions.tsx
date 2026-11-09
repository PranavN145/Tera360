"use client";

import React, { useState } from "react";
import Link from "next/link";
import { HazardReportOutput, PublicAlertItem } from "@/types/public";

export interface PriorityActionItem {
  id: string;
  title: string;
  priority: "Urgent" | "High" | "Medium";
  category: "Alert" | "Report" | "Road" | "Evacuation";
  entityId: string;
  context: string;
  targetHref: string;
  actionLabel: string;
}

interface OfficerPriorityActionsProps {
  reports?: HazardReportOutput[];
  alerts?: PublicAlertItem[];
  isLoading?: boolean;
}

const DEFAULT_ACTIONS: PriorityActionItem[] = [
  {
    id: "action-1",
    title: "Approve Emergency Broadcast for NH-29 Blockage",
    priority: "Urgent",
    category: "Alert",
    entityId: "NH-29 / Dzüdza Bridge",
    context: "Massive 60m mud deposit severed transit. Light vehicles need diversion via Tsiesema bypass.",
    targetHref: "/officer/alerts",
    actionLabel: "Broadcast Advisory →",
  },
  {
    id: "action-2",
    title: "Assign Inspector to Citizen Report #REP-104",
    priority: "High",
    category: "Report",
    entityId: "REP-104 (Kohima Ridge)",
    context: "Visible tension cracks and rock displacement reported near highway cut slope.",
    targetHref: "/officer/reports",
    actionLabel: "Triage Report →",
  },
  {
    id: "action-3",
    title: "Coordinate BRO Highway Clearing Convoy on NH-10",
    priority: "High",
    category: "Road",
    entityId: "NH-10 (29th Mile)",
    context: "Single-lane transit restriction active due to active rockfall. Alternative Lava route operational.",
    targetHref: "/officer/roads",
    actionLabel: "Inspect Clearances →",
  },
  {
    id: "action-4",
    title: "Verify Evacuation Shelter Capacity for Phesama Village",
    priority: "Medium",
    category: "Evacuation",
    entityId: "Phesama Community Hall",
    context: "3,400 villagers in high-runoff zone. Verify high-ground shelter supplies and contact headman.",
    targetHref: "/officer/villages",
    actionLabel: "Review Shelter →",
  },
];

export default function OfficerPriorityActions({
  reports = [],
  alerts = [],
  isLoading = false,
}: OfficerPriorityActionsProps) {
  // Dynamically augment with live pending reports or alerts if available
  const initialActions: PriorityActionItem[] = React.useMemo(() => {
    const list: PriorityActionItem[] = [...DEFAULT_ACTIONS];

    // If there are unreviewed reports, prioritize them
    const pendingReports = reports.filter((r) => r.status === "submitted");
    if (pendingReports.length > 0) {
      const topReport = pendingReports[0];
      list[1] = {
        id: `report-${topReport.reportId}`,
        title: `Assign Inspector to Ground Report #${topReport.reportId}`,
        priority: "High",
        category: "Report",
        entityId: `${topReport.hazardType} at ${topReport.location}`,
        context: topReport.description || "Ground observation awaiting officer verification.",
        targetHref: "/officer/reports",
        actionLabel: "Triage Report →",
      };
    }

    return list;
  }, [reports, alerts]);

  // Keep track of actions marked as completed/addressed during the officer's shift
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<"all" | "pending" | "completed">("all");

  const toggleCompleted = (id: string) => {
    setCompletedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const visibleActions = initialActions.filter((a) => {
    const isDone = completedIds.has(a.id);
    if (filter === "pending") return !isDone;
    if (filter === "completed") return isDone;
    return true;
  });

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case "Urgent":
        return "bg-red-100 text-red-800 border-red-200";
      case "High":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "Medium":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <div className="bg-[#FAF8F2] border border-[#173D32]/12 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-4 border-b border-[#173D32]/10 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm">⚡</span>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#173D32]/70">
              Command Center Triage
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-extrabold text-[#173D32] mt-0.5">
            Priority Action List
          </h3>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center rounded-xl bg-[#F6F4EC] border border-[#173D32]/15 p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
              filter === "all"
                ? "bg-[#173D32] text-[#F6F4EC] shadow-2xs"
                : "text-[#173D32]/70 hover:text-[#173D32]"
            }`}
          >
            All ({initialActions.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("pending")}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
              filter === "pending"
                ? "bg-[#173D32] text-[#F6F4EC] shadow-2xs"
                : "text-[#173D32]/70 hover:text-[#173D32]"
            }`}
          >
            Pending ({initialActions.length - completedIds.size})
          </button>
          <button
            type="button"
            onClick={() => setFilter("completed")}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
              filter === "completed"
                ? "bg-[#173D32] text-[#F6F4EC] shadow-2xs"
                : "text-[#173D32]/70 hover:text-[#173D32]"
            }`}
          >
            Done ({completedIds.size})
          </button>
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-20 rounded-2xl bg-[#173D32]/5 animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && visibleActions.length === 0 && (
        <div className="text-center py-10 text-[#173D32]/60 text-xs">
          <span>
            {filter === "completed"
              ? "No actions marked as completed yet."
              : "✅ All operational priority tasks have been addressed."}
          </span>
        </div>
      )}

      {/* Actions List */}
      {!isLoading && visibleActions.length > 0 && (
        <div className="space-y-3">
          {visibleActions.map((action) => {
            const isDone = completedIds.has(action.id);

            return (
              <div
                key={action.id}
                className={`p-4 rounded-2xl border transition-all ${
                  isDone
                    ? "bg-[#F6F4EC]/60 border-[#173D32]/10 opacity-70"
                    : "bg-[#F6F4EC] border-[#173D32]/15 hover:border-[#173D32]/30 shadow-2xs"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Left: Checkbox & Info */}
                  <div className="flex items-start gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => toggleCompleted(action.id)}
                      className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 cursor-pointer transition-colors ${
                        isDone
                          ? "bg-[#173D32] border-[#173D32] text-white"
                          : "border-[#173D32]/30 hover:border-[#173D32] bg-white"
                      }`}
                      aria-label={`Mark action "${action.title}" as ${isDone ? "incomplete" : "complete"}`}
                    >
                      {isDone && (
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${getPriorityStyle(
                            action.priority
                          )}`}
                        >
                          {action.priority}
                        </span>
                        <span className="text-[11px] font-mono text-[#173D32]/60 font-semibold truncate">
                          {action.category} · {action.entityId}
                        </span>
                      </div>

                      <h4
                        className={`text-xs sm:text-sm font-extrabold text-[#173D32] leading-tight ${
                          isDone ? "line-through text-[#173D32]/60" : ""
                        }`}
                      >
                        {action.title}
                      </h4>

                      <p className="text-[11px] text-[#173D32]/75 font-medium mt-1 leading-snug">
                        {action.context}
                      </p>
                    </div>
                  </div>

                  {/* Right: Action Button */}
                  <div className="shrink-0 self-center">
                    <Link
                      href={action.targetHref}
                      className="px-3 py-1.5 rounded-xl bg-[#173D32] hover:bg-[#1a4437] text-[#F6F4EC] text-xs font-bold transition-all shadow-2xs whitespace-nowrap inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>{action.actionLabel}</span>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
