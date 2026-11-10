"use client";

import React, { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Mountain,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { PublicAlertItem, alertItemToAlertDetail } from "@/types/public";

type NormalizedSeverity = "Critical" | "Warning" | "Watch";

export interface OfficerAiRiskUpdatesProps {
  alerts?: PublicAlertItem[];
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  modelStatus?: string | boolean | null;
  referenceTime?: Date | null;
  view?: "compact" | "expanded";
  onViewAll?: () => void;
  onBack?: () => void;
}

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

const SEVERITY_CONFIG: Record<
  NormalizedSeverity,
  {
    label: string;
    pillClass: string;
    iconWrapClass: string;
    dotClass: string;
    Icon: typeof AlertTriangle;
  }
> = {
  Critical: {
    label: "CRITICAL",
    pillClass: "bg-[#FDE8E8] text-[#B91C1C]",
    iconWrapClass: "bg-[#FDECEC] text-[#C52936]",
    dotClass: "bg-[#DC2626]",
    Icon: AlertTriangle,
  },
  Warning: {
    label: "WARNING",
    pillClass: "bg-[#FEEFD6] text-[#9A5B06]",
    iconWrapClass: "bg-[#FEF1DC] text-[#B45E09]",
    dotClass: "bg-[#F59E0B]",
    Icon: Mountain,
  },
  Watch: {
    label: "WATCH",
    pillClass: "bg-[#DCFCE7] text-[#166534]",
    iconWrapClass: "bg-[#E2F4E8] text-[#1E7A45]",
    dotClass: "bg-[#16A34A]",
    Icon: Activity,
  },
};

function normalizeSeverity(severity?: string | null): NormalizedSeverity {
  const value = (severity || "").trim().toLowerCase();
  if (value === "critical") return "Critical";
  if (value === "warning") return "Warning";
  return "Watch";
}

function getAlertTimestampMs(alert: PublicAlertItem): number {
  const raw = alert.publishedAt || alert.createdAt;
  if (!raw) return 0;
  const ms = new Date(raw).getTime();
  return Number.isNaN(ms) ? 0 : ms;
}

function formatUpdateTimestamp(
  dateInput?: string | null,
  referenceDate?: Date | null
): { display: string; fullTitle: string } {
  if (!dateInput) return { display: "Recent", fullTitle: "Timestamp unavailable" };
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) {
    return { display: "Recent", fullTitle: "Timestamp unavailable" };
  }

  const timeStr = date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  const fullTitle = date.toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });

  if (referenceDate && date.toDateString() === referenceDate.toDateString()) {
    return { display: timeStr, fullTitle };
  }

  const datePart = date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
  return { display: `${datePart}, ${timeStr}`, fullTitle };
}

function formatAlertHeading(alert: PublicAlertItem): string {
  const corridor = alert.corridor?.trim();
  const detail = (alert.location || alert.title || "").trim();
  if (corridor && detail) {
    return detail.toLowerCase().startsWith(corridor.toLowerCase())
      ? detail
      : `${corridor} · ${detail}`;
  }
  return corridor || detail || "Monitored Corridor";
}

function getConfirmedConfidence(alert: PublicAlertItem): number | null {
  if (typeof alert.confidence === "number" && Number.isFinite(alert.confidence)) {
    return Math.max(0, Math.min(100, Math.round(alert.confidence)));
  }
  return null;
}

function isModelStatusConfirmedActive(
  modelStatus?: string | boolean | null
): boolean {
  if (modelStatus === true) return true;
  if (typeof modelStatus === "string") {
    return modelStatus.trim().toLowerCase() === "active";
  }
  return false;
}

export default function OfficerAiRiskUpdates({
  alerts = [],
  isLoading = false,
  error = null,
  onRetry,
  modelStatus = null,
  referenceTime = null,
  view,
  onViewAll,
  onBack,
}: OfficerAiRiskUpdatesProps) {
  const { openAlertModal } = useApp();
  const [internalView, setInternalView] = useState<"compact" | "expanded">("compact");

  const activeView = view ?? internalView;
  const isExpanded = activeView === "expanded";
  const showModelActive = isModelStatusConfirmedActive(modelStatus);

  const sortedAlerts = useMemo(() => {
    return [...alerts].sort(
      (a, b) => getAlertTimestampMs(b) - getAlertTimestampMs(a)
    );
  }, [alerts]);

  const recent24hCounts = useMemo(() => {
    const refMs = referenceTime ? referenceTime.getTime() : 0;
    const recent = refMs
      ? sortedAlerts.filter((alert) => {
          const ts = getAlertTimestampMs(alert);
          if (!ts) return false;
          const age = refMs - ts;
          return age >= 0 && age <= TWENTY_FOUR_HOURS_MS;
        })
      : [];

    let critical = 0;
    let warning = 0;
    let watch = 0;

    for (const item of recent) {
      const sev = normalizeSeverity(item.severity);
      if (sev === "Critical") critical += 1;
      else if (sev === "Warning") warning += 1;
      else watch += 1;
    }

    return {
      critical,
      warning,
      watch,
      totalInWindow: recent.length,
    };
  }, [sortedAlerts, referenceTime]);

  const previewUpdates = useMemo(() => sortedAlerts.slice(0, 3), [sortedAlerts]);

  const handleOpenExpanded = () => {
    if (onViewAll) {
      onViewAll();
    } else {
      setInternalView("expanded");
    }
  };

  const handleBackToDashboard = () => {
    if (onBack) {
      onBack();
    } else {
      setInternalView("compact");
    }
  };

  const handleReview = (alert: PublicAlertItem) => {
    openAlertModal(alertItemToAlertDetail(alert));
  };

  const headerBlock = (
    <div
      className={`flex flex-col sm:flex-row sm:items-start justify-between gap-3 ${
        isExpanded
          ? "pb-5 mb-6 border-b border-[#173D32]/10"
          : "mb-4"
      }`}
    >
      <div>
        <div className="flex items-center gap-2 text-[#173D32]/75">
          <TrendingUp className="w-3.5 h-3.5 shrink-0" strokeWidth={2.2} aria-hidden="true" />
          <span className="text-[11px] font-bold uppercase tracking-wider">
            Automated Telemetry &amp; Inference
          </span>
        </div>
        <h3
          className={`${
            isExpanded ? "text-xl sm:text-2xl" : "text-lg sm:text-xl"
          } font-extrabold text-[#173D32] tracking-tight mt-0.5`}
        >
          Recent AI Risk Updates
        </h3>
        {isExpanded && (
          <p className="text-xs sm:text-[13px] text-[#173D32]/70 font-medium mt-1">
            Real-time risk assessments from multi-source AI models
          </p>
        )}
      </div>

      {showModelActive && (
        <span className="self-start inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#DCE8D4]/75 border border-[#173D32]/10 text-xs font-bold text-[#173D32] shrink-0">
          <span className="w-2 h-2 rounded-full bg-[#16A34A]" aria-hidden="true" />
          <span>Model Active</span>
        </span>
      )}
    </div>
  );

  const errorBlock = error ? (
    <div className="rounded-2xl bg-red-50/90 border border-red-200 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-red-900">
      <div className="flex items-start sm:items-center gap-2.5 text-xs sm:text-sm font-semibold">
        <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5 sm:mt-0" aria-hidden="true" />
        <span>{error}</span>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-red-700 hover:bg-red-800 text-white text-xs font-bold transition-colors cursor-pointer self-start sm:self-auto shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Retry</span>
        </button>
      )}
    </div>
  ) : null;

  const emptyBlock = (
    <div className="rounded-2xl bg-white/80 border border-[#173D32]/10 p-6 sm:p-8 text-center flex flex-col items-center justify-center gap-2">
      <span className="w-10 h-10 rounded-xl bg-[#DCE8D4]/60 text-[#173D32] flex items-center justify-center">
        <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
      </span>
      <p className="text-sm font-bold text-[#173D32]">
        No AI risk updates recorded
      </p>
      <p className="text-xs text-[#173D32]/65 max-w-md">
        Published risk assessments from automated monitoring feeds will appear here once issued.
      </p>
    </div>
  );

  if (isExpanded) {
    return (
      <div className="space-y-3.5 animate-in fade-in duration-200 w-full">
        <button
          type="button"
          onClick={handleBackToDashboard}
          className="inline-flex items-center gap-1.5 text-xs sm:text-[13px] font-bold text-[#173D32]/80 hover:text-[#173D32] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Back to Dashboard</span>
        </button>

        <div className="bg-[#FAF8F2] border border-[#173D32]/12 rounded-3xl p-5 sm:p-7 shadow-xs">
          {headerBlock}

          {isLoading && (
            <div className="space-y-4">
              {[1, 2, 3, 4].map((idx) => (
                <div key={idx} className="flex items-center gap-4">
                  <div className="hidden md:block h-7 w-28 rounded-full bg-[#173D32]/10 animate-pulse shrink-0" />
                  <div className="h-20 flex-1 rounded-2xl bg-white border border-[#173D32]/8 animate-pulse" />
                </div>
              ))}
            </div>
          )}

          {!isLoading && errorBlock}

          {!isLoading && !error && sortedAlerts.length === 0 && emptyBlock}

          {!isLoading && !error && sortedAlerts.length > 0 && (
            <div className="relative">
              {sortedAlerts.map((alert, idx) => {
                const sev = normalizeSeverity(alert.severity);
                const sevStyle = SEVERITY_CONFIG[sev];
                const ts = formatUpdateTimestamp(
                  alert.publishedAt || alert.createdAt,
                  referenceTime
                );
                const confidence = getConfirmedConfidence(alert);
                const isFirst = idx === 0;
                const isLast = idx === sortedAlerts.length - 1;
                const hasMultiple = sortedAlerts.length > 1;

                return (
                  <div
                    key={alert.id}
                    className="relative flex flex-col md:flex-row md:items-stretch gap-2.5 md:gap-4 pb-4 last:pb-0"
                  >
                    {/* Vertical timeline dot + timestamp pill */}
                    <div className="relative flex items-center gap-3 md:w-[172px] shrink-0">
                      {hasMultiple && (
                        <span
                          aria-hidden="true"
                          className={`hidden md:block absolute left-[5px] w-[2px] bg-[#173D32]/15 ${
                            isFirst
                              ? "top-1/2 -bottom-4"
                              : isLast
                              ? "top-0 bottom-1/2"
                              : "top-0 -bottom-4"
                          }`}
                        />
                      )}
                      <span
                        aria-hidden="true"
                        className={`relative z-10 w-3 h-3 rounded-full shrink-0 ring-4 ring-[#FAF8F2] ${sevStyle.dotClass}`}
                      />
                      <span
                        title={ts.fullTitle}
                        className="px-3 py-1 rounded-full bg-white border border-[#173D32]/10 shadow-[0_1px_3px_rgba(23,61,50,0.05)] text-xs font-semibold text-[#173D32]/85 tabular-nums whitespace-nowrap"
                      >
                        {ts.display}
                      </span>
                    </div>

                    {/* Update Card */}
                    <div className="flex-1 rounded-2xl bg-white border border-[#173D32]/10 hover:border-[#173D32]/22 px-4 py-3.5 sm:px-5 sm:py-4 shadow-[0_2px_8px_-2px_rgba(23,61,50,0.05)] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-5">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-4 min-w-0 flex-1">
                        <span
                          className={`inline-flex items-center justify-center px-3 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wide shrink-0 self-start sm:self-center ${sevStyle.pillClass}`}
                        >
                          {sevStyle.label}
                        </span>

                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm sm:text-[15px] font-extrabold text-[#173D32] leading-snug">
                            {formatAlertHeading(alert)}
                          </h4>
                          <p className="text-xs sm:text-[13px] text-[#173D32]/75 leading-relaxed mt-0.5 line-clamp-2">
                            {alert.description || alert.advisory}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6 shrink-0 pt-2.5 sm:pt-0 border-t sm:border-t-0 border-[#173D32]/8">
                        <div className="text-left sm:text-center min-w-[68px]">
                          <span
                            className={`block leading-none tabular-nums ${
                              confidence !== null
                                ? "text-base sm:text-lg font-extrabold text-[#173D32]"
                                : "text-sm sm:text-base font-bold text-[#173D32]/45"
                            }`}
                            title={
                              confidence !== null
                                ? `${confidence}% model confidence`
                                : "Confidence score unavailable from telemetry feed"
                            }
                          >
                            {confidence !== null ? `${confidence}%` : "N/A"}
                          </span>
                          <span className="block text-[11px] font-medium text-[#173D32]/65 mt-0.5">
                            Confidence
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleReview(alert)}
                          className="px-4 py-1.5 rounded-full bg-white hover:bg-[#173D32] text-[#173D32] hover:text-[#F6F4EC] border border-[#173D32]/25 text-xs font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-2xs whitespace-nowrap"
                        >
                          <span>Review</span>
                          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#FAF8F2] border border-[#173D32]/12 rounded-3xl p-5 sm:p-6 shadow-xs animate-in fade-in duration-200">
      {headerBlock}

      {isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-stretch">
          <div className="lg:col-span-4 rounded-2xl bg-[#173D32]/15 min-h-[156px] animate-pulse" />
          <div className="lg:col-span-8 space-y-2.5">
            {[1, 2, 3].map((idx) => (
              <div
                key={idx}
                className="h-12 rounded-xl bg-white border border-[#173D32]/8 animate-pulse"
              />
            ))}
          </div>
        </div>
      )}

      {!isLoading && errorBlock}

      {!isLoading && !error && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-stretch">
          {/* Left: Compact Risk Overview (Last 24h) */}
          <div className="lg:col-span-4 relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1B4A3C] via-[#173D32] to-[#112F26] text-[#F6F4EC] p-5 flex flex-col justify-between min-h-[156px] shadow-xs">
            <svg
              viewBox="0 0 320 90"
              preserveAspectRatio="none"
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 h-16 w-full select-none opacity-20"
            >
              <path
                d="M0 90 C 60 64, 115 76, 175 48 C 225 25, 275 34, 320 18 L 320 90 Z"
                fill="#4D8A73"
              />
              <path
                d="M0 90 C 85 78, 150 56, 225 62 C 265 65, 295 45, 320 38 L 320 90 Z"
                fill="#DCE8D4"
                fillOpacity="0.45"
              />
            </svg>

            <span className="relative z-10 text-sm font-semibold text-[#F6F4EC]/95 text-center">
              Risk Overview (Last 24h)
            </span>

            <div className="relative z-10 grid grid-cols-3 gap-2 text-center my-auto pt-3 pb-1">
              <div>
                <span className="block text-3xl font-extrabold text-white leading-none tabular-nums">
                  {recent24hCounts.critical}
                </span>
                <span className="block text-xs font-medium text-[#DCE8D4]/90 mt-1.5">
                  Critical
                </span>
              </div>
              <div>
                <span className="block text-3xl font-extrabold text-[#F5B041] leading-none tabular-nums">
                  {recent24hCounts.warning}
                </span>
                <span className="block text-xs font-medium text-[#F5B041] mt-1.5">
                  Warning
                </span>
              </div>
              <div>
                <span className="block text-3xl font-extrabold text-white leading-none tabular-nums">
                  {recent24hCounts.watch}
                </span>
                <span className="block text-xs font-medium text-[#DCE8D4]/90 mt-1.5">
                  Watch
                </span>
              </div>
            </div>

            {recent24hCounts.totalInWindow === 0 && sortedAlerts.length > 0 && (
              <p className="relative z-10 text-[11px] text-[#DCE8D4]/75 text-center mt-1.5">
                {sortedAlerts.length} active earlier
              </p>
            )}
          </div>

          {/* Right: 3 Latest AI Risk Updates */}
          <div className="lg:col-span-8 flex flex-col justify-between">
            {sortedAlerts.length === 0 ? (
              <div className="flex-1 flex items-center">{emptyBlock}</div>
            ) : (
              <>
                <div className="space-y-2.5">
                  {previewUpdates.map((alert) => {
                    const sev = normalizeSeverity(alert.severity);
                    const sevStyle = SEVERITY_CONFIG[sev];
                    const SevIcon = sevStyle.Icon;
                    const ts = formatUpdateTimestamp(
                      alert.publishedAt || alert.createdAt,
                      referenceTime
                    );
                    const confidence = getConfirmedConfidence(alert);

                    return (
                      <button
                        key={alert.id}
                        type="button"
                        onClick={() => handleReview(alert)}
                        className="w-full text-left rounded-xl bg-white border border-[#173D32]/10 hover:border-[#173D32]/25 px-3.5 py-2.5 sm:px-4 sm:py-3 shadow-[0_1px_4px_rgba(23,61,50,0.04)] hover:shadow-xs transition-all flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 sm:gap-3 cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <span
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${sevStyle.iconWrapClass}`}
                            aria-hidden="true"
                          >
                            <SevIcon className="w-4 h-4" strokeWidth={2} />
                          </span>

                          <span
                            className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide shrink-0 ${sevStyle.pillClass}`}
                          >
                            {sevStyle.label}
                          </span>

                          <span className="text-xs sm:text-[13px] font-bold text-[#173D32] truncate">
                            {formatAlertHeading(alert)}
                          </span>
                        </div>

                        <div className="flex items-center gap-4 sm:gap-5 shrink-0 ml-auto">
                          <span
                            title={ts.fullTitle}
                            className="text-xs font-medium text-[#173D32]/65 tabular-nums whitespace-nowrap"
                          >
                            {ts.display}
                          </span>
                          <span
                            className={`min-w-[2.75rem] text-right tabular-nums ${
                              confidence !== null
                                ? "text-sm font-extrabold text-[#173D32]"
                                : "text-xs font-bold text-[#173D32]/45"
                            }`}
                            title={
                              confidence !== null
                                ? `${confidence}% model confidence`
                                : "Confidence score unavailable from telemetry feed"
                            }
                          >
                            {confidence !== null ? `${confidence}%` : "N/A"}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={handleOpenExpanded}
                    className="inline-flex items-center gap-1.5 text-xs sm:text-[13px] font-bold text-[#173D32] hover:text-[#112F26] hover:underline transition-colors cursor-pointer"
                  >
                    <span>View All Updates</span>
                    <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
