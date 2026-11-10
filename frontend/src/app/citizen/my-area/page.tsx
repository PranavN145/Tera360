"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Bell,
  CloudRain,
  Droplets,
  MapPin,
  RefreshCw,
  Road,
  Settings,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import PortalLayout from "@/components/portal/PortalLayout";
import PortalMetricGrid from "@/components/portal/PortalMetricGrid";
import PortalFilterBar from "@/components/portal/PortalFilterBar";
import PortalSectionCard from "@/components/portal/PortalSectionCard";
import PortalSplitLayout from "@/components/portal/PortalSplitLayout";
import { PortalKpiCard } from "@/components/portal";
import StatusBadge from "@/components/ui/StatusBadge";
import RiskMap from "@/components/RiskMap";
import { useApp } from "@/context/AppContext";
import { publicApi } from "@/lib/api";
import { PublicRoadStatusItem, PublicAlertItem, PublicStats } from "@/types/public";
import { getVillageByName } from "@/data/villages";

const STATE_OPTIONS = [
  "Nagaland",
  "Assam",
  "Sikkim",
  "Meghalaya",
  "Arunachal Pradesh",
  "Manipur",
  "Mizoram",
  "Tripura",
];

export default function CitizenMyAreaPage() {
  const { user, openReportModal } = useApp();

  const citizenVillageName = user?.village?.villageName;
  const citizenDistrict = user?.village?.district || "District";
  const registeredState = user?.village?.state;

  const [selectedStateOverride, setSelectedStateOverride] = useState<string | null>(null);
  const activeState = selectedStateOverride ?? registeredState ?? "Nagaland";

  const matchedVillage = useMemo(() => {
    return getVillageByName(citizenVillageName);
  }, [citizenVillageName]);

  const [alerts, setAlerts] = useState<PublicAlertItem[]>([]);
  const [roads, setRoads] = useState<PublicRoadStatusItem[]>([]);
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [dataError, setDataError] = useState<string | null>(null);

  const handleRefresh = useCallback(async () => {
    setIsLoading(true);
    setDataError(null);
    try {
      const [alertRes, roadRes, statsRes] = await Promise.all([
        publicApi.getAlerts({ state: activeState }),
        publicApi.getRoadStatus({ state: activeState }),
        publicApi.getStats(),
      ]);
      setAlerts(alertRes.alerts);
      setRoads(roadRes);
      setStats(statsRes);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Unable to retrieve real-time area telemetry.";
      setDataError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [activeState]);

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        const [alertRes, roadRes, statsRes] = await Promise.all([
          publicApi.getAlerts({ state: activeState }),
          publicApi.getRoadStatus({ state: activeState }),
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
          const msg =
            err instanceof Error ? err.message : "Unable to retrieve real-time area telemetry.";
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
  }, [activeState]);

  const relevantAlert = useMemo(() => {
    if (alerts.length === 0) return null;
    const critical = alerts.find((a) => a.severity.toLowerCase() === "critical");
    if (critical) return critical;
    const warning = alerts.find((a) => a.severity.toLowerCase() === "warning");
    if (warning) return warning;
    return alerts[0];
  }, [alerts]);

  const relevantRoad = useMemo(() => {
    if (roads.length === 0) return null;
    if (relevantAlert?.corridor) {
      const match = roads.find(
        (r) =>
          r.code.toLowerCase() === relevantAlert.corridor.toLowerCase() ||
          r.name.toLowerCase().includes(relevantAlert.corridor.toLowerCase())
      );
      if (match) return match;
    }
    const blocked = roads.find((r) => r.status === "blocked");
    if (blocked) return blocked;
    const caution = roads.find((r) => r.status === "caution");
    if (caution) return caution;
    return roads[0];
  }, [roads, relevantAlert]);

  const derivedRisk = useMemo(() => {
    const hasCritical = alerts.some((a) => a.severity.toLowerCase() === "critical");
    const hasWarning = alerts.some((a) => a.severity.toLowerCase() === "warning");
    const hasWatch = alerts.some((a) => a.severity.toLowerCase() === "watch");

    if (hasCritical) {
      return {
        level: "CRITICAL" as const,
        badgeVariant: "Critical" as const,
        summary: "Severe active landslide warning issued for this sector.",
        actionAdvice:
          "High-risk slope failure detected. Follow evacuation advisories and relocate to safe shelters immediately.",
        isEvacuationOrder: true,
      };
    }

    if (hasWarning) {
      return {
        level: "WARNING" as const,
        badgeVariant: "Warning" as const,
        summary: "Heightened slope instability and significant precipitation recorded.",
        actionAdvice:
          "Exercise caution on steep hillside routes. Restrict non-essential vehicular travel.",
        isEvacuationOrder: false,
      };
    }

    if (hasWatch) {
      return {
        level: "WATCH" as const,
        badgeVariant: "Watch" as const,
        summary: "Meteorological alert active. Rainfall approaching warning thresholds.",
        actionAdvice:
          "Monitor local drainage channels and inspect slope retaining structures.",
        isEvacuationOrder: false,
      };
    }

    if (matchedVillage && matchedVillage.state === activeState) {
      if (matchedVillage.currentRiskLevel === "Critical") {
        return {
          level: "CRITICAL" as const,
          badgeVariant: "Critical" as const,
          summary: "Settlement lies in designated high-geotechnical vulnerability zone.",
          actionAdvice:
            "Stay ready to move uphill along marked safe paths on immediate notice.",
          isEvacuationOrder: true,
        };
      }
      if (matchedVillage.currentRiskLevel === "High") {
        return {
          level: "WARNING" as const,
          badgeVariant: "Warning" as const,
          summary: "Steep terrace slopes monitoring heavy seasonal precipitation.",
          actionAdvice: "Avoid low gully crossings during active downpours.",
          isEvacuationOrder: false,
        };
      }
    }

    return {
      level: "NORMAL" as const,
      badgeVariant: "Normal" as const,
      summary: `Nominal baseline telemetry recorded for ${activeState}.`,
      actionAdvice: "Standard vigilance applies during monsoon episodes.",
      isEvacuationOrder: false,
    };
  }, [alerts, matchedVillage, activeState]);

  const envMetrics = useMemo(() => {
    const rainfallVal =
      relevantAlert?.rainfall24h ||
      (matchedVillage?.state === activeState ? matchedVillage.lastRainfall : null) ||
      null;
    const saturationVal = relevantAlert?.saturation || null;
    const roadStatusVal = relevantRoad ? relevantRoad.status.toUpperCase() : null;
    const roadStretchVal = relevantRoad
      ? `${relevantRoad.code} · ${relevantRoad.stretch}`
      : "Monitored highway clearance";

    return {
      rainfallVal,
      saturationVal,
      roadStatusVal,
      roadStretchVal,
    };
  }, [relevantAlert, matchedVillage, activeState, relevantRoad]);

  return (
    <PortalLayout
      allowedRoles={["citizen", "driver", "admin"]}
      title="My Area Local Landslide Risk"
      subtitle="Hyper-local slope telemetry, arterial corridor clearance, and regional monitoring for your community."
      headerActions={
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/citizen/safe-place"
            className="px-3.5 py-1.5 rounded-full bg-[#173D32]/10 hover:bg-[#173D32]/15 text-[#173D32] text-xs font-bold transition-all inline-flex items-center gap-1.5"
          >
            <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Safe Places</span>
          </Link>
          <Link
            href="/citizen/home"
            className="px-3.5 py-1.5 rounded-full bg-[#173D32] text-[#F6F4EC] text-xs font-bold hover:bg-[#1a4437] transition-all inline-flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Home</span>
          </Link>
        </div>
      }
    >
      <div className="space-y-6 w-full">
        {/* Setup notice when citizen has no configured village yet */}
        {(!citizenVillageName || !registeredState) && (
          <div className="p-4 rounded-2xl bg-[#FAF8F2] border border-[#173D32]/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl bg-[#DCE8D4] text-[#173D32] flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4" aria-hidden="true" />
              </span>
              <div>
                <p className="font-bold text-[#173D32]">Village Profile Not Yet Configured</p>
                <p className="text-[11px] text-[#173D32]/75">
                  Set your settlement in Profile to personalize default telemetry, shelter matching, and SMS alerts.
                </p>
              </div>
            </div>
            <Link
              href="/citizen/profile"
              className="px-4 py-2 rounded-full bg-[#173D32] text-[#F6F4EC] text-xs font-bold hover:bg-[#1a4437] transition-colors inline-flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
            >
              <span>Set Up Village</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
          </div>
        )}

        {dataError && (
          <div className="p-4 rounded-2xl bg-amber-50 text-amber-900 border border-amber-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" aria-hidden="true" />
              <span>Backend advisory feed notice: {dataError}</span>
            </div>
            <button
              type="button"
              onClick={handleRefresh}
              className="px-3 py-1 rounded-full bg-amber-200 hover:bg-amber-300 text-amber-950 font-bold text-xs cursor-pointer self-start sm:self-auto"
            >
              Retry Sync
            </button>
          </div>
        )}

        {/* State / Region Selector Bar */}
        <PortalFilterBar
          className="px-3 py-2.5 sm:px-4 sm:py-3"
          left={
            <nav aria-label="Select Northeast state" className="flex flex-wrap items-center gap-1.5">
              {STATE_OPTIONS.slice(0, 5).map((st) => {
                const isActive = activeState === st;
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => {
                      setIsLoading(true);
                      setSelectedStateOverride(st);
                    }}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? "bg-[#173D32] text-[#F6F4EC] shadow-xs"
                        : "bg-white text-[#173D32]/75 border border-[#173D32]/12 hover:bg-[#DCE8D4]/40 hover:text-[#173D32]"
                    }`}
                  >
                    {st}
                  </button>
                );
              })}
            </nav>
          }
          right={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRefresh}
                disabled={isLoading}
                className="px-3.5 py-1.5 rounded-full bg-white border border-[#173D32]/15 text-xs font-bold text-[#173D32] hover:bg-[#F6F4EC] inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`}
                  aria-hidden="true"
                />
                <span>Refresh</span>
              </button>
              <Link
                href="/citizen/profile"
                className="px-3.5 py-1.5 rounded-full bg-[#DCE8D4]/60 text-xs font-bold text-[#173D32] hover:bg-[#DCE8D4] inline-flex items-center gap-1.5"
              >
                <Settings className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{citizenVillageName || "Configure Village"}</span>
              </Link>
            </div>
          }
        />

        {/* Environmental Monitoring KPI Row (strictly authentic values / Data unavailable) */}
        <PortalMetricGrid columns={4}>
          <PortalKpiCard
            variant="summary"
            id="area-kpi-rainfall"
            title="24-Hour Rainfall"
            value={envMetrics.rainfallVal || "Unavailable"}
            detail="IMD rain gauge precipitation window"
            accent="blue"
            badge="IMD Feed"
            badgeTone="blue"
            isLoading={isLoading}
            icon={CloudRain}
          />
          <PortalKpiCard
            variant="summary"
            id="area-kpi-saturation"
            title="Slope Saturation"
            value={envMetrics.saturationVal || "Unavailable"}
            detail="Geotechnical piezometer soil moisture"
            accent="amber"
            badge="Sensors"
            badgeTone="amber"
            isLoading={isLoading}
            icon={Droplets}
          />
          <PortalKpiCard
            variant="summary"
            id="area-kpi-roads"
            title="Arterial Clearance"
            value={envMetrics.roadStatusVal || "Unavailable"}
            detail={envMetrics.roadStretchVal}
            accent={
              envMetrics.roadStatusVal === "BLOCKED"
                ? "red"
                : envMetrics.roadStatusVal === "CAUTION"
                ? "amber"
                : "green"
            }
            badge="NH Patrol"
            badgeTone={
              envMetrics.roadStatusVal === "BLOCKED"
                ? "red"
                : envMetrics.roadStatusVal === "CAUTION"
                ? "amber"
                : "green"
            }
            isLoading={isLoading}
            icon={Road}
          />
          <PortalKpiCard
            variant="summary"
            id="area-kpi-tier"
            title="Hazard Warning Tier"
            value={derivedRisk.level}
            detail={
              stats?.lastUpdated
                ? `Synced ${new Date(stats.lastUpdated).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}`
                : "SDMA Framework"
            }
            accent={
              derivedRisk.level === "CRITICAL"
                ? "red"
                : derivedRisk.level === "WARNING"
                ? "amber"
                : derivedRisk.level === "WATCH"
                ? "blue"
                : "green"
            }
            badge={derivedRisk.isEvacuationOrder ? "Evacuate" : "Monitored"}
            badgeTone={derivedRisk.isEvacuationOrder ? "red" : "green"}
            isLoading={isLoading}
            icon={ShieldAlert}
          />
        </PortalMetricGrid>

        {/* Split Layout: 3D GIS Map + Local Highway & Alerts */}
        <PortalSplitLayout
          leftSpan={7}
          left={
            <PortalSectionCard
              title={`${activeState} Risk Terrain`}
              subtitle={
                citizenVillageName
                  ? `Showing regional corridors near ${citizenVillageName}, ${citizenDistrict}`
                  : `3D topological corridor map for ${activeState}`
              }
              icon={<MapPin className="w-4 h-4 text-[#173D32]" aria-hidden="true" />}
              actions={
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={derivedRisk.badgeVariant} size="xs" />
                  <Link
                    href="/risk-map"
                    className="text-xs font-bold text-[#173D32] hover:underline inline-flex items-center gap-1"
                  >
                    <span>Full Map</span>
                    <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </Link>
                </div>
              }
            >
              <div className="relative h-[320px] sm:h-[420px] lg:h-[460px] w-full rounded-2xl overflow-hidden border border-[#173D32]/15 bg-[#EEF4EB]">
                <RiskMap
                  variant="mini"
                  selectedState={activeState}
                  showPlayback={false}
                  className="w-full h-full"
                />
              </div>
              <p className="mt-3 text-[11px] text-[#173D32]/70 leading-relaxed">
                Environmental readings reflect official backend feeds without synthetic overrides.
              </p>
            </PortalSectionCard>
          }
          right={
            <div className="space-y-5">
              <PortalSectionCard
                title={`Highways in ${activeState}`}
                subtitle={`${roads.length} monitored road segments`}
                icon={<Road className="w-4 h-4 text-[#173D32]" aria-hidden="true" />}
              >
                {roads.length === 0 ? (
                  <p className="text-xs text-[#173D32]/65 py-4 text-center">
                    No highway segments cataloged for {activeState}.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {roads.map((road) => (
                      <div
                        key={road.id}
                        className="p-3.5 rounded-2xl bg-white border border-[#173D32]/10 shadow-2xs"
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="font-mono text-xs font-extrabold text-[#173D32]">
                            {road.code}
                          </span>
                          <StatusBadge status={road.status} size="xs" />
                        </div>
                        <p className="text-xs font-bold text-[#173D32]">{road.name}</p>
                        <p className="text-[11px] text-[#173D32]/70 mt-0.5">{road.stretch}</p>
                        {road.statusReason && (
                          <p className="text-[11px] text-[#173D32]/80 mt-1.5 pt-1.5 border-t border-[#173D32]/10">
                            {road.statusReason}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </PortalSectionCard>

              <PortalSectionCard
                title="Local Bulletins"
                subtitle={`Active alerts in ${activeState}`}
                icon={<Bell className="w-4 h-4 text-[#B45E09]" aria-hidden="true" />}
                actions={
                  <Link
                    href="/alerts"
                    className="text-xs font-bold text-[#173D32] hover:underline"
                  >
                    All Alerts
                  </Link>
                }
              >
                {isLoading ? (
                  <p className="text-xs text-[#173D32]/60 py-6 text-center animate-pulse">
                    Synchronizing bulletins...
                  </p>
                ) : alerts.length === 0 ? (
                  <div className="py-5 text-center border border-dashed border-[#173D32]/15 rounded-2xl bg-white/60">
                    <ShieldCheck className="w-5 h-5 text-emerald-700 mx-auto mb-1" aria-hidden="true" />
                    <p className="text-xs font-bold text-[#173D32]">No Active Warnings</p>
                    <p className="text-[11px] text-[#173D32]/65">
                      Stations in {activeState} report nominal conditions.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {alerts.slice(0, 4).map((alert) => (
                      <div
                        key={alert.id}
                        className="p-3.5 rounded-2xl bg-white border border-[#173D32]/10 shadow-2xs"
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-[#173D32] text-[#F6F4EC]">
                            {alert.corridor}
                          </span>
                          <StatusBadge status={alert.severity} size="xs" />
                        </div>
                        <p className="text-xs font-bold text-[#173D32]">{alert.title}</p>
                        <p className="text-[11px] text-[#173D32]/75 mt-1 leading-relaxed">
                          {alert.advisory}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </PortalSectionCard>
            </div>
          }
        />

        {/* Plain-Language Advisory & Citizen Safety Precautions */}
        <PortalSectionCard
          title="Plain-Language Local Risk Advisory"
          subtitle={`Safety precautions and transit status for ${citizenVillageName || activeState}`}
          icon={<AlertTriangle className="w-4 h-4 text-[#B45E09]" aria-hidden="true" />}
          actions={
            <button
              type="button"
              onClick={openReportModal}
              className="px-4 py-1.5 rounded-full bg-red-700 hover:bg-red-800 text-white text-xs font-bold transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Report Hazard</span>
            </button>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-[#173D32]">
            <div className="space-y-2.5">
              <h4 className="font-bold uppercase tracking-wider text-[11px] text-[#173D32]/70">
                Mandatory Precautions
              </h4>
              <p className="text-[#173D32]/85 leading-relaxed">{derivedRisk.summary}</p>
              <ul className="space-y-1.5 text-[#173D32]/80 pl-4 list-disc text-[11px]">
                <li>Inspect slope retaining walls and foundations for fresh cracks.</li>
                <li>Stay clear of natural gully channels and steep cut-slope roads during rain.</li>
                <li>Keep phones charged and an emergency kit with medicines ready.</li>
                <li>Report sudden muddy runoff or falling rocks immediately.</li>
              </ul>
            </div>

            <div className="space-y-2.5">
              <h4 className="font-bold uppercase tracking-wider text-[11px] text-[#173D32]/70">
                Evacuation &amp; Corridor Advisory
              </h4>
              <p className="text-[#173D32]/85 leading-relaxed">
                {relevantRoad?.status === "blocked"
                  ? `CRITICAL TRANSIT WARNING: ${relevantRoad.code} (${relevantRoad.stretch}) is currently BLOCKED. Avoid travel along this sector.`
                  : relevantRoad?.status === "caution"
                  ? `CAUTION NOTICE: ${relevantRoad.code} (${relevantRoad.stretch}) reports restricted single-lane passage.`
                  : `Arterial highways in ${activeState} report normal transit under routine monitoring.`}
              </p>
              <div
                className={`p-3.5 rounded-2xl border ${
                  derivedRisk.isEvacuationOrder
                    ? "bg-red-50 border-red-300 text-red-950"
                    : "bg-emerald-50 border-emerald-200 text-emerald-950"
                }`}
              >
                <p className="font-bold uppercase tracking-wide flex items-center gap-1.5">
                  {derivedRisk.isEvacuationOrder ? (
                    <>
                      <AlertTriangle className="w-4 h-4 text-red-700" aria-hidden="true" />
                      <span>Active Evacuation Directive</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4 text-emerald-700" aria-hidden="true" />
                      <span>No General Evacuation Order Active</span>
                    </>
                  )}
                </p>
                <p className="text-[11px] mt-1 leading-relaxed">{derivedRisk.actionAdvice}</p>
              </div>
            </div>
          </div>
        </PortalSectionCard>
      </div>
    </PortalLayout>
  );
}
