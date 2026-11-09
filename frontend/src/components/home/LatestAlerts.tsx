"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import SectionBackground from "@/components/ui/SectionBackground";
import { useApp } from "@/context/AppContext";
import { publicApi } from "@/lib/api";
import { PublicAlertItem, alertItemToAlertDetail } from "@/types/public";
import { FALLBACK_ALERTS } from "@/lib/fallbackData";

const SEVERITY_THEME: Record<
  string,
  {
    topBorder: string;
    badgeBg: string;
    dotBg: string;
    pingBg: string;
    hoverBorder: string;
    shadowGlow: string;
    hazardIcon: string;
    accentColor: string;
  }
> = {
  Critical: {
    topBorder: "bg-gradient-to-r from-red-600 via-rose-500 to-red-400",
    badgeBg: "bg-red-50 text-red-800 border-red-200/90",
    dotBg: "bg-red-600",
    pingBg: "bg-red-400",
    hoverBorder: "hover:border-red-300",
    shadowGlow: "hover:shadow-[0_20px_40px_-10px_rgba(220,38,38,0.18)]",
    hazardIcon: "⛔",
    accentColor: "#DC2626",
  },
  Warning: {
    topBorder: "bg-gradient-to-r from-amber-500 via-amber-400 to-orange-400",
    badgeBg: "bg-amber-50 text-amber-800 border-amber-200/90",
    dotBg: "bg-amber-500",
    pingBg: "bg-amber-400",
    hoverBorder: "hover:border-amber-300",
    shadowGlow: "hover:shadow-[0_20px_40px_-10px_rgba(217,119,6,0.18)]",
    hazardIcon: "⚠️",
    accentColor: "#D97706",
  },
  Watch: {
    topBorder: "bg-gradient-to-r from-[#D6A65D] via-[#e2ba7e] to-[#D6A65D]/40",
    badgeBg: "bg-[#FEFCE8] text-[#854D0E] border-[#FEF08A]/90",
    dotBg: "bg-[#D6A65D]",
    pingBg: "bg-[#D6A65D]/50",
    hoverBorder: "hover:border-[#D6A65D]/60",
    shadowGlow: "hover:shadow-[0_20px_40px_-10px_rgba(214,166,93,0.20)]",
    hazardIcon: "⚡",
    accentColor: "#D6A65D",
  },
};

export default function LatestAlerts() {
  const { openAlertModal } = useApp();
  // Initialize with fallback alerts so cards are immediately visible even before API responds
  const [alerts, setAlerts] = useState<PublicAlertItem[]>(FALLBACK_ALERTS);

  useEffect(() => {
    let isMounted = true;
    const fetchAlerts = async () => {
      try {
        const response = await publicApi.getAlerts({ limit: 6 });
        if (isMounted && response?.alerts && response.alerts.length > 0) {
          setAlerts(response.alerts);
        }
      } catch {
        // Seamlessly retain fallback data
      }
    };
    fetchAlerts();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section
      id="alerts"
      className="relative w-full overflow-hidden bg-[#F6F4EC] py-16 sm:py-20 lg:py-24 px-4 sm:px-6 lg:px-10 xl:px-16 scroll-mt-20 sm:scroll-mt-24"
      aria-label="Latest Landslide Alerts Section"
    >
      {/* Subtle Northeast-inspired background artwork */}
      <SectionBackground src="/images/section-bg-1.png" />

      <div className="relative z-10 max-w-[1340px] mx-auto">
        {/* Section Header with Organic Ochre Brush-stroke Accent */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 mb-10 lg:mb-12">
          <div className="max-w-2xl">
            {/* Heading with Home-style Organic Brush-stroke */}
            <h2 className="text-3xl sm:text-4xl lg:text-[46px] font-black text-[#173D32] tracking-tight leading-[1.12]">
              <span>Latest Landslide </span>
              <span className="relative inline-block">
                <span className="text-[#D6A65D] italic">Advisories</span>
                <svg
                  className="w-36 sm:w-44 lg:w-[190px] h-2.5 sm:h-3 text-[#D6A65D] mt-0.5"
                  viewBox="0 0 250 12"
                  fill="currentColor"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path d="M2 9.5C35 7.5 90 5.2 160 5.2C200 5.2 235 6.8 248 8.8C235 9.8 195 10.8 150 10.8C85 10.8 35 10.2 2 9.5Z" />
                </svg>
              </span>
            </h2>

            {/* Subtitle */}
            <p className="mt-3.5 text-base sm:text-lg text-[#173D32]/85 leading-relaxed font-normal">
              Continuous field reports, geotechnical slope telemetry, and automated risk notifications across vulnerable Northeast transit routes.
            </p>
          </div>

          {/* "View All Alerts →" Button with matching Home styling */}
          <div className="shrink-0">
            <Link
              href="/alerts"
              className="h-[48px] px-7 rounded-full text-sm font-bold text-white bg-[#173D32] hover:bg-[#1a4437] inline-flex items-center justify-center gap-2.5 transition-all duration-200 hover:-translate-y-0.5 shadow-md hover:shadow-lg group focus-visible:outline-2 focus-visible:outline-[#173D32]"
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

        {/* Enhanced High-Impact Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
          {alerts.map((item) => {
            const alert = alertItemToAlertDetail(item);
            const theme = SEVERITY_THEME[alert.severity] || SEVERITY_THEME.Watch;

            return (
              <article
                key={alert.id}
                onClick={() => openAlertModal(alert)}
                className={`relative bg-[#FAF8F2]/95 backdrop-blur-sm rounded-[26px] border border-[#173D32]/12 p-6 sm:p-7 shadow-[0_6px_28px_-6px_rgba(23,61,50,0.07)] ${theme.shadowGlow} ${theme.hoverBorder} transition-all duration-300 hover:-translate-y-1.5 flex flex-col justify-between group cursor-pointer overflow-hidden`}
              >
                {/* Top Severity Glow Strip */}
                <div
                  className={`absolute top-0 left-0 right-0 h-[4px] ${theme.topBorder}`}
                  aria-hidden="true"
                />

                {/* Subtle Topography Contour Watermark */}
                <svg
                  className="absolute -right-8 -bottom-8 w-48 h-48 text-[#173D32]/[0.035] group-hover:text-[#173D32]/[0.06] transition-colors pointer-events-none select-none"
                  viewBox="0 0 200 200"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M20 180 C 60 120, 100 150, 140 90 C 180 30, 200 60, 220 20"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  />
                  <path
                    d="M0 150 C 40 100, 80 130, 120 70 C 160 10, 180 40, 200 0"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <path
                    d="M40 200 C 80 140, 120 170, 160 110 C 200 50, 220 80, 240 40"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                </svg>

                <div className="relative z-10">
                  {/* Top Badges Row: Severity Pill, 3-Bar Risk Meter & Highway Badge */}
                  <div className="flex items-center justify-between gap-2.5 mb-4">
                    {/* Live Severity Badge with pulsating beacon */}
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border tracking-wide shadow-2xs ${theme.badgeBg}`}
                      >
                        <span className="relative flex h-2 w-2">
                          <span
                            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${theme.pingBg}`}
                          />
                          <span
                            className={`relative inline-flex rounded-full h-2 w-2 ${theme.dotBg}`}
                          />
                        </span>
                        <span>{theme.hazardIcon}</span>
                        <span>{alert.severity}</span>
                      </span>

                      {/* 3-Bar Visual Severity Gauge */}
                      <div className="flex items-center gap-1" title={`Severity Level: ${alert.severity}`}>
                        <span
                          className={`w-2.5 h-1.5 rounded-full ${
                            alert.severity === "Critical"
                              ? "bg-red-500"
                              : alert.severity === "Warning"
                              ? "bg-amber-500"
                              : "bg-[#D6A65D]"
                          }`}
                        />
                        <span
                          className={`w-2.5 h-1.5 rounded-full ${
                            alert.severity === "Critical"
                              ? "bg-red-500"
                              : alert.severity === "Warning"
                              ? "bg-amber-500"
                              : "bg-[#173D32]/15"
                          }`}
                        />
                        <span
                          className={`w-2.5 h-1.5 rounded-full ${
                            alert.severity === "Critical" ? "bg-red-500" : "bg-[#173D32]/15"
                          }`}
                        />
                      </div>
                    </div>

                    {/* Highway Shield & State Tag */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {item.corridor && (
                        <span className="font-mono text-[11px] font-black text-[#F6F4EC] bg-[#173D32] px-2.5 py-0.5 rounded-md shadow-2xs">
                          {item.corridor}
                        </span>
                      )}
                      <span className="text-[11px] font-bold text-[#173D32]/80 bg-[#DCE8D4]/70 border border-[#173D32]/10 px-2.5 py-0.5 rounded-full">
                        {alert.state}
                      </span>
                    </div>
                  </div>

                  {/* Location Title */}
                  <h3 className="text-lg sm:text-[20px] font-black text-[#173D32] leading-snug tracking-tight group-hover:text-[#112d25] transition-colors">
                    {alert.location}
                  </h3>

                  {/* Relative Timestamp */}
                  <div className="mt-2 flex items-center gap-2 text-xs text-[#173D32]/65 font-medium">
                    <svg
                      className="w-3.5 h-3.5 text-[#D6A65D] shrink-0"
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
                  </div>

                  {/* Description */}
                  <p className="mt-3.5 text-[14px] text-[#173D32]/80 leading-relaxed font-normal line-clamp-2">
                    {alert.description}
                  </p>

                  {/* 3-Column Embedded Micro-Telemetry Box */}
                  <div className="mt-4 grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-[#F6F4EC]/90 border border-[#173D32]/8 text-[11px]">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-[#173D32]/60 font-bold uppercase tracking-wider flex items-center gap-1">
                        <span>🌧️</span> Rain
                      </span>
                      <span className="font-extrabold text-[#173D32] mt-0.5">
                        {item.rainfall24h || "Monitored"}
                      </span>
                    </div>
                    <div className="flex flex-col border-l border-[#173D32]/10 pl-2">
                      <span className="text-[10px] text-[#173D32]/60 font-bold uppercase tracking-wider flex items-center gap-1">
                        <span>💧</span> Soil
                      </span>
                      <span className="font-extrabold text-[#173D32] mt-0.5">
                        {item.saturation || "Baseline"}
                      </span>
                    </div>
                    <div className="flex flex-col border-l border-[#173D32]/10 pl-2">
                      <span className="text-[10px] text-[#173D32]/60 font-bold uppercase tracking-wider flex items-center gap-1">
                        <span>🚗</span> Transit
                      </span>
                      <span
                        className={`font-extrabold truncate mt-0.5 ${
                          alert.severity === "Critical"
                            ? "text-red-700"
                            : alert.severity === "Warning"
                            ? "text-amber-700"
                            : "text-emerald-700"
                        }`}
                      >
                        {item.trafficStatus
                          ? item.trafficStatus.split("·")[0].split("—")[0].trim()
                          : "Advisory"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="relative z-10 mt-6 pt-4 border-t border-[#173D32]/10 flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#173D32]/65 group-hover:text-[#173D32] transition-colors">
                    Geotechnical Advisory
                  </span>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openAlertModal(alert);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#F6F4EC] bg-[#173D32] group-hover:bg-[#1a4437] px-4 py-1.5 rounded-full transition-all duration-200 shadow-xs group-hover:shadow cursor-pointer"
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
      </div>
    </section>
  );
}
