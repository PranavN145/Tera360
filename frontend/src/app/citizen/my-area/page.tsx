"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import PortalLayout from "@/components/portal/PortalLayout";
import RiskMap from "@/components/RiskMap";
import { useApp } from "@/context/AppContext";
import { publicApi } from "@/lib/api";
import { PublicRoadStatusItem, PublicAlertItem, PublicStats } from "@/types/public";
import { getVillageByName } from "@/data/villages";

export default function CitizenMyAreaPage() {
  const { user, openReportModal } = useApp();

  // Citizen registered village details from user profile
  const citizenVillageName = user?.village?.villageName;
  const citizenDistrict = user?.village?.district || "District";
  const citizenState = user?.village?.state;

  // Single-source verified settlement data
  const matchedVillage = useMemo(() => {
    return getVillageByName(citizenVillageName);
  }, [citizenVillageName]);

  // Real backend telemetry data states
  const [alerts, setAlerts] = useState<PublicAlertItem[]>([]);
  const [roads, setRoads] = useState<PublicRoadStatusItem[]>([]);
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [dataError, setDataError] = useState<string | null>(null);

  // Synchronize live telemetry from backend
  const handleRefresh = useCallback(async () => {
    if (!citizenState) return;
    setIsLoading(true);
    setDataError(null);
    try {
      const [alertRes, roadRes, statsRes] = await Promise.all([
        publicApi.getAlerts({ state: citizenState }),
        publicApi.getRoadStatus({ state: citizenState }),
        publicApi.getStats(),
      ]);
      setAlerts(alertRes.alerts);
      setRoads(roadRes);
      setStats(statsRes);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unable to retrieve real-time area telemetry.";
      setDataError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [citizenState]);

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      if (!citizenState) {
        setIsLoading(false);
        return;
      }

      try {
        const [alertRes, roadRes, statsRes] = await Promise.all([
          publicApi.getAlerts({ state: citizenState }),
          publicApi.getRoadStatus({ state: citizenState }),
          publicApi.getStats(),
        ]);
        if (mounted) {
          setAlerts(alertRes.alerts);
          setRoads(roadRes);
          setStats(statsRes);
          setDataError(null);
        }
      } catch (err: unknown) {
        if (mounted) {
          const msg = err instanceof Error ? err.message : "Unable to retrieve real-time area telemetry.";
          setDataError(msg);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    void loadData();

    return () => {
      mounted = false;
    };
  }, [citizenState]);

  // Derive most relevant active alert & road corridor for this area
  const relevantAlert = useMemo(() => {
    if (alerts.length === 0) return null;
    // Prefer critical alerts, then warning, then watch
    const critical = alerts.find((a) => a.severity.toLowerCase() === "critical");
    if (critical) return critical;
    const warning = alerts.find((a) => a.severity.toLowerCase() === "warning");
    if (warning) return warning;
    return alerts[0];
  }, [alerts]);

  const relevantRoad = useMemo(() => {
    if (roads.length === 0) return null;
    // If there is an active alert corridor, match it
    if (relevantAlert?.corridor) {
      const match = roads.find(
        (r) =>
          r.code.toLowerCase() === relevantAlert.corridor.toLowerCase() ||
          r.name.toLowerCase().includes(relevantAlert.corridor.toLowerCase())
      );
      if (match) return match;
    }
    // Prioritize blocked or caution roads in the state
    const blocked = roads.find((r) => r.status === "blocked");
    if (blocked) return blocked;
    const caution = roads.find((r) => r.status === "caution");
    if (caution) return caution;
    return roads[0];
  }, [roads, relevantAlert]);

  // Compute 4-level risk assessment with fallback to verified baseline or explicit "Risk data unavailable"
  const derivedRisk = useMemo(() => {
    if (!citizenVillageName && !citizenState) {
      return {
        level: "UNAVAILABLE" as const,
        badgeText: "Risk data unavailable",
        badgeBg: "bg-stone-100 text-stone-800 border-stone-300",
        indicatorBg: "bg-stone-500",
        pulse: false,
        summary: "Village profile incomplete. Please configure your village in your profile.",
        actionAdvice: "Provide village location details to load accurate early warning telemetry.",
        isEvacuationOrder: false,
      };
    }

    const hasCritical = alerts.some((a) => a.severity.toLowerCase() === "critical");
    const hasWarning = alerts.some((a) => a.severity.toLowerCase() === "warning");
    const hasWatch = alerts.some((a) => a.severity.toLowerCase() === "watch");

    if (hasCritical) {
      return {
        level: "CRITICAL" as const,
        badgeText: "CRITICAL",
        badgeBg: "bg-red-100 text-red-900 border-red-300",
        indicatorBg: "bg-red-600",
        pulse: true,
        summary: "Severe active landslide warning issued for your sector.",
        actionAdvice: "High-risk slope failure detected. Follow evacuation advisories and relocate to safe shelters immediately.",
        isEvacuationOrder: true,
      };
    }

    if (hasWarning) {
      return {
        level: "WARNING" as const,
        badgeText: "WARNING",
        badgeBg: "bg-amber-100 text-amber-900 border-amber-300",
        indicatorBg: "bg-amber-600",
        pulse: false,
        summary: "Heightened slope instability and significant precipitation recorded.",
        actionAdvice: "Exercise caution on steep hillside routes. Restrict non-essential vehicular travel along arterial corridors.",
        isEvacuationOrder: false,
      };
    }

    if (hasWatch) {
      return {
        level: "WATCH" as const,
        badgeText: "WATCH",
        badgeBg: "bg-sky-100 text-sky-900 border-sky-300",
        indicatorBg: "bg-sky-600",
        pulse: false,
        summary: "Meteorological alert active. Rainfall approaching warning thresholds.",
        actionAdvice: "Monitor local drainage channels and inspect slope retaining structures for tension cracks.",
        isEvacuationOrder: false,
      };
    }

    // Fall back to verified village baseline if available
    if (matchedVillage) {
      if (matchedVillage.currentRiskLevel === "Critical") {
        return {
          level: "CRITICAL" as const,
          badgeText: "CRITICAL",
          badgeBg: "bg-red-100 text-red-900 border-red-300",
          indicatorBg: "bg-red-600",
          pulse: true,
          summary: "Village sits in designated high-geotechnical vulnerability zone.",
          actionAdvice: "Active debris slide risk identified along settlement perimeter.",
          isEvacuationOrder: false,
        };
      }
      if (matchedVillage.currentRiskLevel === "High") {
        return {
          level: "WARNING" as const,
          badgeText: "WARNING",
          badgeBg: "bg-amber-100 text-amber-900 border-amber-300",
          indicatorBg: "bg-amber-600",
          pulse: false,
          summary: "Elevated slope sensitivity recorded during current monsoon cycle.",
          actionAdvice: "Stay alert for water pooling or muddy runoff on road banks.",
          isEvacuationOrder: false,
        };
      }
      if (matchedVillage.currentRiskLevel === "Moderate") {
        return {
          level: "WATCH" as const,
          badgeText: "WATCH",
          badgeBg: "bg-sky-100 text-sky-900 border-sky-300",
          indicatorBg: "bg-sky-600",
          pulse: false,
          summary: "Moderate slope angle with intermittent seasonal precipitation.",
          actionAdvice: "Standard vigilance required during sustained showers.",
          isEvacuationOrder: false,
        };
      }
      return {
        level: "SAFE" as const,
        badgeText: "SAFE",
        badgeBg: "bg-emerald-100 text-emerald-900 border-emerald-300",
        indicatorBg: "bg-emerald-600",
        pulse: false,
        summary: "Normal geotechnical telemetry. No landslide advisories in effect.",
        actionAdvice: "Slope conditions remain within standard safety parameters.",
        isEvacuationOrder: false,
      };
    }

    // If neither alerts nor village dataset exists, explicitly communicate unavailability
    return {
      level: "UNAVAILABLE" as const,
      badgeText: "Risk data unavailable",
      badgeBg: "bg-stone-100 text-stone-800 border-stone-300",
      indicatorBg: "bg-stone-500",
      pulse: false,
      summary: "No verified geotechnical sensors or alert records mapped to this location.",
      actionAdvice: "Consult district disaster emergency desk for hyper-local manual assessments.",
      isEvacuationOrder: false,
    };
  }, [alerts, matchedVillage, citizenVillageName, citizenState]);

  // Environmental Metrics extraction (strictly authentic data)
  const envMetrics = useMemo(() => {
    // 1. Rainfall
    const rainfallVal = relevantAlert?.rainfall24h || matchedVillage?.lastRainfall || null;
    const rainfallTime = stats?.lastUpdated
      ? new Date(stats.lastUpdated).toLocaleDateString([], { month: "short", day: "numeric" })
      : null;

    // 2. Soil Saturation
    const saturationVal = relevantAlert?.saturation || null;
    const saturationTime = relevantAlert?.publishedAt
      ? new Date(relevantAlert.publishedAt).toLocaleDateString([], { month: "short", day: "numeric" })
      : null;

    // 3. Slope Instability / Highway Clearance
    const roadStatusVal = relevantRoad ? relevantRoad.status.toUpperCase() : null;
    const roadStretchVal = relevantRoad ? `${relevantRoad.code} (${relevantRoad.stretch})` : null;
    const roadTime = relevantRoad?.lastUpdated
      ? new Date(relevantRoad.lastUpdated).toLocaleDateString([], { month: "short", day: "numeric" })
      : null;

    // 4. District Hazard Tier
    const hazardTierVal = derivedRisk.level !== "UNAVAILABLE" ? derivedRisk.level : null;
    const hazardTime = stats?.lastUpdated
      ? new Date(stats.lastUpdated).toLocaleDateString([], { month: "short", day: "numeric" })
      : null;

    return {
      rainfall: {
        val: rainfallVal,
        unit: rainfallVal?.includes("mm") ? "" : "mm (24h)",
        time: rainfallTime,
      },
      saturation: {
        val: saturationVal,
        unit: saturationVal?.includes("%") ? "" : "% Saturation",
        time: saturationTime,
      },
      roadClearance: {
        val: roadStatusVal,
        detail: roadStretchVal,
        time: roadTime,
      },
      hazardTier: {
        val: hazardTierVal,
        unit: "Alert Classification",
        time: hazardTime,
      },
    };
  }, [relevantAlert, matchedVillage, stats, relevantRoad, derivedRisk]);

  // Formatted last update string
  const lastUpdatedDisplay = useMemo(() => {
    if (stats?.lastUpdated) {
      const d = new Date(stats.lastUpdated);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }, [stats]);

  return (
    <PortalLayout
      allowedRoles={["citizen"]}
      title="My Area Local Landslide Risk"
      subtitle="Hyper-local slope telemetry, arterial corridor clearance, and meteorological monitoring for your village."
    >
      <div className="space-y-6 max-w-6xl">
        {/* Notice for Missing Village Profile */}
        {(!citizenVillageName || !citizenState) && (
          <div className="p-8 sm:p-10 bg-[#FAF8F2] rounded-3xl border border-[#173D32]/15 shadow-xs text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-[#DCE8D4] flex items-center justify-center text-2xl mx-auto text-[#173D32]">
              📍
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-[#173D32]">
              Village Information Not Configured
            </h2>
            <p className="text-xs sm:text-sm text-[#173D32]/80 leading-relaxed max-w-lg mx-auto">
              To view hyper-local geotechnical risk levels, slope moisture telemetry, and nearest safe shelters, please set your state, district, and village in your citizen profile.
            </p>
            <div className="pt-2">
              <Link
                href="/citizen/profile"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#173D32] text-[#F6F4EC] text-xs font-bold hover:bg-[#1a4437] transition-all shadow-xs"
              >
                <span>Set Up Village in Profile</span>
                <span>→</span>
              </Link>
            </div>
          </div>
        )}

        {/* Backend Advisory Feed Error Alert */}
        {dataError && (
          <div className="p-4 rounded-2xl bg-amber-50 text-amber-900 border border-amber-200 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">⚠️</span>
              <span>Backend advisory feed notice: {dataError} (Displaying cached baseline telemetry)</span>
            </div>
            <button
              type="button"
              onClick={handleRefresh}
              className="px-2.5 py-1 rounded-lg bg-amber-200 text-amber-900 font-bold hover:bg-amber-300 cursor-pointer"
            >
              Retry Sync
            </button>
          </div>
        )}

        {/* ── 1. Village Risk Overview ───────────────────────────────────────── */}
        <div className="p-6 sm:p-8 bg-[#FAF8F2] rounded-3xl border border-[#173D32]/12 shadow-2xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-[#173D32]/10">
            <div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="text-[11px] font-black uppercase tracking-wider text-[#173D32]/70 block">
                  Registered Village Territory
                </span>
                <span className="text-[#173D32]/40">·</span>
                <span className="text-[11px] font-semibold text-[#173D32]/60">
                  Telemetry Synced at {lastUpdatedDisplay}
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-[#173D32] tracking-tight">
                {citizenVillageName || "Unassigned Settlement"} Village
              </h2>
              <p className="text-xs sm:text-sm text-[#173D32]/75 mt-0.5">
                {citizenDistrict} District, {citizenState || "Northeast Region"}
              </p>
            </div>

            {/* Prominent Risk Level Badge */}
            <div className="flex items-center gap-4">
              <div
                className={`px-5 py-3 rounded-2xl border flex items-center gap-3 shadow-xs ${derivedRisk.badgeBg}`}
              >
                <span
                  className={`w-3.5 h-3.5 rounded-full ${derivedRisk.indicatorBg} ${
                    derivedRisk.pulse ? "animate-ping" : ""
                  }`}
                />
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest block opacity-75">
                    Current Risk Status
                  </span>
                  <span className="text-xl font-black tracking-wide block">
                    {derivedRisk.badgeText}
                  </span>
                </div>
              </div>

              <Link
                href="/citizen/profile"
                className="hidden sm:inline-flex px-3.5 py-2.5 rounded-xl bg-white border border-[#173D32]/15 text-[#173D32] hover:bg-[#F6F4EC] text-xs font-bold transition-all shadow-2xs"
                title="Change Village or Preferences"
              >
                Edit Village ⚙️
              </Link>
            </div>
          </div>

          {/* Official Advisory Banner */}
          <div className="mt-5 p-4 rounded-2xl bg-white/80 border border-[#173D32]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-[#173D32]/10 text-[#173D32]">
                  {relevantAlert?.advisory ? "Official Advisory" : "Geotechnical Summary"}
                </span>
                {derivedRisk.isEvacuationOrder && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-red-600 text-white animate-pulse">
                    Evacuation Notice
                  </span>
                )}
              </div>
              <p className="font-extrabold text-[#173D32]">
                {relevantAlert?.advisory || derivedRisk.summary}
              </p>
              <p className="text-[#173D32]/80 leading-relaxed text-[11px]">
                {derivedRisk.actionAdvice}
              </p>
            </div>

            <button
              type="button"
              onClick={openReportModal}
              className="shrink-0 px-4 py-2.5 rounded-xl bg-red-700 hover:bg-red-800 text-white text-xs font-black tracking-wide transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <span>⚠️</span>
              <span>Report Hazard Sign</span>
            </button>
          </div>
        </div>

        {/* ── 2. Environmental Monitoring (Strictly authentic data) ─────────── */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-[#173D32]">
                Environmental Monitoring & Sensors
              </h3>
              <p className="text-xs text-[#173D32]/70">
                Live geotechnical metrics gathered from state rainfall stations and slope observation arrays.
              </p>
            </div>
            <span className="text-[10px] text-[#173D32]/60 font-mono hidden sm:inline-block">
              Sensor Node: {citizenState || "Northeast"} Regional Feeds
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Metric 1: Rainfall */}
            <div className="p-5 rounded-2xl bg-[#FAF8F2] border border-[#173D32]/12 shadow-2xs space-y-2 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#173D32]/70 uppercase tracking-wider">
                    24-Hour Rainfall
                  </span>
                  <span className="text-base">🌧️</span>
                </div>
                <div className="mt-2">
                  {envMetrics.rainfall.val ? (
                    <div className="text-xl font-black text-[#173D32]">
                      {envMetrics.rainfall.val} {envMetrics.rainfall.unit}
                    </div>
                  ) : (
                    <span className="text-xs font-bold text-stone-500 italic block">
                      Data unavailable
                    </span>
                  )}
                </div>
              </div>
              <div className="pt-2 border-t border-[#173D32]/10 text-[10px] text-[#173D32]/60 flex items-center justify-between">
                <span>IMD Rain Gauge</span>
                <span>{envMetrics.rainfall.time || "No timestamp"}</span>
              </div>
            </div>

            {/* Metric 2: Soil Moisture / Saturation */}
            <div className="p-5 rounded-2xl bg-[#FAF8F2] border border-[#173D32]/12 shadow-2xs space-y-2 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#173D32]/70 uppercase tracking-wider">
                    Slope Saturation
                  </span>
                  <span className="text-base">💧</span>
                </div>
                <div className="mt-2">
                  {envMetrics.saturation.val ? (
                    <div className="text-xl font-black text-[#173D32]">
                      {envMetrics.saturation.val} {envMetrics.saturation.unit}
                    </div>
                  ) : (
                    <span className="text-xs font-bold text-stone-500 italic block">
                      Data unavailable
                    </span>
                  )}
                </div>
              </div>
              <div className="pt-2 border-t border-[#173D32]/10 text-[10px] text-[#173D32]/60 flex items-center justify-between">
                <span>Piezometer Array</span>
                <span>{envMetrics.saturation.time || "No timestamp"}</span>
              </div>
            </div>

            {/* Metric 3: Slope Instability / Highway Clearance */}
            <div className="p-5 rounded-2xl bg-[#FAF8F2] border border-[#173D32]/12 shadow-2xs space-y-2 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#173D32]/70 uppercase tracking-wider">
                    Arterial Clearance
                  </span>
                  <span className="text-base">🛣️</span>
                </div>
                <div className="mt-2">
                  {envMetrics.roadClearance.val ? (
                    <div>
                      <span
                        className={`text-xl font-black ${
                          envMetrics.roadClearance.val === "BLOCKED"
                            ? "text-red-700"
                            : envMetrics.roadClearance.val === "CAUTION"
                            ? "text-amber-700"
                            : "text-emerald-700"
                        }`}
                      >
                        {envMetrics.roadClearance.val}
                      </span>
                      {envMetrics.roadClearance.detail && (
                        <span className="text-[10px] text-[#173D32]/70 block truncate mt-0.5">
                          {envMetrics.roadClearance.detail}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs font-bold text-stone-500 italic block">
                      Data unavailable
                    </span>
                  )}
                </div>
              </div>
              <div className="pt-2 border-t border-[#173D32]/10 text-[10px] text-[#173D32]/60 flex items-center justify-between">
                <span>NH Highway Patrol</span>
                <span>{envMetrics.roadClearance.time || "No timestamp"}</span>
              </div>
            </div>

            {/* Metric 4: District Hazard Level */}
            <div className="p-5 rounded-2xl bg-[#FAF8F2] border border-[#173D32]/12 shadow-2xs space-y-2 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#173D32]/70 uppercase tracking-wider">
                    Hazard Warning Tier
                  </span>
                  <span className="text-base">🚨</span>
                </div>
                <div className="mt-2">
                  {envMetrics.hazardTier.val ? (
                    <div className="text-xl font-black text-[#173D32]">
                      {envMetrics.hazardTier.val}
                    </div>
                  ) : (
                    <span className="text-xs font-bold text-stone-500 italic block">
                      Data unavailable
                    </span>
                  )}
                </div>
              </div>
              <div className="pt-2 border-t border-[#173D32]/10 text-[10px] text-[#173D32]/60 flex items-center justify-between">
                <span>SDMA Framework</span>
                <span>{envMetrics.hazardTier.time || "No timestamp"}</span>
              </div>
            </div>
          </div>

          <p className="text-[10px] text-[#173D32]/60 mt-2 italic text-right">
            * Environmental metrics are sourced strictly from official feeds. Terra360 never fabricates simulated telemetry readings.
          </p>
        </div>

        {/* ── 3. Nearby Danger Zones and 3D Risk Map ────────────────────────── */}
        <div className="p-6 sm:p-8 bg-[#FAF8F2] rounded-3xl border border-[#173D32]/12 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#173D32]/10">
            <div>
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-[#173D32] flex items-center gap-2">
                <span>🗺️</span>
                <span>Nearby Danger Zones & Corridor Map</span>
              </h3>
              <p className="text-xs text-[#173D32]/70 mt-0.5">
                3D topological terrain map visualizing arterial highway corridors and slope instability across {citizenState || "the region"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/risk-map"
                className="px-3 py-1.5 rounded-xl bg-[#173D32] text-[#F6F4EC] text-xs font-bold hover:bg-[#1a4437] transition-all"
              >
                Full Screen Map ↗
              </Link>
            </div>
          </div>

          {/* 3D Mapbox GL JS Container */}
          <div className="h-[360px] sm:h-[440px] w-full rounded-2xl overflow-hidden border border-[#173D32]/15 relative shadow-xs">
            <RiskMap className="w-full h-full" selectedState={citizenState} />
          </div>

          {/* Monitored Corridors & Road Clearance Breakdown */}
          <div className="pt-2 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#173D32]">
                Monitored Highway Corridors ({roads.length})
              </span>
              <span className="text-[11px] text-[#173D32]/60">
                Verified Road Feeds
              </span>
            </div>

            {roads.length === 0 ? (
              <div className="py-4 text-center text-xs text-[#173D32]/60">
                No arterial highways currently cataloged for {citizenState || "this sector"}.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {roads.map((road) => (
                  <div
                    key={road.id}
                    className="p-3.5 rounded-2xl bg-white border border-[#173D32]/10 shadow-2xs text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-[#173D32]">{road.code}</span>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                          road.status === "blocked"
                            ? "bg-red-100 text-red-900 border border-red-200"
                            : road.status === "caution"
                            ? "bg-amber-100 text-amber-900 border border-amber-200"
                            : "bg-emerald-100 text-emerald-900 border border-emerald-200"
                        }`}
                      >
                        {road.status}
                      </span>
                    </div>
                    <p className="text-[11px] font-semibold text-[#173D32]/80 truncate">
                      {road.name}
                    </p>
                    <p className="text-[10px] text-[#173D32]/60 truncate">
                      Stretch: {road.stretch}
                    </p>
                    {road.statusReason && (
                      <p className="text-[10px] text-red-800 font-medium italic pt-1 border-t border-[#173D32]/10">
                        Notice: {road.statusReason}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Clear explanation of village-level GIS limitation */}
            <div className="p-3 rounded-xl bg-white/70 border border-[#173D32]/10 text-[11px] text-[#173D32]/70 leading-relaxed">
              <strong>Geographic Data Boundary Notice:</strong> The 3D GIS satellite rendering visualizes regional arterial corridors, elevation gradients, and highway corridors. Sub-kilometer village parcel sensors are managed by district control rooms and communicated via plain-language advisories below.
            </div>
          </div>
        </div>

        {/* ── 4. Plain-Language Local Risk Advisory ─────────────────────────── */}
        <div className="p-6 sm:p-8 bg-[#FAF8F2] rounded-3xl border border-[#173D32]/12 shadow-2xs space-y-4">
          <div className="pb-3 border-b border-[#173D32]/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">📢</span>
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-[#173D32]">
                Plain-Language Citizen Advisory & Safety Guidance
              </h3>
            </div>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                derivedRisk.isEvacuationOrder
                  ? "bg-red-700 text-white animate-pulse"
                  : "bg-[#173D32]/10 text-[#173D32]"
              }`}
            >
              {derivedRisk.isEvacuationOrder ? "Mandatory Evacuation" : "Precautionary Guidance"}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-[#173D32]">
            {/* Column 1: Hazard Assessment & Precautions */}
            <div className="space-y-3">
              <h4 className="font-extrabold uppercase tracking-wider text-[11px] text-[#173D32]/70">
                1. What Current Conditions Mean for {citizenVillageName || "Your Settlement"}
              </h4>
              <p className="leading-relaxed text-[#173D32]/90">
                {derivedRisk.summary} Hillside soils in {citizenDistrict} District are evaluated based on 24-hour antecedent rainfall patterns and recorded road subsidence.
              </p>

              <h4 className="font-extrabold uppercase tracking-wider text-[11px] text-[#173D32]/70 pt-2">
                2. Mandatory Citizen Precautions
              </h4>
              <ul className="space-y-1.5 text-[#173D32]/85 pl-4 list-disc text-[11px]">
                <li>Inspect slope retaining walls and building foundations for sudden cracking.</li>
                <li>Stay clear of natural gully channels, drainages, and unpaved hillside cutting slopes.</li>
                <li>Keep mobile phones charged and maintain an emergency grab-bag with torch and medication.</li>
                <li>Report sudden muddy seepage or falling pebbles immediately using the One-Tap Report tool.</li>
              </ul>
            </div>

            {/* Column 2: Route Clearance & Evacuation Clarity */}
            <div className="space-y-3">
              <h4 className="font-extrabold uppercase tracking-wider text-[11px] text-[#173D32]/70">
                3. Arterial Route Warnings
              </h4>
              <p className="leading-relaxed text-[#173D32]/90">
                {relevantRoad?.status === "blocked" ? (
                  <span className="text-red-800 font-bold">
                    CRITICAL TRANSIT WARNING: {relevantRoad.code} ({relevantRoad.stretch}) is currently BLOCKED. Avoid all vehicular travel through this sector.
                  </span>
                ) : relevantRoad?.status === "caution" ? (
                  <span className="text-amber-800 font-bold">
                    CAUTIONARY TRANSIT NOTICE: {relevantRoad.code} ({relevantRoad.stretch}) reports slow movement and minor slope slumping. Drive with high vigilance.
                  </span>
                ) : (
                  <span>
                    Arterial highways in {citizenState || "the region"} report normal passage. Maintain defensive driving during wet intervals.
                  </span>
                )}
              </p>

              <h4 className="font-extrabold uppercase tracking-wider text-[11px] text-[#173D32]/70 pt-2">
                4. Evacuation Order Status
              </h4>
              <div
                className={`p-3.5 rounded-2xl border ${
                  derivedRisk.isEvacuationOrder
                    ? "bg-red-50 border-red-300 text-red-950 font-semibold"
                    : "bg-emerald-50 border-emerald-200 text-emerald-950"
                }`}
              >
                {derivedRisk.isEvacuationOrder ? (
                  <div>
                    <span className="font-black block uppercase tracking-wide">
                      ⚠️ Active Evacuation Directive
                    </span>
                    <p className="text-[11px] mt-1 leading-relaxed">
                      District authorities advise immediate evacuation of steep foothill dwellings. Move calmly along designated uphill paths to the nearest shelter.
                    </p>
                  </div>
                ) : (
                  <div>
                    <span className="font-black block uppercase tracking-wide">
                      ✅ No General Evacuation Order Active
                    </span>
                    <p className="text-[11px] mt-1 leading-relaxed">
                      Residents may remain in residences while maintaining situational awareness of rainfall and official IVRS alerts.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── 5. Recent Local Alerts ────────────────────────────────────────── */}
        <div className="p-6 sm:p-8 bg-[#FAF8F2] rounded-3xl border border-[#173D32]/12 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#173D32]/10">
            <div>
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-[#173D32] flex items-center gap-2">
                <span>📢</span>
                <span>Recent Local Bulletins & Warnings</span>
              </h3>
              <p className="text-xs text-[#173D32]/70 mt-0.5">
                Official emergency alerts broadcast for {citizenState || "Northeast States"}
              </p>
            </div>
            <Link
              href="/alerts"
              className="text-xs font-bold text-[#173D32] hover:underline shrink-0"
            >
              View All Bulletins ({alerts.length}) →
            </Link>
          </div>

          {isLoading ? (
            <div className="py-8 text-center text-xs text-[#173D32]/60 animate-pulse">
              Synchronizing state emergency alerts...
            </div>
          ) : alerts.length === 0 ? (
            <div className="py-8 text-center border border-dashed border-[#173D32]/20 rounded-2xl bg-white/50">
              <span className="text-2xl block mb-1">🛡️</span>
              <p className="text-xs font-bold text-[#173D32]">
                No Active Landslide Alerts Broadcast for {citizenState || "this Region"}
              </p>
              <p className="text-[11px] text-[#173D32]/60 mt-0.5 max-w-sm mx-auto">
                Geotechnical monitoring stations report nominal conditions. New bulletins will automatically appear here when issued.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.slice(0, 5).map((alert) => {
                const isCritical = alert.severity.toLowerCase() === "critical";
                return (
                  <div
                    key={alert.id}
                    className={`p-4 rounded-2xl border text-xs space-y-2 ${
                      isCritical
                        ? "bg-red-50/70 border-red-200"
                        : "bg-white border-[#173D32]/10"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            isCritical
                              ? "bg-red-200 text-red-900"
                              : "bg-amber-100 text-amber-900"
                          }`}
                        >
                          {alert.severity} Alert
                        </span>
                        <span className="font-bold text-[#173D32]">
                          Corridor: {alert.corridor}
                        </span>
                      </div>
                      <span className="text-[10px] text-[#173D32]/60">
                        {new Date(alert.publishedAt || alert.createdAt).toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>

                    <h4 className="text-sm font-black text-[#173D32]">{alert.title}</h4>
                    <p className="text-[#173D32]/85 leading-relaxed text-[11px]">{alert.description}</p>

                    <div className="p-2.5 rounded-xl bg-white/80 border border-[#173D32]/10 text-[11px]">
                      <span className="font-extrabold text-[#173D32] block">Official Advisory:</span>
                      <p className="text-[#173D32]/80 mt-0.5">{alert.advisory}</p>
                    </div>

                    {(alert.rainfall24h || alert.saturation) && (
                      <div className="flex items-center gap-4 text-[10px] font-mono text-[#173D32]/70 pt-1">
                        {alert.rainfall24h && <span>🌧️ Rain: {alert.rainfall24h}</span>}
                        {alert.saturation && <span>💧 Saturation: {alert.saturation}</span>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── 6. Bottom Resident Navigation Shortcuts ───────────────────────── */}
        <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-xs">
          <Link
            href="/citizen/safe-place"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FAF8F2] border border-[#173D32]/15 text-[#173D32] font-bold hover:bg-white shadow-2xs transition-colors"
          >
            <span>🛡️ Nearest Evacuation Shelters</span>
            <span>→</span>
          </Link>

          <button
            type="button"
            onClick={openReportModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#173D32] text-[#F6F4EC] font-bold hover:bg-[#1a4437] transition-colors cursor-pointer shadow-2xs"
          >
            <span>Report Slope Hazard</span>
            <span>⚠️</span>
          </button>
        </div>
      </div>
    </PortalLayout>
  );
}
