"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import SectionBackground from "@/components/ui/SectionBackground";
import { useApp } from "@/context/AppContext";
import { publicApi } from "@/lib/api";
import { PublicAlertItem, alertItemToAlertDetail } from "@/types/public";

const SEVERITY_CONFIG: Record<string, { badgeBg: string; dotBg: string; borderHover: string }> = {
  Critical: {
    badgeBg: "bg-red-50 text-red-700 border-red-200/80",
    dotBg: "bg-red-500",
    borderHover: "hover:border-red-400/40",
  },
  Warning: {
    badgeBg: "bg-amber-50 text-amber-700 border-amber-200/80",
    dotBg: "bg-amber-500",
    borderHover: "hover:border-amber-400/40",
  },
  Watch: {
    badgeBg: "bg-yellow-50 text-yellow-800 border-yellow-200/80",
    dotBg: "bg-yellow-500",
    borderHover: "hover:border-yellow-400/40",
  },
};

export default function LatestAlerts() {
  const { openAlertModal } = useApp();
  const [alerts, setAlerts] = useState<PublicAlertItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAlerts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await publicApi.getAlerts({ limit: 6 });
      setAlerts(response.alerts);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load latest alerts";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  return (
    <section
      id="alerts"
      className="relative w-full overflow-hidden bg-[#F6F4EC] py-16 sm:py-20 lg:py-24 px-4 sm:px-6 lg:px-10 xl:px-16 scroll-mt-20 sm:scroll-mt-24"
      aria-label="Latest Landslide Alerts Section"
    >
      {/* Subtle Northeast-inspired background artwork with soft edge fades (section-bg-1) */}
      <SectionBackground src="/images/section-bg-1.png" />

      <div className="relative z-10 max-w-[1340px] mx-auto">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 mb-10 lg:mb-12">
          <div className="max-w-2xl">
            {/* Eyebrow */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#DCE8D4]/60 border border-[#173D32]/10 text-[12px] font-bold tracking-wider text-[#173D32] uppercase mb-3">
              <span className="w-2 h-2 rounded-full bg-[#D6A65D]" />
              STAY INFORMED
            </div>

            {/* Heading */}
            <h2 className="text-3xl sm:text-4xl lg:text-[40px] font-bold text-[#173D32] tracking-tight leading-[1.2]">
              Latest Landslide Alerts
            </h2>

            {/* Subtitle */}
            <p className="mt-3 text-base sm:text-lg text-[#173D32]/80 leading-relaxed font-normal">
              Stay updated on reported risks and changing conditions across Northeast India.
            </p>
          </div>

          {/* "View All Alerts →" link */}
          <div className="shrink-0">
            <Link
              href="/alerts"
              className="group inline-flex items-center gap-2 text-[15px] font-bold text-[#173D32] hover:text-[#1a4437] py-2 transition-colors focus-visible:outline-2 focus-visible:outline-[#173D32] rounded-md cursor-pointer"
            >
              <span>View All Alerts</span>
              <span
                className="transition-transform duration-200 group-hover:translate-x-1"
                aria-hidden="true"
              >
                →
              </span>
            </Link>
          </div>
        </div>

        {/* Error State Banner */}
        {error && (
          <div className="mb-8 p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xl">⚠️</span>
              <p className="text-sm font-semibold">{error}</p>
            </div>
            <button
              type="button"
              onClick={fetchAlerts}
              className="px-5 py-2 rounded-full bg-[#173D32] text-[#F6F4EC] text-xs font-bold hover:bg-[#1f4e40] transition-colors cursor-pointer shrink-0"
            >
              Retry Loading Alerts
            </button>
          </div>
        )}

        {/* Loading Skeleton Grid */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="bg-[#FAF8F2] rounded-[20px] border border-[#173D32]/10 p-6 sm:p-7 shadow-xs flex flex-col justify-between animate-pulse min-h-[220px]"
              >
                <div>
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div className="h-6 w-20 bg-[#173D32]/10 rounded-full" />
                    <div className="h-5 w-16 bg-[#173D32]/10 rounded-md" />
                  </div>
                  <div className="h-6 w-3/4 bg-[#173D32]/15 rounded mb-2" />
                  <div className="h-4 w-1/3 bg-[#173D32]/10 rounded mb-4" />
                  <div className="h-4 w-full bg-[#173D32]/10 rounded mb-2" />
                  <div className="h-4 w-5/6 bg-[#173D32]/10 rounded" />
                </div>
                <div className="mt-6 pt-4 border-t border-[#173D32]/10 flex items-center justify-between">
                  <div className="h-4 w-24 bg-[#173D32]/15 rounded" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State Banner (when no alerts are published in DB) */}
        {!isLoading && !error && alerts.length === 0 && (
          <div className="bg-[#FAF8F2] rounded-[24px] border border-[#173D32]/15 p-10 sm:p-12 text-center max-w-xl mx-auto shadow-sm">
            <div className="w-14 h-14 mx-auto rounded-full bg-[#DCE8D4]/60 flex items-center justify-center text-2xl mb-4">
              🌿
            </div>
            <h3 className="text-xl font-bold text-[#173D32]">
              No Active Landslide Advisories
            </h3>
            <p className="text-sm text-[#173D32]/75 mt-2 leading-relaxed font-normal">
              All monitored corridors across Northeast India are currently operating within safe baseline thresholds. Check back during weather changes.
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={fetchAlerts}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#173D32] text-[#F6F4EC] text-xs font-bold hover:bg-[#1f4e40] transition-colors cursor-pointer"
              >
                <span>Check for Updates</span>
                <span>↻</span>
              </button>
              <Link
                href="/risk-map"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-transparent text-[#173D32] border border-[#173D32]/20 text-xs font-bold hover:bg-[#173D32]/5 transition-colors"
              >
                <span>Explore Risk Map</span>
                <span>→</span>
              </Link>
            </div>
          </div>
        )}

        {/* Dynamic Alerts Responsive Grid: 1 col mobile, 2 col tablet, 3 col desktop */}
        {!isLoading && !error && alerts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
            {alerts.map((item) => {
              const alert = alertItemToAlertDetail(item);
              const config = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.Watch;
              return (
                <article
                  key={alert.id}
                  className={`relative bg-[#F6F4EC] rounded-[20px] border border-[#173D32]/12 p-6 sm:p-7 shadow-[0_4px_20px_-4px_rgba(23,61,50,0.06)] hover:shadow-[0_12px_28px_-6px_rgba(23,61,50,0.12)] transition-all duration-200 flex flex-col justify-between group cursor-pointer ${config.borderHover}`}
                  onClick={() => openAlertModal(alert)}
                >
                  <div>
                    {/* Top Row: Severity Badge & State Tag */}
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border tracking-wide ${config.badgeBg}`}
                      >
                        <span className={`w-2 h-2 rounded-full ${config.dotBg}`} />
                        {alert.severity}
                      </span>
                      <span className="text-xs font-semibold text-[#173D32]/65 bg-[#173D32]/5 px-2.5 py-1 rounded-md">
                        {alert.state}
                      </span>
                    </div>

                    {/* Location Name */}
                    <h3 className="text-lg sm:text-xl font-bold text-[#173D32] leading-snug group-hover:text-[#133229] transition-colors">
                      {alert.location}
                    </h3>

                    {/* Date and Time */}
                    <p className="mt-1.5 text-xs text-[#173D32]/60 font-medium flex items-center gap-1.5">
                      <svg
                        className="w-3.5 h-3.5 text-[#173D32]/45 shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span>{alert.timestamp}</span>
                    </p>

                    {/* Short Alert Description */}
                    <p className="mt-4 text-sm text-[#173D32]/80 leading-relaxed font-normal line-clamp-3">
                      {alert.description}
                    </p>
                  </div>

                  {/* Card Action Button: View Details → */}
                  <div className="mt-6 pt-4 border-t border-[#173D32]/10 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openAlertModal(alert);
                      }}
                      className="inline-flex items-center gap-1.5 text-sm font-bold text-[#173D32] group-hover:text-[#1a4437] transition-colors focus-visible:outline-2 focus-visible:outline-[#173D32] rounded-xs cursor-pointer"
                    >
                      <span>View Details</span>
                      <span
                        className="transition-transform duration-200 group-hover:translate-x-1"
                        aria-hidden="true"
                      >
                        →
                      </span>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
