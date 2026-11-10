"use client";

import React, { useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  ListChecks,
  MapPin,
  Minus,
  MoreVertical,
  RotateCcw,
  X,
  Zap,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import RelativeTime from "@/components/common/RelativeTime";
import DropdownPortal from "@/components/ui/DropdownPortal";
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
  locationPrimary?: string;
  locationSecondary?: string;
  updatedAt?: string;
}

interface OfficerPriorityActionsProps {
  reports?: HazardReportOutput[];
  alerts?: PublicAlertItem[];
  isLoading?: boolean;
}

type FilterTab = "all" | "pending" | "completed";

const PRIORITY_STYLES: Record<
  PriorityActionItem["priority"],
  { label: string; badgeClass: string }
> = {
  Urgent: {
    label: "URGENT",
    badgeClass: "bg-[#FDE8E8] text-[#B91C1C] border border-[#FECACA]/60",
  },
  High: {
    label: "HIGH",
    badgeClass: "bg-[#FEEFD6] text-[#9A5B06] border border-[#FDE68A]/70",
  },
  Medium: {
    label: "MEDIUM",
    badgeClass: "bg-[#E1ECFF] text-[#1D4ED8] border border-[#BFDBFE]/70",
  },
};

const DEFAULT_ACTIONS: PriorityActionItem[] = [
  {
    id: "action-1",
    title: "Approve Emergency Broadcast for NH-29 Blockage",
    priority: "Urgent",
    category: "Alert",
    entityId: "NH-29 / Dzüdza Bridge",
    locationPrimary: "NH-29",
    locationSecondary: "Dzüdza Bridge",
    context:
      "Massive 60m mud deposit severed transit. Light vehicles need diversion via Tsiesema bypass.",
    targetHref: "/officer/alerts",
    actionLabel: "Broadcast Advisory →",
  },
  {
    id: "action-2",
    title: "Assign Inspector to Citizen Report #REP-104",
    priority: "High",
    category: "Report",
    entityId: "REP-104 (Kohima Ridge)",
    locationPrimary: "REP-104",
    locationSecondary: "Kohima Ridge",
    context:
      "Visible tension cracks and rock displacement reported near highway cut slope.",
    targetHref: "/officer/reports",
    actionLabel: "Triage Report →",
  },
  {
    id: "action-3",
    title: "Coordinate BRO Highway Clearing Convoy on NH-10",
    priority: "High",
    category: "Road",
    entityId: "NH-10 (29th Mile)",
    locationPrimary: "NH-10",
    locationSecondary: "29th Mile",
    context:
      "Single-lane transit restriction active due to active rockfall. Alternative Lava route operational.",
    targetHref: "/officer/roads",
    actionLabel: "Inspect Clearances →",
  },
  {
    id: "action-4",
    title: "Verify Evacuation Shelter Capacity for Phesama Village",
    priority: "Medium",
    category: "Evacuation",
    entityId: "Phesama Community Hall",
    locationPrimary: "Phesama",
    locationSecondary: "Community Hall",
    context:
      "3,400 villagers in high-runoff zone. Verify high-ground shelter supplies and contact headman.",
    targetHref: "/officer/villages",
    actionLabel: "Review Shelter →",
  },
];

function splitLocationLines(
  rawLocation: string,
  fallbackSecondary?: string
): { primary: string; secondary?: string } {
  const cleaned = rawLocation.trim();
  if (!cleaned) {
    return { primary: fallbackSecondary || "Monitored Sector" };
  }

  // Handle explicit separators: "/", ",", "—", or spaced " - " (avoiding highway codes like "NH-29")
  const explicitMatch =
    cleaned.match(/^(.+?)\s*(?:\/|,|—)\s*(.+)$/) ||
    cleaned.match(/^(.+?)\s+-\s+(.+)$/);
  if (explicitMatch) {
    return {
      primary: explicitMatch[1].trim(),
      secondary: explicitMatch[2].trim(),
    };
  }

  // Handle "NH-10 (29th Mile)"
  const parenMatch = cleaned.match(/^(.+?)\s*\((.+?)\)$/);
  if (parenMatch) {
    return {
      primary: parenMatch[1].trim(),
      secondary: parenMatch[2].trim(),
    };
  }

  // Handle "NH-29 KM 38"
  const highwayMatch = cleaned.match(/^(NH-\d+[A-Za-z]?)\s+(.+)$/i);
  if (highwayMatch) {
    return {
      primary: highwayMatch[1].toUpperCase(),
      secondary: highwayMatch[2].trim(),
    };
  }

  return {
    primary: cleaned,
    secondary: fallbackSecondary,
  };
}

function findMatchingAlertTimestamp(
  alerts: PublicAlertItem[],
  corridorOrKeyword: string
): string | undefined {
  const needle = corridorOrKeyword.trim().toLowerCase();
  const match = alerts.find((alert) => {
    const corridor = (alert.corridor || "").toLowerCase();
    const title = (alert.title || "").toLowerCase();
    const location = (alert.location || "").toLowerCase();
    return (
      corridor === needle ||
      corridor.includes(needle) ||
      title.includes(needle) ||
      location.includes(needle)
    );
  });
  return match?.publishedAt || match?.createdAt;
}

function mapReportSeverityToPriority(
  severity?: string
): PriorityActionItem["priority"] {
  const normalized = (severity || "").trim().toLowerCase();
  if (normalized === "critical") return "Urgent";
  if (normalized === "watch") return "Medium";
  return "High";
}

function stripTrailingArrow(label: string): string {
  return label.replace(/\s*→\s*$/, "").trim();
}

interface ActionCheckboxProps {
  checked: boolean;
  indeterminate?: boolean;
  disabled?: boolean;
  onChange: () => void;
  ariaLabel: string;
}

function ActionCheckbox({
  checked,
  indeterminate = false,
  disabled = false,
  onChange,
  ariaLabel,
}: ActionCheckboxProps) {
  const isActive = checked || indeterminate;
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? "mixed" : checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onChange}
      className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173D32]/40 disabled:opacity-50 disabled:cursor-not-allowed ${
        isActive
          ? "bg-[#173D32] border-[#173D32] text-[#F6F4EC] cursor-pointer"
          : "bg-white border-[#173D32]/25 hover:border-[#173D32]/60 text-transparent cursor-pointer"
      }`}
    >
      {indeterminate ? (
        <Minus className="w-3.5 h-3.5" strokeWidth={2.75} aria-hidden="true" />
      ) : checked ? (
        <Check className="w-3.5 h-3.5" strokeWidth={2.75} aria-hidden="true" />
      ) : null}
    </button>
  );
}

function PriorityBadge({ priority }: { priority: PriorityActionItem["priority"] }) {
  const config = PRIORITY_STYLES[priority] || PRIORITY_STYLES.Medium;
  return (
    <span
      className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wide leading-none whitespace-nowrap ${config.badgeClass}`}
    >
      {config.label}
    </span>
  );
}

function StatusBadgePill({ isDone }: { isDone: boolean }) {
  return (
    <span
      className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-bold leading-none whitespace-nowrap ${
        isDone
          ? "bg-[#DCFCE7] text-[#166534]"
          : "bg-[#FEEFD6] text-[#9A5B06]"
      }`}
    >
      {isDone ? "Done" : "Pending"}
    </span>
  );
}

export default function OfficerPriorityActions({
  reports = [],
  alerts = [],
  isLoading = false,
}: OfficerPriorityActionsProps) {
  const { addToast } = useApp();

  // Dynamically augment with live pending reports and matching alert timestamps
  const actions: PriorityActionItem[] = useMemo(() => {
    const list: PriorityActionItem[] = DEFAULT_ACTIONS.map((item) => {
      if (item.id === "action-1") {
        return {
          ...item,
          updatedAt: findMatchingAlertTimestamp(alerts, "NH-29"),
        };
      }
      if (item.id === "action-3") {
        return {
          ...item,
          updatedAt: findMatchingAlertTimestamp(alerts, "NH-10"),
        };
      }
      if (item.id === "action-4") {
        return {
          ...item,
          updatedAt: findMatchingAlertTimestamp(alerts, "Phesama"),
        };
      }
      return { ...item };
    });

    const pendingReports = reports.filter((r) => r.status === "submitted");
    if (pendingReports.length > 0) {
      const topReport = pendingReports[0];
      const parsedLocation = splitLocationLines(
        topReport.location,
        topReport.state
      );

      list[1] = {
        id: `report-${topReport.reportId}`,
        title: `Assign Inspector to Ground Report #${topReport.reportId}`,
        priority: mapReportSeverityToPriority(topReport.severity),
        category: "Report",
        entityId: `${topReport.hazardType} at ${topReport.location}`,
        locationPrimary: parsedLocation.primary,
        locationSecondary: parsedLocation.secondary,
        updatedAt: topReport.createdAt,
        context:
          topReport.description ||
          "Ground observation awaiting officer verification.",
        targetHref: "/officer/reports",
        actionLabel: "Triage Report →",
      };
    }

    return list;
  }, [reports, alerts]);

  // Track shift completion, timestamps on status updates, filters, selection, and menus
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [statusUpdatedAt, setStatusUpdatedAt] = useState<Record<string, string>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<FilterTab>("all");

  const [isBulkMenuOpen, setIsBulkMenuOpen] = useState(false);
  const [openRowMenuId, setOpenRowMenuId] = useState<string | null>(null);

  const bulkTriggerRef = useRef<HTMLButtonElement | null>(null);
  const activeRowTriggerRef = useRef<HTMLElement | null>(null);

  const pendingCount = useMemo(
    () => actions.filter((a) => !completedIds.has(a.id)).length,
    [actions, completedIds]
  );

  const doneCount = useMemo(
    () => actions.filter((a) => completedIds.has(a.id)).length,
    [actions, completedIds]
  );

  const visibleActions = useMemo(
    () =>
      actions.filter((action) => {
        const isDone = completedIds.has(action.id);
        if (filter === "pending") return !isDone;
        if (filter === "completed") return isDone;
        return true;
      }),
    [actions, completedIds, filter]
  );

  // Scope selection computations to currently visible rows so actions match what the user sees
  const visibleSelectedIds = useMemo(
    () => visibleActions.filter((a) => selectedIds.has(a.id)).map((a) => a.id),
    [visibleActions, selectedIds]
  );

  const selectedPendingIds = useMemo(
    () => visibleSelectedIds.filter((id) => !completedIds.has(id)),
    [visibleSelectedIds, completedIds]
  );

  const selectedDoneIds = useMemo(
    () => visibleSelectedIds.filter((id) => completedIds.has(id)),
    [visibleSelectedIds, completedIds]
  );

  const allVisibleSelected =
    visibleActions.length > 0 &&
    visibleSelectedIds.length === visibleActions.length;
  const someVisibleSelected =
    visibleSelectedIds.length > 0 && !allVisibleSelected;

  const visiblePendingIds = useMemo(
    () => visibleActions.filter((a) => !completedIds.has(a.id)).map((a) => a.id),
    [visibleActions, completedIds]
  );

  const activeRowAction = useMemo(
    () => actions.find((a) => a.id === openRowMenuId) ?? null,
    [actions, openRowMenuId]
  );

  const handleFilterChange = (nextFilter: FilterTab) => {
    setFilter(nextFilter);
    setSelectedIds(new Set());
    setIsBulkMenuOpen(false);
    setOpenRowMenuId(null);
  };

  const toggleRowSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAllVisible = () => {
    if (visibleActions.length === 0) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        visibleActions.forEach((a) => next.delete(a.id));
      } else {
        visibleActions.forEach((a) => next.add(a.id));
      }
      return next;
    });
  };

  const updateActionStatuses = (ids: string[], markDone: boolean) => {
    if (ids.length === 0) return;

    const nowIso = new Date().toISOString();

    setCompletedIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => {
        if (markDone) {
          next.add(id);
        } else {
          next.delete(id);
        }
      });
      return next;
    });

    setStatusUpdatedAt((prev) => {
      const next = { ...prev };
      ids.forEach((id) => {
        next[id] = nowIso;
      });
      return next;
    });

    setSelectedIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.delete(id));
      return next;
    });

    addToast({
      title: markDone ? "Priority Action Updated" : "Action Reopened",
      description:
        ids.length === 1
          ? `1 task marked as ${markDone ? "Done" : "Pending"}.`
          : `${ids.length} tasks marked as ${markDone ? "Done" : "Pending"}.`,
      type: markDone ? "success" : "info",
    });
  };

  const handleMarkSelectedDone = () => {
    updateActionStatuses(selectedPendingIds, true);
    setIsBulkMenuOpen(false);
  };

  const handleMarkSelectedPending = () => {
    updateActionStatuses(selectedDoneIds, false);
    setIsBulkMenuOpen(false);
  };

  const handleSelectAllPending = () => {
    if (visiblePendingIds.length === 0) return;
    setSelectedIds(new Set(visiblePendingIds));
    setIsBulkMenuOpen(false);
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
    setIsBulkMenuOpen(false);
  };

  const getLocationParts = (action: PriorityActionItem) => {
    if (action.locationPrimary) {
      return {
        primary: action.locationPrimary,
        secondary: action.locationSecondary,
      };
    }
    return splitLocationLines(action.entityId);
  };

  const filterTabs: Array<{ key: FilterTab; label: string; count: number }> = [
    { key: "all", label: "All", count: actions.length },
    { key: "pending", label: "Pending", count: pendingCount },
    { key: "completed", label: "Done", count: doneCount },
  ];

  return (
    <div className="bg-[#FAF8F2] border border-[#173D32]/12 rounded-3xl p-5 sm:p-6 shadow-xs">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 pb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl bg-[#EAF0E6] border border-[#173D32]/10 flex items-center justify-center shrink-0 text-[#173D32]"
            aria-hidden="true"
          >
            <Zap className="w-5 h-5 fill-[#173D32]" strokeWidth={1.75} />
          </div>
          <div>
            <span className="block text-[11px] font-bold uppercase tracking-[0.06em] text-[#173D32]/70 leading-none">
              Command Center Triage
            </span>
            <h3 className="text-lg sm:text-xl font-extrabold text-[#173D32] tracking-tight mt-1 leading-tight">
              Priority Action List
            </h3>
          </div>
        </div>

        {/* All / Pending / Done Filter Tabs */}
        <div
          role="tablist"
          aria-label="Filter priority actions"
          className="inline-flex items-center rounded-full bg-[#F2EFE6] border border-[#173D32]/12 p-1 self-start sm:self-auto"
        >
          {filterTabs.map((tab) => {
            const isActive = filter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => handleFilterChange(tab.key)}
                className={`px-3.5 sm:px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? "bg-[#173D32] text-[#F6F4EC] shadow-2xs"
                    : "text-[#173D32]/85 hover:text-[#173D32]"
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3 pt-1">
        <div className="flex items-center gap-2.5 pl-3.5 md:pl-[15px]">
          <ActionCheckbox
            checked={allVisibleSelected}
            indeterminate={someVisibleSelected}
            disabled={visibleActions.length === 0 || isLoading}
            onChange={toggleSelectAllVisible}
            ariaLabel={
              allVisibleSelected
                ? "Deselect all visible priority actions"
                : "Select all visible priority actions"
            }
          />
          <button
            type="button"
            onClick={toggleSelectAllVisible}
            disabled={visibleActions.length === 0 || isLoading}
            className="text-xs sm:text-[13px] font-bold text-[#173D32] hover:text-[#173D32]/80 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Select All
          </button>
          {visibleSelectedIds.length > 0 && (
            <span className="text-[11px] font-semibold text-[#173D32]/70 tabular-nums">
              ({visibleSelectedIds.length} selected)
            </span>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleMarkSelectedDone}
            disabled={isLoading || selectedPendingIds.length === 0}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-xs font-bold transition-all whitespace-nowrap ${
              selectedPendingIds.length > 0
                ? "bg-[#173D32] text-[#F6F4EC] border-[#173D32] hover:bg-[#1a4437] shadow-2xs cursor-pointer"
                : "bg-[#F6F4EC]/75 border-[#173D32]/12 text-[#173D32]/65 disabled:cursor-not-allowed"
            }`}
          >
            <Check className="w-3.5 h-3.5 shrink-0" strokeWidth={2.2} aria-hidden="true" />
            <span>Mark as Done</span>
          </button>

          <button
            ref={bulkTriggerRef}
            type="button"
            onClick={() => {
              setOpenRowMenuId(null);
              setIsBulkMenuOpen((prev) => !prev);
            }}
            disabled={isLoading || actions.length === 0}
            aria-haspopup="menu"
            aria-expanded={isBulkMenuOpen}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/85 hover:bg-white border border-[#173D32]/25 text-xs font-bold text-[#173D32] transition-all whitespace-nowrap shadow-2xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>Bulk Action</span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-[#173D32]/75 transition-transform duration-150 ${
                isBulkMenuOpen ? "rotate-180" : ""
              }`}
              strokeWidth={2.2}
              aria-hidden="true"
            />
          </button>
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="space-y-2">
          <div className="h-9 rounded-xl bg-[#F2EFE6] animate-pulse" />
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="h-14 rounded-2xl bg-white/80 border border-[#173D32]/8 animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && visibleActions.length === 0 && (
        <div className="rounded-2xl bg-white/85 border border-[#173D32]/10 py-10 px-4 text-center flex flex-col items-center justify-center gap-2">
          <span className="w-9 h-9 rounded-xl bg-[#EAF0E6] text-[#173D32] flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
          </span>
          <p className="text-xs sm:text-sm font-bold text-[#173D32]">
            {filter === "completed"
              ? "No priority actions marked as done yet"
              : "All priority actions have been completed"}
          </p>
          <p className="text-xs text-[#173D32]/65">
            {filter === "completed"
              ? "Select pending items above and click Mark as Done to update their shift status."
              : "Switch to All or Done to review completed triage tasks."}
          </p>
        </div>
      )}

      {/* Desktop & Tablet Structured Table */}
      {!isLoading && visibleActions.length > 0 && (
        <>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full border-separate border-spacing-x-0 border-spacing-y-1.5 text-left">
              <thead>
                <tr>
                  <th className="w-11 pl-3.5 pr-1 py-2.5 bg-[#F2EFE6]/90 rounded-l-xl">
                    <span className="sr-only">Select</span>
                  </th>
                  <th className="w-[108px] px-2.5 py-2.5 bg-[#F2EFE6]/90 text-xs font-bold text-[#173D32]/85">
                    Priority
                  </th>
                  <th className="px-3 py-2.5 bg-[#F2EFE6]/90 text-xs font-bold text-[#173D32]/85">
                    Action
                  </th>
                  <th className="w-[168px] lg:w-[192px] px-3 py-2.5 bg-[#F2EFE6]/90 text-xs font-bold text-[#173D32]/85">
                    Location
                  </th>
                  <th className="w-[106px] lg:w-[116px] px-3 py-2.5 bg-[#F2EFE6]/90 text-xs font-bold text-[#173D32]/85 whitespace-nowrap">
                    Updated
                  </th>
                  <th className="w-[102px] lg:w-[112px] px-2.5 py-2.5 bg-[#F2EFE6]/90 text-xs font-bold text-[#173D32]/85">
                    Status
                  </th>
                  <th className="w-11 pl-1 pr-3 py-2.5 bg-[#F2EFE6]/90 rounded-r-xl">
                    <span className="sr-only">Row actions</span>
                  </th>
                </tr>
              </thead>

              <tbody>
                {visibleActions.map((action) => {
                  const isDone = completedIds.has(action.id);
                  const isSelected = selectedIds.has(action.id);
                  const loc = getLocationParts(action);
                  const effectiveUpdatedAt =
                    statusUpdatedAt[action.id] || action.updatedAt;

                  const cellBg = isSelected
                    ? "bg-[#EFF4EC] border-[#173D32]/30"
                    : "bg-white/95 border-[#173D32]/10 group-hover:bg-white group-hover:border-[#173D32]/22";

                  return (
                    <tr key={action.id} className="group">
                      <td
                        className={`pl-3.5 pr-1 py-3 align-middle border-y border-l rounded-l-2xl transition-colors ${cellBg}`}
                      >
                        <ActionCheckbox
                          checked={isSelected}
                          onChange={() => toggleRowSelection(action.id)}
                          ariaLabel={`Select ${action.title}`}
                        />
                      </td>

                      <td
                        className={`px-2.5 py-3 align-middle border-y transition-colors ${cellBg}`}
                      >
                        <PriorityBadge priority={action.priority} />
                      </td>

                      <td
                        className={`px-3 py-3 align-middle border-y transition-colors ${cellBg}`}
                      >
                        <Link
                          href={action.targetHref}
                          className={`block text-[13px] font-bold leading-snug hover:underline focus-visible:outline-none focus-visible:underline ${
                            isDone
                              ? "line-through text-[#173D32]/55"
                              : "text-[#173D32]"
                          }`}
                        >
                          {action.title}
                        </Link>
                      </td>

                      <td
                        className={`px-3 py-3 align-middle border-y transition-colors ${cellBg}`}
                      >
                        <div className="flex items-start gap-1.5 min-w-0">
                          <MapPin
                            className="w-4 h-4 text-[#173D32]/65 shrink-0 mt-0.5"
                            strokeWidth={1.9}
                            aria-hidden="true"
                          />
                          <div className="min-w-0 leading-tight">
                            <span className="block text-xs font-semibold text-[#173D32] truncate">
                              {loc.primary}
                            </span>
                            {loc.secondary && (
                              <span className="block text-xs font-medium text-[#173D32]/75 truncate mt-0.5">
                                {loc.secondary}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td
                        className={`px-3 py-3 align-middle border-y text-xs font-medium text-[#173D32]/80 whitespace-nowrap tabular-nums transition-colors ${cellBg}`}
                      >
                        <RelativeTime
                          key={effectiveUpdatedAt || "none"}
                          date={effectiveUpdatedAt}
                          fallback="Recently"
                        />
                      </td>

                      <td
                        className={`px-2.5 py-3 align-middle border-y transition-colors ${cellBg}`}
                      >
                        <StatusBadgePill isDone={isDone} />
                      </td>

                      <td
                        className={`pl-1 pr-3 py-3 align-middle border-y border-r rounded-r-2xl text-right transition-colors ${cellBg}`}
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            setIsBulkMenuOpen(false);
                            if (openRowMenuId === action.id) {
                              setOpenRowMenuId(null);
                            } else {
                              activeRowTriggerRef.current = e.currentTarget;
                              setOpenRowMenuId(action.id);
                            }
                          }}
                          aria-haspopup="menu"
                          aria-expanded={openRowMenuId === action.id}
                          aria-label={`Actions for ${action.title}`}
                          className="w-8 h-8 rounded-lg inline-flex items-center justify-center text-[#173D32]/70 hover:text-[#173D32] hover:bg-[#173D32]/8 transition-colors cursor-pointer"
                        >
                          <MoreVertical className="w-4 h-4" aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Responsive Compact View (< 768px) */}
          <div className="md:hidden space-y-2.5">
            {visibleActions.map((action) => {
              const isDone = completedIds.has(action.id);
              const isSelected = selectedIds.has(action.id);
              const loc = getLocationParts(action);
              const effectiveUpdatedAt =
                statusUpdatedAt[action.id] || action.updatedAt;

              return (
                <div
                  key={action.id}
                  className={`rounded-2xl border px-3.5 py-3 transition-colors ${
                    isSelected
                      ? "bg-[#EFF4EC] border-[#173D32]/30"
                      : "bg-white/95 border-[#173D32]/10"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <ActionCheckbox
                        checked={isSelected}
                        onChange={() => toggleRowSelection(action.id)}
                        ariaLabel={`Select ${action.title}`}
                      />
                      <PriorityBadge priority={action.priority} />
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <StatusBadgePill isDone={isDone} />
                      <button
                        type="button"
                        onClick={(e) => {
                          setIsBulkMenuOpen(false);
                          if (openRowMenuId === action.id) {
                            setOpenRowMenuId(null);
                          } else {
                            activeRowTriggerRef.current = e.currentTarget;
                            setOpenRowMenuId(action.id);
                          }
                        }}
                        aria-haspopup="menu"
                        aria-expanded={openRowMenuId === action.id}
                        aria-label={`Actions for ${action.title}`}
                        className="w-7 h-7 rounded-lg inline-flex items-center justify-center text-[#173D32]/70 hover:text-[#173D32] hover:bg-[#173D32]/8 transition-colors cursor-pointer"
                      >
                        <MoreVertical className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  <Link
                    href={action.targetHref}
                    className={`block mt-2.5 text-[13px] font-bold leading-snug hover:underline ${
                      isDone
                        ? "line-through text-[#173D32]/55"
                        : "text-[#173D32]"
                    }`}
                  >
                    {action.title}
                  </Link>

                  <div className="mt-2 flex items-center justify-between gap-3 text-xs text-[#173D32]/75">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <MapPin
                        className="w-3.5 h-3.5 text-[#173D32]/65 shrink-0"
                        strokeWidth={1.9}
                        aria-hidden="true"
                      />
                      <span className="truncate font-medium">
                        {loc.secondary
                          ? `${loc.primary} · ${loc.secondary}`
                          : loc.primary}
                      </span>
                    </div>
                    <RelativeTime
                      key={effectiveUpdatedAt || "none"}
                      date={effectiveUpdatedAt}
                      fallback="Recently"
                      className="shrink-0 font-medium tabular-nums"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Bulk Action Dropdown Menu */}
      <DropdownPortal
        isOpen={isBulkMenuOpen}
        onClose={() => setIsBulkMenuOpen(false)}
        triggerRef={bulkTriggerRef}
        align="right"
        offset={6}
        role="menu"
        aria-label="Bulk priority actions"
        className="w-56! max-w-[224px]! p-1.5 rounded-2xl!"
      >
        <div className="px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#173D32]/60 border-b border-[#173D32]/10 mb-1">
          {visibleSelectedIds.length > 0
            ? `${visibleSelectedIds.length} Selected`
            : "Bulk Actions"}
        </div>

        <button
          type="button"
          role="menuitem"
          disabled={selectedPendingIds.length === 0}
          onClick={handleMarkSelectedDone}
          className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-left text-xs font-bold text-[#173D32] hover:bg-[#173D32]/8 transition-colors cursor-pointer disabled:opacity-45 disabled:hover:bg-transparent disabled:cursor-not-allowed"
        >
          <CheckCircle2 className="w-4 h-4 text-[#173D32] shrink-0" aria-hidden="true" />
          <span>Mark as Done</span>
        </button>

        <button
          type="button"
          role="menuitem"
          disabled={selectedDoneIds.length === 0}
          onClick={handleMarkSelectedPending}
          className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-left text-xs font-bold text-[#173D32] hover:bg-[#173D32]/8 transition-colors cursor-pointer disabled:opacity-45 disabled:hover:bg-transparent disabled:cursor-not-allowed"
        >
          <RotateCcw className="w-4 h-4 text-[#173D32]/80 shrink-0" aria-hidden="true" />
          <span>Mark as Pending</span>
        </button>

        <div className="my-1 border-t border-[#173D32]/10" />

        <button
          type="button"
          role="menuitem"
          disabled={visiblePendingIds.length === 0}
          onClick={handleSelectAllPending}
          className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-left text-xs font-semibold text-[#173D32] hover:bg-[#173D32]/8 transition-colors cursor-pointer disabled:opacity-45 disabled:hover:bg-transparent disabled:cursor-not-allowed"
        >
          <ListChecks className="w-4 h-4 text-[#173D32]/75 shrink-0" aria-hidden="true" />
          <span>Select All Pending</span>
        </button>

        <button
          type="button"
          role="menuitem"
          disabled={visibleSelectedIds.length === 0}
          onClick={handleClearSelection}
          className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-left text-xs font-semibold text-[#173D32]/85 hover:bg-[#173D32]/8 transition-colors cursor-pointer disabled:opacity-45 disabled:hover:bg-transparent disabled:cursor-not-allowed"
        >
          <X className="w-4 h-4 text-[#173D32]/70 shrink-0" aria-hidden="true" />
          <span>Clear Selection</span>
        </button>
      </DropdownPortal>

      {/* Per-Row Three-Dot Action Menu */}
      <DropdownPortal
        isOpen={Boolean(openRowMenuId && activeRowAction)}
        onClose={() => setOpenRowMenuId(null)}
        triggerRef={activeRowTriggerRef}
        align="right"
        offset={6}
        role="menu"
        aria-label={
          activeRowAction
            ? `Actions for ${activeRowAction.title}`
            : "Task actions"
        }
        className="w-52! max-w-[216px]! p-1.5 rounded-2xl!"
      >
        {activeRowAction && (() => {
          const isRowDone = completedIds.has(activeRowAction.id);
          const isRowSelected = selectedIds.has(activeRowAction.id);
          return (
            <>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  updateActionStatuses([activeRowAction.id], !isRowDone);
                  setOpenRowMenuId(null);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-left text-xs font-bold text-[#173D32] hover:bg-[#173D32]/8 transition-colors cursor-pointer"
              >
                {isRowDone ? (
                  <>
                    <RotateCcw className="w-4 h-4 text-[#173D32]/80 shrink-0" aria-hidden="true" />
                    <span>Mark as Pending</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-[#173D32] shrink-0" aria-hidden="true" />
                    <span>Mark as Done</span>
                  </>
                )}
              </button>

              <Link
                href={activeRowAction.targetHref}
                role="menuitem"
                onClick={() => setOpenRowMenuId(null)}
                className="w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl text-left text-xs font-semibold text-[#173D32] hover:bg-[#173D32]/8 transition-colors"
              >
                <span>{stripTrailingArrow(activeRowAction.actionLabel)}</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#173D32]/70 shrink-0" aria-hidden="true" />
              </Link>

              <div className="my-1 border-t border-[#173D32]/10" />

              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  toggleRowSelection(activeRowAction.id);
                  setOpenRowMenuId(null);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-left text-xs font-semibold text-[#173D32]/85 hover:bg-[#173D32]/8 transition-colors cursor-pointer"
              >
                <CheckSquare className="w-4 h-4 text-[#173D32]/75 shrink-0" aria-hidden="true" />
                <span>{isRowSelected ? "Deselect Task" : "Select Task"}</span>
              </button>
            </>
          );
        })()}
      </DropdownPortal>
    </div>
  );
}
