"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bell,
  CloudRain,
  Droplets,
  Map,
  MapPin,
  PhoneCall,
  RefreshCw,
  Road,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Square,
  Users,
  Volume2,
  Zap,
} from "lucide-react";
import PortalLayout from "@/components/portal/PortalLayout";
import PortalMetricGrid from "@/components/portal/PortalMetricGrid";
import PortalSectionCard from "@/components/portal/PortalSectionCard";
import { PortalKpiCard } from "@/components/portal";
import StatusBadge from "@/components/ui/StatusBadge";
import RiskMap from "@/components/RiskMap";
import { useApp } from "@/context/AppContext";
import { publicApi } from "@/lib/api";
import { PublicAlertItem, PublicRoadStatusItem, PublicStats } from "@/types/public";
import { getVillageByName } from "@/data/villages";

export default function CitizenHomePage() {
  const { user, openReportModal, addToast } = useApp();

  const [alerts, setAlerts] = useState<PublicAlertItem[]>([]);
  const [roads, setRoads] = useState<PublicRoadStatusItem[]>([]);
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const [playingAlertId, setPlayingAlertId] = useState<string | null>(null);

  const citizenVillageName = user?.village?.villageName || "Phesama";
  const citizenState = user?.village?.state || "Nagaland";
  const citizenDistrict = user?.village?.district || "Kohima";

  const matchedVillage = useMemo(() => {
    return getVillageByName(citizenVillageName);
  }, [citizenVillageName]);

  const handleRefresh = useCallback(async () => {
    setIsLoading(true);
    setDataError(null);
    try {
      const [alertRes, roadRes, statsRes] = await Promise.all([
        publicApi.getAlerts({ state: citizenState, limit: 6 }),
        publicApi.getRoadStatus({ state: citizenState }),
        publicApi.getStats(),
      ]);
      setAlerts(alertRes.alerts);
      setRoads(roadRes);
      setStats(statsRes);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Unable to synchronize real-time alerts.";
      setDataError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [citizenState]);

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        const [alertRes, roadRes, statsRes] = await Promise.all([
          publicApi.getAlerts({ state: citizenState, limit: 6 }),
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
          const msg =
            err instanceof Error ? err.message : "Unable to synchronize real-time alerts.";
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
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [citizenState]);

  const derivedRisk = useMemo(() => {
    const hasCritical = alerts.some((a) => a.severity.toLowerCase() === "critical");
    const hasWarning = alerts.some((a) => a.severity.toLowerCase() === "warning");
    const hasWatch = alerts.some((a) => a.severity.toLowerCase() === "watch");

    if (hasCritical) {
      return {
        level: "CRITICAL" as const,
        badgeVariant: "Critical" as const,
        summary: "Severe active landslide hazard in effect for your territory.",
        actionAdvice:
          "Evacuate high-hazard hill slopes immediately to your designated shelter.",
      };
    }
    if (hasWarning) {
      return {
        level: "WARNING" as const,
        badgeVariant: "Warning" as const,
        summary: "Elevated slope instability and heavy rainfall saturation detected.",
        actionAdvice: "Avoid arterial hill roads and keep emergency essentials packed.",
      };
    }
    if (hasWatch) {
      return {
        level: "WATCH" as const,
        badgeVariant: "Watch" as const,
        summary: "Precautionary hazard advisory active for regional road links.",
        actionAdvice: "Monitor local bulletins and maintain communication readiness.",
      };
    }

    if (matchedVillage?.currentRiskLevel === "Critical") {
      return {
        level: "CRITICAL" as const,
        badgeVariant: "Critical" as const,
        summary: "High historical landslide susceptibility sector under active BRO monitoring.",
        actionAdvice:
          "Keep alert radios tuned and inspect slope drainage channels regularly.",
      };
    }
    if (matchedVillage?.currentRiskLevel === "High") {
      return {
        level: "WARNING" as const,
        badgeVariant: "Warning" as const,
        summary: "Slope sensitivity heightened by seasonal precipitation.",
        actionAdvice: "Exercise caution along steep hillside footpaths and road cuts.",
      };
    }

    return {
      level: "SAFE" as const,
      badgeVariant: "Normal" as const,
      summary: "Normal geotechnical telemetry. No critical landslide warnings detected.",
      actionAdvice: "Slope conditions remain within standard safety parameters.",
    };
  }, [alerts, matchedVillage]);

  const handleToggleSpeakAlert = (alert: PublicAlertItem) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      addToast({
        title: "Audio Read-Aloud Unavailable",
        description: "Your browser does not support client speech playback.",
        type: "warning",
      });
      return;
    }

    if (playingAlertId === alert.id) {
      window.speechSynthesis.cancel();
      setPlayingAlertId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const spokenText = `Early warning alert for ${alert.state}, ${alert.corridor}. Severity level is ${alert.severity}. ${alert.description}. Advisory: ${alert.advisory}`;
    const utterance = new SpeechSynthesisUtterance(spokenText);
    utterance.rate = 0.95;

    utterance.onend = () => setPlayingAlertId(null);
    utterance.onerror = () => setPlayingAlertId(null);

    setPlayingAlertId(alert.id);
    window.speechSynthesis.speak(utterance);
  };

  const impactedRoadsCount = roads.filter(
    (r) => r.status === "blocked" || r.status === "caution"
  ).length;
  const criticalCount = alerts.filter(
    (a) => a.severity.toLowerCase() === "critical"
  ).length;
  const familyCount = user?.familyContacts?.length ?? 0;

  return (
    <PortalLayout
      allowedRoles={["citizen", "driver", "admin"]}
      title="Citizen Community Portal"
      subtitle={`Hyper-local early warning status, safe shelters, and hazard reporting for ${citizenVillageName}, ${citizenState}.`}
      headerActions={
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={openReportModal}
            className="px-3.5 py-1.5 rounded-full bg-[#D6A65D] hover:bg-[#c8964e] text-[#173D32] text-xs font-bold transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
          >
            <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Report Danger</span>
          </button>
          <Link
            href="/citizen/safe-place"
            className="px-3.5 py-1.5 rounded-full bg-[#173D32] hover:bg-[#1a4437] text-[#F6F4EC] text-xs font-bold transition-all shadow-xs inline-flex items-center gap-1.5"
          >
            <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Safe Places</span>
          </Link>
        </div>
      }
    >
      <div className="space-y-6 w-full">
        {dataError && (
          <div className="p-4 rounded-2xl bg-amber-50 text-amber-900 border border-amber-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" aria-hidden="true" />
              <span>
                Backend advisory feed notice: {dataError} (Showing cached verification baseline)
              </span>
            </div>
            <button
              type="button"
              onClick={handleRefresh}
              className="px-3 py-1 rounded-full bg-amber-200 hover:bg-amber-300 text-amber-950 font-bold text-xs self-start sm:self-auto cursor-pointer"
            >
              Retry Sync
            </button>
          </div>
        )}

        {/* KPI Summary Strip */}
        <PortalMetricGrid columns={4}>
          <PortalKpiCard
            variant="summary"
            id="citizen-kpi-village"
            title="Registered Settlement"
            value={citizenVillageName}
            unit={citizenState}
            detail={derivedRisk.summary}
            accent={
              derivedRisk.level === "CRITICAL"
                ? "red"
                : derivedRisk.level === "WARNING"
                ? "amber"
                : derivedRisk.level === "WATCH"
                ? "blue"
                : "green"
            }
            badge={derivedRisk.level}
            badgeTone={
              derivedRisk.level === "CRITICAL"
                ? "red"
                : derivedRisk.level === "WARNING"
                ? "amber"
                : derivedRisk.level === "WATCH"
                ? "blue"
                : "green"
            }
            icon={MapPin}
          />
          <PortalKpiCard
            variant="summary"
            id="citizen-kpi-alerts"
            title={`${citizenState} Advisories`}
            value={alerts.length}
            unit={criticalCount > 0 ? `${criticalCount} Critical` : "Live Feed"}
            detail="Verified landslide & heavy rainfall advisories"
            accent="red"
            badge={criticalCount > 0 ? "Red Alert" : "Active"}
            badgeTone={criticalCount > 0 ? "red" : "amber"}
            isLoading={isLoading}
            icon={Bell}
          />
          <PortalKpiCard
            variant="summary"
            id="citizen-kpi-roads"
            title="Impacted Corridors"
            value={impactedRoadsCount}
            unit={`of ${roads.length} Roads`}
            detail="Routes under block or caution restrictions"
            accent="amber"
            badge={impactedRoadsCount > 0 ? "Caution / Blocked" : "Clear"}
            badgeTone={impactedRoadsCount > 0 ? "amber" : "green"}
            isLoading={isLoading}
            icon={Road}
          />
          <PortalKpiCard
            variant="summary"
            id="citizen-kpi-family"
            title="Family Alert Circle"
            value={familyCount}
            unit="Contacts"
            detail="Configured for automated evacuation alerts"
            accent="green"
            badge={familyCount > 0 ? "Protected" : "Setup"}
            badgeTone={familyCount > 0 ? "green" : "amber"}
            icon={Users}
          />
        </PortalMetricGrid>

        {/* Settlement Status Banner */}
        <PortalSectionCard className="p-5 sm:p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-[#173D32]/10">
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap text-[11px] text-[#173D32]/65 font-semibold">
                <span className="font-bold uppercase tracking-wider text-[#173D32]/75">
                  Registered Settlement Boundary
                </span>
                <span>·</span>
                <span>
                  {stats?.lastUpdated
                    ? `Updated ${new Date(stats.lastUpdated).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}`
                    : "Synchronized"}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#173D32] tracking-tight">
                {citizenVillageName} Village — {citizenDistrict} District, {citizenState}
              </h2>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <StatusBadge status={derivedRisk.badgeVariant} pulse={derivedRisk.level === "CRITICAL"} />
              <Link
                href="/citizen/profile"
                className="px-3.5 py-2 rounded-full bg-white border border-[#173D32]/15 text-[#173D32] hover:bg-[#DCE8D4]/40 text-xs font-bold transition-colors inline-flex items-center gap-1.5 shadow-2xs"
              >
                <Settings className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Edit Village</span>
              </Link>
              <button
                type="button"
                onClick={handleRefresh}
                disabled={isLoading}
                className="px-3.5 py-2 rounded-full bg-[#173D32]/8 hover:bg-[#173D32]/14 text-[#173D32] text-xs font-bold transition-colors inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`}
                  aria-hidden="true"
                />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          <div className="mt-4 p-4 rounded-2xl bg-[#FCFBF8] border border-[#173D32]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-0.5 text-xs">
              <p className="font-bold text-[#173D32]">{derivedRisk.summary}</p>
              <p className="text-[#173D32]/75 leading-relaxed">{derivedRisk.actionAdvice}</p>
            </div>
            <Link
              href="/citizen/report"
              className="shrink-0 px-4 py-2 rounded-full bg-red-700 hover:bg-red-800 text-white text-xs font-bold transition-colors shadow-xs inline-flex items-center gap-1.5"
            >
              <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
              <span>File Incident Report</span>
            </Link>
          </div>
        </PortalSectionCard>

        {/* Voice/SMS Bulletins + Emergency Quick Dial */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <PortalSectionCard
            className="lg:col-span-7 flex flex-col justify-between"
            title="Voice & SMS Bulletins"
            subtitle={`Official advisories broadcast to ${citizenState} residents`}
            icon={<Bell className="w-4 h-4 text-[#173D32]" aria-hidden="true" />}
            actions={
              <Link
                href="/alerts"
                className="text-xs font-bold text-[#173D32] hover:underline inline-flex items-center gap-1"
              >
                <span>View All ({alerts.length})</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </Link>
            }
          >
            {isLoading ? (
              <div className="py-10 text-center text-xs text-[#173D32]/60 animate-pulse">
                Synchronizing emergency broadcasts...
              </div>
            ) : alerts.length === 0 ? (
              <div className="py-10 text-center border border-dashed border-[#173D32]/20 rounded-2xl bg-white/60 px-4">
                <ShieldCheck className="w-7 h-7 text-emerald-700 mx-auto mb-2" aria-hidden="true" />
                <p className="text-xs font-bold text-[#173D32]">
                  No Active Landslide Alerts Broadcast for {citizenState}
                </p>
                <p className="text-[11px] text-[#173D32]/65 mt-1 max-w-sm mx-auto">
                  Monitoring stations report nominal conditions. Alerts appear automatically when rainfall thresholds trigger warnings.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {alerts.slice(0, 3).map((alert) => {
                  const isSpeaking = playingAlertId === alert.id;
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
                          <StatusBadge status={alert.severity} size="xs" />
                          <span className="font-bold text-[#173D32]">{alert.corridor}</span>
                        </div>
                        <span className="text-[11px] text-[#173D32]/60">
                          {new Date(alert.publishedAt || alert.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <p className="text-sm font-bold text-[#173D32]">{alert.title}</p>
                      <p className="text-[11px] text-[#173D32]/80 leading-relaxed">
                        {alert.advisory}
                      </p>

                      {(alert.rainfall24h || alert.saturation) && (
                        <div className="flex flex-wrap items-center gap-4 pt-1 text-[11px] text-[#173D32]/75 font-medium">
                          {alert.rainfall24h && (
                            <span className="inline-flex items-center gap-1">
                              <CloudRain className="w-3.5 h-3.5" aria-hidden="true" />
                              Rainfall: {alert.rainfall24h}
                            </span>
                          )}
                          {alert.saturation && (
                            <span className="inline-flex items-center gap-1">
                              <Droplets className="w-3.5 h-3.5" aria-hidden="true" />
                              Saturation: {alert.saturation}
                            </span>
                          )}
                        </div>
                      )}

                      <div className="pt-2 border-t border-[#173D32]/10 flex items-center justify-between gap-2">
                        <span className="text-[10px] text-[#173D32]/60">
                          Dispatched via IVRS &amp; SMS
                        </span>
                        <button
                          type="button"
                          onClick={() => handleToggleSpeakAlert(alert)}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors inline-flex items-center gap-1.5 cursor-pointer ${
                            isSpeaking
                              ? "bg-red-700 text-white"
                              : "bg-[#173D32]/10 hover:bg-[#173D32]/18 text-[#173D32]"
                          }`}
                        >
                          {isSpeaking ? (
                            <>
                              <Square className="w-3 h-3" aria-hidden="true" />
                              <span>Stop Voice</span>
                            </>
                          ) : (
                            <>
                              <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>Listen to Alert</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-4 pt-3 border-t border-[#173D32]/10 flex items-center justify-between text-[11px] text-[#173D32]/70">
              <span>Alerts follow your saved channel settings.</span>
              <Link href="/citizen/profile" className="font-bold text-[#173D32] hover:underline">
                Configure Channels
              </Link>
            </div>
          </PortalSectionCard>

          <PortalSectionCard
            className="lg:col-span-5 flex flex-col justify-between"
            title="Emergency Quick Dial"
            subtitle="Direct disaster lines & village coordinator"
            icon={<ShieldAlert className="w-4 h-4 text-red-700" aria-hidden="true" />}
          >
            <div className="space-y-3">
              {matchedVillage?.contactPerson ? (
                <div className="p-4 rounded-2xl bg-white border border-[#173D32]/15 shadow-2xs">
                  <span className="text-[10px] font-bold text-[#173D32]/60 uppercase tracking-wider block">
                    Local Village Coordinator
                  </span>
                  <span className="font-extrabold text-sm text-[#173D32] block mt-0.5">
                    {matchedVillage.contactPerson.name}
                  </span>
                  <span className="text-[11px] text-[#173D32]/70 block mb-2.5">
                    {matchedVillage.contactPerson.designation}
                  </span>
                  <a
                    href={`tel:${matchedVillage.contactPerson.phone}`}
                    className="w-full py-2 px-3 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <PhoneCall className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Call Elder: {matchedVillage.contactPerson.phone}</span>
                  </a>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-white border border-[#173D32]/10 text-xs text-[#173D32]/75">
                  <span className="font-bold block text-[#173D32]">Village Point of Contact</span>
                  <p className="text-[11px] mt-0.5">
                    Select a verified settlement in Profile to enable direct village elder dialing.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
                {[
                  { code: "1070", label: "SDMA State Control", sub: "24/7 Disaster Helpline" },
                  { code: "112", label: "National Emergency", sub: "Police, Fire & Rescue" },
                  { code: "108", label: "Medical Ambulance", sub: "Emergency Paramedic Dispatch" },
                  { code: "1077", label: "District Emergency", sub: "Collectorate Control Cell" },
                ].map((line) => (
                  <a
                    key={line.code}
                    href={`tel:${line.code}`}
                    className="p-3 rounded-2xl bg-white hover:bg-[#FCFBF8] border border-[#173D32]/12 flex items-center justify-between text-xs transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-9 h-8 rounded-xl bg-[#DCE8D4]/75 text-[#173D32] flex items-center justify-center font-black text-xs">
                        {line.code}
                      </span>
                      <div>
                        <span className="block font-bold text-[#173D32]">{line.label}</span>
                        <span className="text-[10px] text-[#173D32]/65">{line.sub}</span>
                      </div>
                    </div>
                    <PhoneCall className="w-3.5 h-3.5 text-[#173D32]/70" aria-hidden="true" />
                  </a>
                ))}
              </div>
            </div>
          </PortalSectionCard>
        </div>

        {/* Interactive Map Preview */}
        <PortalSectionCard
          title="Territory Landslide Risk Map"
          subtitle={`Real-time 3D slope terrain & arterial highway clearance near ${citizenVillageName}`}
          icon={<Map className="w-4 h-4 text-[#173D32]" aria-hidden="true" />}
          actions={
            <Link
              href="/citizen/my-area"
              className="px-3.5 py-1.5 rounded-full bg-[#173D32] text-[#F6F4EC] text-xs font-bold hover:bg-[#1a4437] transition-colors inline-flex items-center gap-1.5"
            >
              <span>Inspect Corridor Details</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
          }
        >
          <div className="h-[340px] sm:h-[400px] w-full rounded-2xl overflow-hidden border border-[#173D32]/15 relative shadow-xs">
            <RiskMap variant="mini" className="w-full h-full" selectedState={citizenState} />
          </div>

          <div className="mt-3 pt-3 border-t border-[#173D32]/10 flex flex-wrap items-center gap-2.5 text-xs">
            <span className="font-bold text-[#173D32]">
              Monitored Corridors ({roads.length}):
            </span>
            {roads.slice(0, 4).map((rd) => (
              <span
                key={rd.id}
                className="px-2.5 py-1 rounded-full bg-white border border-[#173D32]/12 font-mono text-[11px] inline-flex items-center gap-1.5"
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    rd.status === "blocked"
                      ? "bg-red-600"
                      : rd.status === "caution"
                      ? "bg-amber-500"
                      : "bg-emerald-600"
                  }`}
                />
                <strong className="text-[#173D32]">{rd.code}</strong>
                <span className="text-[#173D32]/75 uppercase">{rd.status}</span>
              </span>
            ))}
          </div>
        </PortalSectionCard>

        {/* Bottom Cards: Designated Safe Shelter + Action Shortcuts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <PortalSectionCard
            className="flex flex-col justify-between"
            title="Nearest Safe Shelter"
            subtitle="Verified high-elevation bedrock refuge"
            icon={<ShieldCheck className="w-4 h-4 text-emerald-700" aria-hidden="true" />}
          >
            {matchedVillage?.safeShelter ? (
              <div className="space-y-3 text-xs">
                <div>
                  <h4 className="font-extrabold text-base text-[#173D32]">
                    {matchedVillage.safeShelter.name}
                  </h4>
                  <p className="text-[#173D32]/70 text-[11px] mt-0.5">
                    High-elevation refuge designated for {citizenVillageName} residents
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-2xl bg-white border border-[#173D32]/10">
                    <span className="text-[#173D32]/60 text-[10px] font-bold uppercase block">
                      Estimated Distance
                    </span>
                    <span className="text-sm font-black text-[#173D32]">
                      {matchedVillage.safeShelter.distanceKm} km
                    </span>
                    <span className="text-[10px] text-[#173D32]/65 block mt-0.5">
                      ~{Math.round(matchedVillage.safeShelter.distanceKm * 15)} mins on foot
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white border border-[#173D32]/10">
                    <span className="text-[#173D32]/60 text-[10px] font-bold uppercase block">
                      Designated Capacity
                    </span>
                    <span className="text-sm font-black text-[#173D32]">
                      {matchedVillage.safeShelter.capacity} Persons
                    </span>
                    <span className="text-[10px] text-[#173D32]/65 block mt-0.5">
                      Relief staging ready
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-[#173D32]/75">
                <p className="font-bold text-[#173D32]">
                  No designated shelter matched for custom village entry.
                </p>
                <p className="text-[11px] mt-1">
                  Browse regional safe shelters or configure your settlement in Profile.
                </p>
              </div>
            )}

            <div className="mt-4 pt-3 border-t border-[#173D32]/10 flex items-center justify-between gap-2 text-xs">
              <span className="text-[11px] text-[#173D32]/70">
                Satellite comms &amp; water reserves available.
              </span>
              <Link
                href="/citizen/safe-place"
                className="px-4 py-2 rounded-full bg-[#173D32] text-[#F6F4EC] text-xs font-bold hover:bg-[#1a4437] transition-colors inline-flex items-center gap-1.5 shrink-0"
              >
                <span>Directions &amp; Shelters</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </Link>
            </div>
          </PortalSectionCard>

          <PortalSectionCard
            className="flex flex-col justify-between"
            title="Resident Action Shortcuts"
            subtitle="Quick access to community safety tools"
            icon={<Zap className="w-4 h-4 text-[#D6A65D]" aria-hidden="true" />}
          >
            <div className="space-y-2.5 text-xs">
              <button
                type="button"
                onClick={openReportModal}
                className="w-full p-3.5 rounded-2xl bg-white hover:bg-[#FCFBF8] border border-[#173D32]/12 text-left flex items-center justify-between gap-3 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-xl bg-[#FEF1DC] text-[#B45E09] flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-4 h-4" aria-hidden="true" />
                  </span>
                  <div>
                    <span className="font-bold text-[#173D32] block">
                      One-Tap Hazard Reporting
                    </span>
                    <span className="text-[11px] text-[#173D32]/70">
                      Submit photos of slope cracks, rockfall, or road subsidence
                    </span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-red-700 shrink-0" aria-hidden="true" />
              </button>

              <Link
                href="/citizen/profile"
                className="w-full p-3.5 rounded-2xl bg-white hover:bg-[#FCFBF8] border border-[#173D32]/12 text-left flex items-center justify-between gap-3 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-xl bg-[#DCE8D4]/80 text-[#173D32] flex items-center justify-center shrink-0">
                    <Users className="w-4 h-4" aria-hidden="true" />
                  </span>
                  <div>
                    <span className="font-bold text-[#173D32] block">
                      Family Emergency Circle
                    </span>
                    <span className="text-[11px] text-[#173D32]/70">
                      {familyCount} family members configured for broadcast alerts
                    </span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-[#173D32] shrink-0" aria-hidden="true" />
              </Link>

              <Link
                href="/citizen/my-area"
                className="w-full p-3.5 rounded-2xl bg-white hover:bg-[#FCFBF8] border border-[#173D32]/12 text-left flex items-center justify-between gap-3 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-xl bg-[#E2F1F8] text-[#17688A] flex items-center justify-center shrink-0">
                    <BarChart3 className="w-4 h-4" aria-hidden="true" />
                  </span>
                  <div>
                    <span className="font-bold text-[#173D32] block">
                      Slope Saturation Telemetry
                    </span>
                    <span className="text-[11px] text-[#173D32]/70">
                      Examine rainfall totals, piezometer data &amp; highway clearance
                    </span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-[#173D32] shrink-0" aria-hidden="true" />
              </Link>
            </div>

            <div className="mt-4 pt-3 border-t border-[#173D32]/10 text-[11px] text-[#173D32]/70 flex items-center justify-between">
              <span>Verified by District Disaster Officers.</span>
              <Link href="/citizen/report" className="font-bold underline text-[#173D32]">
                Detailed Report Form
              </Link>
            </div>
          </PortalSectionCard>
        </div>
      </div>
    </PortalLayout>
  );
}
