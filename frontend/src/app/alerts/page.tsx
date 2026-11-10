"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Header from "@/components/layout/Header";
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
  },
  Warning: {
    topBorder: "bg-gradient-to-r from-amber-500 via-amber-400 to-orange-400",
    badgeBg: "bg-amber-50 text-amber-800 border-amber-200/90",
    dotBg: "bg-amber-500",
    pingBg: "bg-amber-400",
    hoverBorder: "hover:border-amber-300",
    shadowGlow: "hover:shadow-[0_20px_40px_-10px_rgba(217,119,6,0.18)]",
    hazardIcon: "⚠️",
  },
  Watch: {
    topBorder: "bg-gradient-to-r from-[#D6A65D] via-[#e2ba7e] to-[#D6A65D]/40",
    badgeBg: "bg-[#FEFCE8] text-[#854D0E] border-[#FEF08A]/90",
    dotBg: "bg-[#D6A65D]",
    pingBg: "bg-[#D6A65D]/50",
    hoverBorder: "hover:border-[#D6A65D]/60",
    shadowGlow: "hover:shadow-[0_20px_40px_-10px_rgba(214,166,93,0.20)]",
    hazardIcon: "⚡",
  },
};

export default function AlertsPage() {
  const { openAlertModal } = useApp();
  const [filterSeverity, setFilterSeverity] = useState("All");
  const [viewMode, setViewMode] = useState<"grid" | "compact">("grid");

  // Initialize with fallback demo data so cards are immediately visible
  const [alerts, setAlerts] = useState<PublicAlertItem[]>(FALLBACK_ALERTS);

  useEffect(() => {
    let isMounted = true;
    const loadAlerts = async () => {
      try {
        const res = await publicApi.getAlerts({
          severity: filterSeverity === "All" ? undefined : filterSeverity,
          limit: 50,
        });
        if (!isMounted) return;
        if (res && res.alerts && res.alerts.length > 0) {
          setAlerts(res.alerts);
        } else {
          const filteredFallback =
            filterSeverity === "All"
              ? FALLBACK_ALERTS
              : FALLBACK_ALERTS.filter((a) => a.severity === filterSeverity);
          setAlerts(filteredFallback);
        }
      } catch {
        if (!isMounted) return;
        const filteredFallback =
          filterSeverity === "All"
            ? FALLBACK_ALERTS
            : FALLBACK_ALERTS.filter((a) => a.severity === filterSeverity);
        setAlerts(filteredFallback);
      }
    };
    loadAlerts();
    return () => {
      isMounted = false;
    };
  }, [filterSeverity]);

  const filtered = alerts;

  const criticalCount = alerts.filter((a) => a.severity === "Critical").length;
  const warningCount = alerts.filter((a) => a.severity === "Warning").length;
  const watchCount = alerts.filter((a) => a.severity === "Watch").length;

  return (
    <div className="relative w-full min-h-screen bg-[#F6F4EC] flex flex-col overflow-hidden">
      {/* Landscape background image matching the Home page */}
      <div className="absolute inset-0 z-0 pointer-events-none select-none">
        <Image
          src="/images/hero_bg.png"
          alt="Terra360 Landscape Background"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center pointer-events-none select-none opacity-40 sm:opacity-50"
        />
        {/* Soft, luminous morning-mist warm-white gradient behind text & cards for pristine readability */}
        <div
          className="absolute inset-0 bg-gradient-to-b from-[#F6F4EC]/80 via-[#F6F4EC]/92 to-[#F6F4EC] pointer-events-none"
          aria-hidden="true"
        />
        <div
          className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-[#F6F4EC] to-transparent pointer-events-none"
          aria-hidden="true"
        />
      </div>

      <Header />

      <main className="relative z-10 flex-1 max-w-[1340px] w-full mx-auto px-4 sm:px-6 lg:px-10 py-10 sm:py-14">
        {/* Page Header with Signature Brush Stroke */}
        <div className="mb-10 pb-8 border-b border-[#173D32]/10">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#173D32] tracking-tight leading-[1.12]">
            <span>Regional Landslide </span>
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
          </h1>
          <p className="mt-3.5 text-base sm:text-lg text-[#173D32]/85 max-w-2xl font-normal leading-relaxed">
            Real-time hazard notifications validated by state disaster authorities, Border Roads Organisation (BRO), and geotechnical IoT field sensors.
          </p>
        </div>

        {/* Filter & Controls Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-[#FAF8F2]/90 backdrop-blur-md border border-[#173D32]/12 rounded-[22px] p-3 sm:p-4 shadow-sm">
          {/* Severity Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {[
              { id: "All", label: "All Advisories", count: alerts.length },
              { id: "Critical", label: "Critical", count: criticalCount, dot: "bg-red-500" },
              { id: "Warning", label: "Warning", count: warningCount, dot: "bg-amber-500" },
              { id: "Watch", label: "Watch", count: watchCount, dot: "bg-[#D6A65D]" },
            ].map(({ id, label, count, dot }) => {
              const isActive = filterSeverity === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setFilterSeverity(id)}
                  className={`px-3.5 sm:px-4 py-2 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-2 ${
                    isActive
                      ? "bg-[#173D32] text-[#F6F4EC] shadow-xs"
                      : "bg-[#F6F4EC] text-[#173D32]/75 hover:bg-[#DCE8D4]/50 border border-[#173D32]/10"
                  }`}
                >
                  {dot && <span className={`w-2 h-2 rounded-full ${dot}`} />}
                  <span>{label}</span>
                  <span className={`text-[11px] ${isActive ? "opacity-80" : "opacity-60"}`}>
                    ({count})
                  </span>
                </button>
              );
            })}
          </div>

          {/* Layout View Toggle */}
          <div className="flex items-center gap-2.5">
            {/* View Mode Toggle: Cards vs Rows */}
            <div className="hidden sm:flex items-center bg-[#F6F4EC] border border-[#173D32]/15 rounded-full p-1 shrink-0">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                title="Grid cards"
                className={`p-1.5 rounded-full text-xs transition-all cursor-pointer ${
                  viewMode === "grid"
                    ? "bg-[#173D32] text-[#F6F4EC]"
                    : "text-[#173D32]/60 hover:text-[#173D32]"
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("compact")}
                title="Compact feed"
                className={`p-1.5 rounded-full text-xs transition-all cursor-pointer ${
                  viewMode === "compact"
                    ? "bg-[#173D32] text-[#F6F4EC]"
                    : "text-[#173D32]/60 hover:text-[#173D32]"
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Alert Cards Feed */}
        {viewMode === "grid" ? (
          /* Modern Grid of Cards (Always visible) */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
            {filtered.map((item) => {
              const alert = alertItemToAlertDetail(item);
              const theme = SEVERITY_THEME[alert.severity] || SEVERITY_THEME.Watch;

              return (
                <article
                  key={alert.id}
                  onClick={() => openAlertModal(alert)}
                  className={`relative bg-[#FAF8F2]/95 backdrop-blur-sm rounded-[26px] border border-[#173D32]/12 p-6 sm:p-7 shadow-[0_6px_28px_-6px_rgba(23,61,50,0.07)] ${theme.shadowGlow} ${theme.hoverBorder} transition-all duration-300 hover:-translate-y-1.5 flex flex-col justify-between group cursor-pointer overflow-hidden`}
                >
                  {/* Top severity accent glow line */}
                  <div className={`absolute top-0 left-0 right-0 h-[4px] ${theme.topBorder}`} />

                  {/* Topography contour background watermark */}
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
                  </svg>

                  <div className="relative z-10">
                    {/* Top Badges */}
                    <div className="flex items-center justify-between gap-2 mb-4">
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

                      <div className="flex items-center gap-1.5">
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

                    {/* Headline */}
                    <h3 className="text-lg sm:text-[20px] font-black text-[#173D32] leading-snug tracking-tight group-hover:text-[#112d25] transition-colors">
                      {alert.location}
                    </h3>

                    {/* Timestamp & Corridor */}
                    <div className="mt-2 flex items-center gap-2 text-xs text-[#173D32]/65 font-medium">
                      <svg
                        className="w-3.5 h-3.5 text-[#D6A65D] shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{alert.timestamp}</span>
                    </div>

                    {/* Description */}
                    <p className="mt-3.5 text-sm text-[#173D32]/80 leading-relaxed font-normal line-clamp-2">
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

                  {/* Bottom Action */}
                  <div className="relative z-10 mt-6 pt-4 border-t border-[#173D32]/10 flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#173D32]/65 group-hover:text-[#173D32]">
                      Geotechnical Telemetry
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openAlertModal(alert);
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#F6F4EC] bg-[#173D32] group-hover:bg-[#1a4437] px-4 py-1.5 rounded-full transition-all duration-200 cursor-pointer shadow-xs group-hover:shadow"
                    >
                      <span>View Details</span>
                      <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          /* Compact Modern Row Cards */
          <div className="flex flex-col gap-4">
            {filtered.map((item) => {
              const alert = alertItemToAlertDetail(item);
              const theme = SEVERITY_THEME[alert.severity] || SEVERITY_THEME.Watch;

              return (
                <article
                  key={alert.id}
                  onClick={() => openAlertModal(alert)}
                  className={`relative bg-[#FAF8F2]/95 backdrop-blur-sm rounded-[22px] border border-[#173D32]/12 p-5 sm:p-6 shadow-xs ${theme.shadowGlow} ${theme.hoverBorder} transition-all duration-200 hover:-translate-y-0.5 flex flex-col md:flex-row md:items-center justify-between gap-5 group cursor-pointer overflow-hidden`}
                >
                  <div className={`absolute top-0 left-0 bottom-0 w-[4px] ${theme.topBorder}`} />

                  <div className="max-w-3xl pl-2">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${theme.badgeBg}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${theme.dotBg}`} />
                        {alert.severity}
                      </span>
                      {item.corridor && (
                        <span className="text-xs font-mono font-bold text-[#F6F4EC] bg-[#173D32] px-2 py-0.5 rounded">
                          {item.corridor}
                        </span>
                      )}
                      <span className="text-xs font-bold text-[#173D32]/75">
                        {alert.state}
                      </span>
                      <span className="text-xs text-[#173D32]/50">| {alert.timestamp}</span>
                    </div>

                    <h3 className="text-lg sm:text-xl font-bold text-[#173D32] group-hover:text-[#112d25] transition-colors">
                      {alert.location}
                    </h3>
                    <p className="text-sm text-[#173D32]/80 mt-1 leading-relaxed font-normal">
                      {alert.description}
                    </p>
                  </div>

                  <div className="shrink-0 flex items-center justify-end">
                    <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#173D32] text-[#F6F4EC] text-xs font-bold group-hover:bg-[#1a4437] transition-all shadow-2xs">
                      <span>View Advisory</span>
                      <span aria-hidden="true" className="group-hover:translate-x-1 transition-transform">→</span>
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
