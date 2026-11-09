"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import PortalLayout from "@/components/portal/PortalLayout";
import RiskMap from "@/components/RiskMap";
import { useApp } from "@/context/AppContext";
import { publicApi } from "@/lib/api";
import { PublicAlertItem, PublicRoadStatusItem, PublicStats } from "@/types/public";
import { getVillageByName } from "@/data/villages";

export default function CitizenHomePage() {
  const { user, openReportModal, addToast } = useApp();

  // Telemetry & Alert data fetched from backend
  const [alerts, setAlerts] = useState<PublicAlertItem[]>([]);
  const [roads, setRoads] = useState<PublicRoadStatusItem[]>([]);
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [dataError, setDataError] = useState<string | null>(null);

  // Audio / Speech Synthesis state
  const [playingAlertId, setPlayingAlertId] = useState<string | null>(null);

  const citizenVillageName = user?.village?.villageName || "Phesama";
  const citizenState = user?.village?.state || "Nagaland";
  const citizenDistrict = user?.village?.district || "Kohima";

  // Matched verified village from single-source repository
  const matchedVillage = useMemo(() => {
    return getVillageByName(citizenVillageName);
  }, [citizenVillageName]);

  // Manual refresh handler
  const handleRefresh = useCallback(async () => {
    setIsLoading(true);
    setDataError(null);
    try {
      const [alertRes, roadRes, statsRes] = await Promise.all([
        publicApi.getAlerts({ state: citizenState, limit: 3 }),
        publicApi.getRoadStatus({ state: citizenState }),
        publicApi.getStats(),
      ]);
      setAlerts(alertRes.alerts);
      setRoads(roadRes);
      setStats(statsRes);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unable to synchronize real-time alerts.";
      setDataError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [citizenState]);

  // Load actual backend intelligence on mount / state change
  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        const [alertRes, roadRes, statsRes] = await Promise.all([
          publicApi.getAlerts({ state: citizenState, limit: 3 }),
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
          const msg = err instanceof Error ? err.message : "Unable to synchronize real-time alerts.";
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

  // Clean up speech synthesis if component unmounts
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Compute live village risk status from actual backend alerts combined with baseline
  const derivedRisk = useMemo(() => {
    const hasCritical = alerts.some((a) => a.severity.toLowerCase() === "critical");
    const hasWarning = alerts.some((a) => a.severity.toLowerCase() === "warning");
    const hasWatch = alerts.some((a) => a.severity.toLowerCase() === "watch");

    if (hasCritical) {
      return {
        level: "CRITICAL" as const,
        badgeBg: "bg-red-100 text-red-900 border-red-300",
        indicatorBg: "bg-red-600",
        pulse: true,
        summary: "Severe active landslide hazard in effect for your territory.",
        actionAdvice: "Evacuate high-hazard hill slopes immediately to your designated shelter.",
      };
    }
    if (hasWarning) {
      return {
        level: "WARNING" as const,
        badgeBg: "bg-amber-100 text-amber-900 border-amber-300",
        indicatorBg: "bg-amber-600",
        pulse: false,
        summary: "Elevated slope instability and heavy rainfall saturation detected.",
        actionAdvice: "Avoid arterial hill roads and pack emergency essentials.",
      };
    }
    if (hasWatch) {
      return {
        level: "WATCH" as const,
        badgeBg: "bg-yellow-100 text-yellow-900 border-yellow-300",
        indicatorBg: "bg-yellow-500",
        pulse: false,
        summary: "Precautionary hazard advisory active for regional road links.",
        actionAdvice: "Monitor local bulletins and maintain communication readiness.",
      };
    }

    // Baseline fallback from verified village registry if no active alerts
    if (matchedVillage?.currentRiskLevel === "Critical") {
      return {
        level: "CRITICAL" as const,
        badgeBg: "bg-red-100 text-red-900 border-red-300",
        indicatorBg: "bg-red-600",
        pulse: true,
        summary: "High historical landslide susceptibility sector under active BRO monitoring.",
        actionAdvice: "Keep alert radios tuned and check slope crack telemetry regularly.",
      };
    }
    if (matchedVillage?.currentRiskLevel === "High") {
      return {
        level: "WARNING" as const,
        badgeBg: "bg-amber-100 text-amber-900 border-amber-300",
        indicatorBg: "bg-amber-600",
        pulse: false,
        summary: "Slope sensitivity heightened by seasonal precipitation.",
        actionAdvice: "Exercise caution on hillside paths.",
      };
    }

    return {
      level: "SAFE" as const,
      badgeBg: "bg-emerald-100 text-emerald-900 border-emerald-300",
      indicatorBg: "bg-emerald-600",
      pulse: false,
      summary: "Normal geotechnical telemetry. No critical landslide warnings detected.",
      actionAdvice: "Slope conditions remain within standard safety parameters.",
    };
  }, [alerts, matchedVillage]);

  // Audio / Speech Synthesis read-aloud toggle
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

  // Last update timestamp representation
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
      title="Citizen Community Dashboard"
      subtitle={`Hyper-local early warning status, emergency dialers, safe shelter directions, and danger reporting for ${citizenVillageName}.`}
    >
      <div className="space-y-6 max-w-6xl">
        {dataError && (
          <div className="p-4 rounded-2xl bg-amber-50 text-amber-900 border border-amber-200 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">⚠️</span>
              <span>Backend advisory feed notice: {dataError} (Using cached verification baseline)</span>
            </div>
            <button
              type="button"
              onClick={handleRefresh}
              className="px-2.5 py-1 rounded-lg bg-amber-200 text-amber-900 font-bold hover:bg-amber-300"
            >
              Retry Sync
            </button>
          </div>
        )}

        {/* ── 1. Village Risk Status Banner ────────────────────────────────── */}
        <div className="p-6 sm:p-8 bg-[#FAF8F2] rounded-3xl border border-[#173D32]/12 shadow-2xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-[#173D32]/10">
            <div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="text-[11px] font-black uppercase tracking-wider text-[#173D32]/70 block">
                  Registered Settlement Boundary
                </span>
                <span className="text-[#173D32]/40">·</span>
                <span className="text-[11px] font-semibold text-[#173D32]/60">
                  Updated Today at {lastUpdatedDisplay}
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-[#173D32] tracking-tight">
                {citizenVillageName} Village
              </h2>
              <p className="text-xs sm:text-sm text-[#173D32]/75 mt-0.5">
                {citizenDistrict} District, {citizenState}
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
                    {derivedRisk.level}
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

          {/* Plain-Language Explanation */}
          <div className="mt-5 p-4 rounded-2xl bg-white/80 border border-[#173D32]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-0.5 text-xs">
              <span className="font-extrabold text-[#173D32] block">
                {derivedRisk.summary}
              </span>
              <p className="text-[#173D32]/80 leading-relaxed">
                {derivedRisk.actionAdvice}
              </p>
            </div>
            <button
              type="button"
              onClick={openReportModal}
              className="shrink-0 px-4 py-2.5 rounded-xl bg-red-700 hover:bg-red-800 text-white text-xs font-black tracking-wide transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <span>⚠️</span>
              <span>Report Danger Sign</span>
            </button>
          </div>
        </div>

        {/* ── 2 & 3. Voice/SMS Alerts & Emergency Quick Dial (Two Columns) ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Voice and SMS Alerts (Span 2) */}
          <div className="lg:col-span-2 p-6 sm:p-7 bg-[#FAF8F2] rounded-3xl border border-[#173D32]/12 shadow-2xs space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#173D32]/10">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📢</span>
                  <div>
                    <h3 className="text-sm font-extrabold uppercase tracking-wider text-[#173D32]">
                      Latest Voice & SMS Bulletins
                    </h3>
                    <p className="text-[11px] text-[#173D32]/70">
                      Official advisories broadcast to residents of {citizenState}
                    </p>
                  </div>
                </div>
                <Link
                  href="/alerts"
                  className="text-xs font-bold text-[#173D32] hover:underline shrink-0"
                >
                  View All ({alerts.length}) →
                </Link>
              </div>

              {/* Alert items list */}
              {isLoading ? (
                <div className="py-8 text-center text-xs text-[#173D32]/60 animate-pulse">
                  Synchronizing state emergency broadcasts...
                </div>
              ) : alerts.length === 0 ? (
                <div className="py-8 text-center border border-dashed border-[#173D32]/20 rounded-2xl bg-white/50 mt-3">
                  <span className="text-2xl block mb-1">🛡️</span>
                  <p className="text-xs font-bold text-[#173D32]">
                    No Active Landslide Alerts Broadcast for {citizenState}
                  </p>
                  <p className="text-[11px] text-[#173D32]/60 mt-0.5 max-w-sm mx-auto">
                    District emergency control rooms report nominal slope telemetry. You will receive immediate notifications if rainfall thresholds trigger warnings.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 mt-4">
                  {alerts.map((alert) => {
                    const isSpeaking = playingAlertId === alert.id;
                    const isCritical = alert.severity.toLowerCase() === "critical";

                    return (
                      <div
                        key={alert.id}
                        className={`p-4 rounded-2xl border transition-all text-xs space-y-2 ${
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
                              {alert.corridor}
                            </span>
                          </div>
                          <span className="text-[10px] text-[#173D32]/60">
                            {new Date(alert.publishedAt || alert.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        <p className="text-[#173D32] font-semibold leading-relaxed">
                          {alert.title}
                        </p>

                        <p className="text-[11px] text-[#173D32]/80 leading-relaxed">
                          {alert.advisory}
                        </p>

                        {/* Telemetry pill if present in real alert data */}
                        {(alert.rainfall24h || alert.saturation) && (
                          <div className="flex items-center gap-3 pt-1 text-[11px] text-[#173D32]/70 font-mono">
                            {alert.rainfall24h && (
                              <span>🌧️ Rainfall: {alert.rainfall24h}</span>
                            )}
                            {alert.saturation && (
                              <span>💧 Saturation: {alert.saturation}</span>
                            )}
                          </div>
                        )}

                        {/* Read-Aloud Action */}
                        <div className="pt-2 border-t border-[#173D32]/10 flex items-center justify-between">
                          <span className="text-[10px] text-[#173D32]/60 italic">
                            Dispatched via IVRS & SMS
                          </span>

                          <button
                            type="button"
                            onClick={() => handleToggleSpeakAlert(alert)}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                              isSpeaking
                                ? "bg-red-700 text-white"
                                : "bg-[#173D32]/10 hover:bg-[#173D32]/20 text-[#173D32]"
                            }`}
                            title="Spoken Audio (Text-to-Speech Fallback)"
                          >
                            <span>{isSpeaking ? "⏹ Stop Voice" : "🔊 Listen to Alert"}</span>
                            <span className="text-[9px] opacity-70">
                              {isSpeaking ? "" : "(Audio Fallback)"}
                            </span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-[#173D32]/10 flex items-center justify-between text-[11px] text-[#173D32]/70">
              <span>Automatic IVRS & SMS alerts sent to your profile number.</span>
              <Link href="/citizen/profile" className="font-bold underline text-[#173D32]">
                Configure Channels
              </Link>
            </div>
          </div>

          {/* Right Column: Emergency Quick Dial (Span 1) */}
          <div className="p-6 sm:p-7 bg-[#FAF8F2] rounded-3xl border border-[#173D32]/12 shadow-2xs space-y-4 flex flex-col justify-between">
            <div>
              <div className="pb-3 border-b border-[#173D32]/10">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🚨</span>
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-[#173D32]">
                    Emergency Quick Dial
                  </h3>
                </div>
                <p className="text-[11px] text-[#173D32]/70 mt-0.5">
                  Tap to place immediate telephone calls during hillside landslides.
                </p>
              </div>

              {/* Verified Village Elder Helpline if available */}
              <div className="space-y-3 mt-4">
                {matchedVillage?.contactPerson ? (
                  <div className="p-3.5 rounded-2xl bg-white border border-[#173D32]/15 shadow-2xs">
                    <span className="text-[10px] font-bold text-[#173D32]/60 uppercase tracking-wider block">
                      Local Village Representative
                    </span>
                    <span className="font-black text-sm text-[#173D32] block truncate mt-0.5">
                      {matchedVillage.contactPerson.name}
                    </span>
                    <span className="text-[11px] text-[#173D32]/70 block mb-2">
                      {matchedVillage.contactPerson.designation}
                    </span>
                    <a
                      href={`tel:${matchedVillage.contactPerson.phone}`}
                      className="w-full py-2 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black tracking-wide flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <span>📞 Call Elder:</span>
                      <span>{matchedVillage.contactPerson.phone}</span>
                    </a>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-2xl bg-white/70 border border-[#173D32]/10 text-xs text-[#173D32]/70">
                    <span className="font-bold block text-[#173D32]">Village Point of Contact</span>
                    <p className="text-[11px] mt-0.5">
                      No designated village elder on file for manual entry. Select verified village in profile to enable direct elder shortcut.
                    </p>
                  </div>
                )}

                {/* State Disaster Management Authority (SDMA) */}
                <a
                  href="tel:1070"
                  className="p-3 rounded-xl bg-white hover:bg-[#F6F4EC] border border-[#173D32]/15 flex items-center justify-between text-xs font-bold text-[#173D32] transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-lg bg-[#DCE8D4] flex items-center justify-center font-bold text-xs">
                      1070
                    </span>
                    <div>
                      <span className="block font-black">SDMA Emergency Control</span>
                      <span className="text-[10px] text-[#173D32]/60 font-medium">State Disaster Line (24/7)</span>
                    </div>
                  </div>
                  <span className="text-emerald-700 font-black">Call →</span>
                </a>

                {/* National Emergency Response: 112 */}
                <a
                  href="tel:112"
                  className="p-3 rounded-xl bg-white hover:bg-[#F6F4EC] border border-[#173D32]/15 flex items-center justify-between text-xs font-bold text-[#173D32] transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-lg bg-[#DCE8D4] flex items-center justify-center font-bold text-xs">
                      112
                    </span>
                    <div>
                      <span className="block font-black">National Emergency Helpline</span>
                      <span className="text-[10px] text-[#173D32]/60 font-medium">Police, Fire & Rescue</span>
                    </div>
                  </div>
                  <span className="text-emerald-700 font-black">Call →</span>
                </a>

                {/* Ambulance Service: 108 */}
                <a
                  href="tel:108"
                  className="p-3 rounded-xl bg-white hover:bg-[#F6F4EC] border border-[#173D32]/15 flex items-center justify-between text-xs font-bold text-[#173D32] transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-lg bg-[#DCE8D4] flex items-center justify-center font-bold text-xs">
                      108
                    </span>
                    <div>
                      <span className="block font-black">Medical Emergency Ambulance</span>
                      <span className="text-[10px] text-[#173D32]/60 font-medium">Disaster Paramedic Post</span>
                    </div>
                  </div>
                  <span className="text-emerald-700 font-black">Call →</span>
                </a>
              </div>
            </div>

            <div className="pt-3 border-t border-[#173D32]/10 text-[10px] text-[#173D32]/60">
              Toll-free emergency numbers operate during cellular power loss across Northeast networks.
            </div>
          </div>
        </div>

        {/* ── 4 & 5. Village Risk Map & Local Danger Zones ─────────────────── */}
        <div className="p-6 sm:p-8 bg-[#FAF8F2] rounded-3xl border border-[#173D32]/12 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#173D32]/10">
            <div>
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-[#173D32] flex items-center gap-2">
                <span>🗺️</span>
                <span>Territory Landslide Risk Map</span>
              </h3>
              <p className="text-xs text-[#173D32]/70 mt-0.5">
                Real-time 3D slope terrain and verified arterial highway clearance near {citizenVillageName}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/citizen/my-area"
                className="px-3 py-1.5 rounded-xl bg-[#173D32] text-[#F6F4EC] text-xs font-bold hover:bg-[#1a4437] transition-all"
              >
                Inspect Corridor Details →
              </Link>
            </div>
          </div>

          {/* Reused High-Fidelity 3D Mapbox GL JS Map */}
          <div className="h-[340px] sm:h-[400px] w-full rounded-2xl overflow-hidden border border-[#173D32]/15 relative shadow-xs">
            <RiskMap className="w-full h-full" selectedState={citizenState} />
          </div>

          {/* Road corridor status bar from real backend data */}
          <div className="pt-2 flex flex-wrap items-center gap-4 text-xs">
            <span className="font-bold text-[#173D32]">Monitored Corridors ({roads.length}):</span>
            {roads.slice(0, 3).map((rd) => (
              <span
                key={rd.id}
                className="px-2.5 py-1 rounded-lg bg-white border border-[#173D32]/15 font-mono text-[11px] flex items-center gap-1.5"
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    rd.status === "blocked"
                      ? "bg-red-600"
                      : rd.status === "caution"
                      ? "bg-amber-500"
                      : "bg-emerald-500"
                  }`}
                />
                <strong>{rd.code}</strong>: {rd.status.toUpperCase()}
              </span>
            ))}
          </div>
        </div>

        {/* ── 6. Nearest Safe Shelter & Evacuation Staging ──────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Nearest Shelter Card */}
          <div className="p-6 bg-[#FAF8F2] rounded-3xl border border-[#173D32]/12 shadow-2xs space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-[#173D32]/10">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🛡️</span>
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-[#173D32]">
                    Nearest Safe Shelter
                  </h3>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 text-[10px] font-black uppercase tracking-wider">
                  Verified Geotechnical Refuge
                </span>
              </div>

              {matchedVillage?.safeShelter ? (
                <div className="mt-4 space-y-3 text-xs">
                  <div>
                    <span className="font-black text-base text-[#173D32] block">
                      {matchedVillage.safeShelter.name}
                    </span>
                    <span className="text-[#173D32]/70 text-[11px] block mt-0.5">
                      Located in high-elevation stable bedrock zone ({citizenVillageName} sector)
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="p-3 rounded-xl bg-white border border-[#173D32]/10">
                      <span className="text-[#173D32]/60 text-[10px] font-bold uppercase block">
                        Estimated Distance
                      </span>
                      <span className="text-sm font-black text-[#173D32]">
                        {matchedVillage.safeShelter.distanceKm} km
                      </span>
                      <span className="text-[10px] text-[#173D32]/60 block mt-0.5">
                        ~{Math.round(matchedVillage.safeShelter.distanceKm * 15)} mins on foot
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-white border border-[#173D32]/10">
                      <span className="text-[#173D32]/60 text-[10px] font-bold uppercase block">
                        Designated Capacity
                      </span>
                      <span className="text-sm font-black text-[#173D32]">
                        {matchedVillage.safeShelter.capacity} Persons
                      </span>
                      <span className="text-[10px] text-[#173D32]/60 block mt-0.5">
                        Relief staging ready
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-[#173D32]/70">
                  <p className="font-bold">No designated shelter matched for custom village entry.</p>
                  <p className="text-[11px] mt-1 text-[#173D32]/60">
                    Consult district authorities or browse regional shelters.
                  </p>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-[#173D32]/10 flex items-center justify-between">
              <span className="text-[11px] text-[#173D32]/70">
                Satellite comms & water supplies active.
              </span>
              <Link
                href="/citizen/safe-place"
                className="px-4 py-2 rounded-xl bg-[#173D32] text-[#F6F4EC] text-xs font-bold hover:bg-[#1a4437] transition-all"
              >
                Directions & Shelters →
              </Link>
            </div>
          </div>

          {/* Emergency Community Triage & Action Shortcuts Card */}
          <div className="p-6 bg-[#FAF8F2] rounded-3xl border border-[#173D32]/12 shadow-2xs space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-[#173D32]/10">
                <div className="flex items-center gap-2">
                  <span className="text-xl">⚡</span>
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-[#173D32]">
                    Resident Action Shortcuts
                  </h3>
                </div>
                <span className="text-[11px] text-[#173D32]/60">Quick Access</span>
              </div>

              <div className="mt-4 space-y-2.5 text-xs">
                {/* Shortcut 1: Report Danger */}
                <button
                  type="button"
                  onClick={openReportModal}
                  className="w-full p-3.5 rounded-2xl bg-white hover:bg-[#FDF9F3] border border-[#173D32]/15 text-left flex items-center justify-between transition-all cursor-pointer shadow-2xs group"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl group-hover:scale-110 transition-transform">⚠️</span>
                    <div>
                      <span className="font-extrabold text-[#173D32] block">
                        One-Tap Hazard Reporting
                      </span>
                      <span className="text-[11px] text-[#173D32]/70">
                        Upload photos of slope cracks, rockfall, or road subsidence
                      </span>
                    </div>
                  </div>
                  <span className="text-red-700 font-black text-sm">Launch →</span>
                </button>

                {/* Shortcut 2: Family Contacts */}
                <Link
                  href="/citizen/profile"
                  className="w-full p-3.5 rounded-2xl bg-white hover:bg-[#FDF9F3] border border-[#173D32]/15 text-left flex items-center justify-between transition-all shadow-2xs group"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl group-hover:scale-110 transition-transform">👨‍👩‍👧‍👦</span>
                    <div>
                      <span className="font-extrabold text-[#173D32] block">
                        Family Emergency Circle
                      </span>
                      <span className="text-[11px] text-[#173D32]/70">
                        {user?.familyContacts?.length || 0} family members configured for broadcast alerts
                      </span>
                    </div>
                  </div>
                  <span className="text-[#173D32] font-black text-sm">Edit →</span>
                </Link>

                {/* Shortcut 3: My Area Telemetry */}
                <Link
                  href="/citizen/my-area"
                  className="w-full p-3.5 rounded-2xl bg-white hover:bg-[#FDF9F3] border border-[#173D32]/15 text-left flex items-center justify-between transition-all shadow-2xs group"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl group-hover:scale-110 transition-transform">📊</span>
                    <div>
                      <span className="font-extrabold text-[#173D32] block">
                        Slope Saturation Telemetry
                      </span>
                      <span className="text-[11px] text-[#173D32]/70">
                        Examine soil moisture gauges and highway blockage notices
                      </span>
                    </div>
                  </div>
                  <span className="text-[#173D32] font-black text-sm">View →</span>
                </Link>
              </div>
            </div>

            <div className="pt-3 border-t border-[#173D32]/10 text-[11px] text-[#173D32]/70 flex items-center justify-between">
              <span>All hazard reports verified by District Disaster Officers.</span>
              <Link href="/citizen/report" className="font-bold underline text-[#173D32]">
                Detailed Form
              </Link>
            </div>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
