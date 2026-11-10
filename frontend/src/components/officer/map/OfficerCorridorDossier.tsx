"use client";

import React from "react";
import {
  Activity,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Clock,
  Compass,
  FileText,
  GitFork,
  MapPin,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import { PublicAlertItem, PublicRiskMapItem } from "@/types/public";
import {
  formatCoordinatesDisplay,
  formatSyncedTimestamp,
} from "./corridorTelemetry";

interface OfficerCorridorDossierProps {
  corridors: PublicRiskMapItem[];
  selectedCorridor: PublicRiskMapItem | null;
  matchedAlert: PublicAlertItem | null;
  selectedState: string;
  isLoading: boolean;
  onSelectCorridor: (corridor: PublicRiskMapItem) => void;
  onResetState: () => void;
  onIssueAlert: (corridor: PublicRiskMapItem | null) => void;
}

export default function OfficerCorridorDossier({
  corridors,
  selectedCorridor,
  matchedAlert,
  selectedState,
  isLoading,
  onSelectCorridor,
  onResetState,
  onIssueAlert,
}: OfficerCorridorDossierProps) {
  const currentIndex = selectedCorridor
    ? corridors.findIndex((c) => c.id === selectedCorridor.id)
    : -1;

  const handlePrev = () => {
    if (corridors.length <= 1) return;
    const prevIdx = currentIndex <= 0 ? corridors.length - 1 : currentIndex - 1;
    onSelectCorridor(corridors[prevIdx]);
  };

  const handleNext = () => {
    if (corridors.length <= 1) return;
    const nextIdx = currentIndex >= corridors.length - 1 ? 0 : currentIndex + 1;
    onSelectCorridor(corridors[nextIdx]);
  };

  const formattedCoords = selectedCorridor
    ? formatCoordinatesDisplay(selectedCorridor, matchedAlert)
    : null;

  const statusLower = (selectedCorridor?.status || "").toLowerCase();
  const riskLower = (selectedCorridor?.riskLevel || "").toLowerCase();
  const isCritical = statusLower === "blocked" || riskLower === "critical";
  const isWarning =
    !isCritical &&
    (statusLower === "caution" ||
      statusLower === "partial" ||
      riskLower === "high" ||
      riskLower === "warning" ||
      riskLower === "moderate");

  const observationTone = isCritical
    ? {
        box: "bg-[#FEF2F2]/85 border-[#FECACA] text-[#7F1D1D]",
        heading: "text-[#991B1B]",
        icon: "text-[#DC2626]",
      }
    : isWarning
    ? {
        box: "bg-[#FEF8E8]/95 border-[#FCD34D]/75 text-[#78350F]",
        heading: "text-[#92400E]",
        icon: "text-[#B45309]",
      }
    : {
        box: "bg-[#ECFDF5]/85 border-[#A7F3D0] text-[#14532D]",
        heading: "text-[#166534]",
        icon: "text-[#16A34A]",
      };

  return (
    <section
      aria-label="Corridor Telemetry Dossier"
      className="relative overflow-hidden bg-[#FAF8F2] border border-[#173D32]/12 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-[0_6px_24px_-6px_rgba(23,61,50,0.08)] flex flex-col justify-between min-h-[420px] lg:min-h-[620px]"
    >
      {/* Subtle decorative mountain silhouette in top-right corner */}
      <svg
        viewBox="0 0 260 120"
        fill="none"
        aria-hidden="true"
        className="pointer-events-none select-none absolute top-0 right-0 w-56 sm:w-64 h-28 text-[#173D32]/[0.06]"
      >
        <path
          d="M20 120 L78 52 L116 86 L168 30 L215 74 L260 40 L260 120 Z"
          fill="currentColor"
        />
        <path
          d="M80 120 L140 62 L182 95 L230 48 L260 72 L260 120 Z"
          fill="currentColor"
          opacity="0.6"
        />
      </svg>

      {/* Top & Middle Content */}
      <div className="relative z-10 flex-1 flex flex-col">
        {/* Eyebrow + Quick Corridor Stepper */}
        <div className="flex items-center justify-between gap-2">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#173D32]/65">
            <GitFork className="w-3.5 h-3.5 text-[#173D32]/70" strokeWidth={2.2} aria-hidden="true" />
            <span>Corridor Telemetry Dossier</span>
          </div>

          {corridors.length > 1 && !isLoading && (
            <div className="inline-flex items-center gap-1 bg-[#F6F4EC] border border-[#173D32]/12 rounded-full px-1.5 py-0.5">
              <button
                type="button"
                onClick={handlePrev}
                aria-label="Previous corridor"
                className="p-0.5 rounded-full text-[#173D32]/75 hover:text-[#173D32] hover:bg-[#173D32]/10 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10.5px] font-bold text-[#173D32]/80 px-1 tabular-nums">
                {currentIndex >= 0 ? currentIndex + 1 : 1}/{corridors.length}
              </span>
              <button
                type="button"
                onClick={handleNext}
                aria-label="Next corridor"
                className="p-0.5 rounded-full text-[#173D32]/75 hover:text-[#173D32] hover:bg-[#173D32]/10 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Loading Skeleton */}
        {isLoading ? (
          <div className="mt-4 space-y-4 animate-pulse">
            <div className="h-7 w-4/5 rounded-lg bg-[#173D32]/10" />
            <div className="flex gap-2">
              <div className="h-6 w-16 rounded-full bg-[#173D32]/12" />
              <div className="h-6 w-24 rounded-full bg-[#173D32]/8" />
            </div>
            <div className="h-18 rounded-2xl bg-[#173D32]/6 mt-4" />
            <div className="grid grid-cols-2 gap-3">
              <div className="h-20 rounded-2xl bg-[#173D32]/6" />
              <div className="h-20 rounded-2xl bg-[#173D32]/6" />
            </div>
            <div className="h-18 rounded-2xl bg-[#173D32]/6" />
            <div className="h-24 rounded-2xl bg-[#173D32]/6" />
          </div>
        ) : selectedCorridor ? (
          <>
            {/* Corridor Title & Highway Identifier */}
            <div className="mt-2">
              <h3 className="text-xl sm:text-[22px] font-extrabold text-[#173D32] tracking-tight leading-snug">
                {selectedCorridor.name}
              </h3>

              <div className="flex flex-wrap items-center gap-2.5 mt-2.5">
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#173D32] text-[#F6F4EC] text-xs font-extrabold tracking-wide shadow-2xs">
                  {selectedCorridor.code}
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-[#173D32]/75">
                  <MapPin className="w-3.5 h-3.5 text-[#173D32]/60" strokeWidth={2.1} aria-hidden="true" />
                  <span>{selectedCorridor.state}</span>
                </span>
              </div>
            </div>

            {/* Telemetry Detail Cards */}
            <div className="mt-5 space-y-3">
              {/* 1. Stretch & Mile Marker */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-[#EEF2E9]/75 border border-[#173D32]/10 flex items-start gap-3">
                <span
                  className="w-8 h-8 rounded-xl bg-white/80 border border-[#173D32]/10 flex items-center justify-center shrink-0 text-[#173D32]"
                  aria-hidden="true"
                >
                  <MapPin className="w-4 h-4" strokeWidth={2.1} />
                </span>
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] font-semibold text-[#173D32]/65 block">
                    Stretch &amp; Mile Marker
                  </span>
                  <span className="text-sm font-extrabold text-[#173D32] mt-0.5 block leading-snug">
                    {selectedCorridor.stretch}
                  </span>
                </div>
              </div>

              {/* 2. Constraint Status & Risk Assessment (2 columns) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-white/75 border border-[#173D32]/10">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="w-6 h-6 rounded-lg bg-[#EEF2E9] flex items-center justify-center text-[#173D32]"
                      aria-hidden="true"
                    >
                      <Activity className="w-3.5 h-3.5" strokeWidth={2.2} />
                    </span>
                    <span className="text-[11px] font-semibold text-[#173D32]/65">
                      Constraint Status
                    </span>
                  </div>
                  <StatusBadge
                    status={selectedCorridor.status}
                    size="sm"
                    pulse={statusLower === "blocked"}
                  />
                </div>

                <div className="p-3.5 rounded-2xl bg-white/75 border border-[#173D32]/10">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="w-6 h-6 rounded-lg bg-[#EEF2E9] flex items-center justify-center text-[#173D32]"
                      aria-hidden="true"
                    >
                      <ShieldAlert className="w-3.5 h-3.5" strokeWidth={2.2} />
                    </span>
                    <span className="text-[11px] font-semibold text-[#173D32]/65">
                      Risk Assessment
                    </span>
                  </div>
                  <StatusBadge
                    status={selectedCorridor.riskLevel}
                    size="sm"
                    pulse={riskLower === "critical"}
                  />
                </div>
              </div>

              {/* 3. GIS Coordinates */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-[#EEF2E9]/55 border border-[#173D32]/10 flex items-start gap-3">
                <span
                  className="w-8 h-8 rounded-xl bg-white/80 border border-[#173D32]/10 flex items-center justify-center shrink-0 text-[#173D32]"
                  aria-hidden="true"
                >
                  <Compass className="w-4 h-4" strokeWidth={2.1} />
                </span>
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] font-semibold text-[#173D32]/65 block">
                    GIS Coordinates
                  </span>
                  <span className="font-mono text-sm font-bold text-[#173D32] mt-0.5 block">
                    {formattedCoords || "Coordinates pending GIS sync"}
                  </span>
                </div>
              </div>

              {/* 4. Operational Observation */}
              <div className={`p-3.5 sm:p-4 rounded-2xl border ${observationTone.box}`}>
                <div className="flex items-center gap-2 mb-1.5">
                  <FileText
                    className={`w-4 h-4 shrink-0 ${observationTone.icon}`}
                    strokeWidth={2.2}
                    aria-hidden="true"
                  />
                  <span className={`text-xs font-extrabold ${observationTone.heading}`}>
                    Operational Observation
                  </span>
                </div>
                <p className="text-xs sm:text-[12.5px] leading-relaxed font-medium">
                  {selectedCorridor.statusReason ||
                    matchedAlert?.description ||
                    `Monitored highway segment on ${selectedCorridor.code}. Current risk level evaluated as ${selectedCorridor.riskLevel}.`}
                </p>
              </div>
            </div>
          </>
        ) : (
          /* Authentic Empty State when a state has 0 corridors returned by backend */
          <div className="flex-1 flex flex-col items-center justify-center text-center py-10 px-4">
            <div className="w-12 h-12 rounded-2xl bg-[#DCE8D4]/70 border border-[#173D32]/12 flex items-center justify-center text-[#173D32] mb-3">
              <ShieldCheck className="w-6 h-6" strokeWidth={2} />
            </div>
            <h3 className="text-base font-extrabold text-[#173D32]">
              No Monitored Corridors in {selectedState}
            </h3>
            <p className="text-xs text-[#173D32]/70 mt-1.5 max-w-xs leading-relaxed">
              No active highway corridor risk records were returned by the telemetry backend for {selectedState}.
            </p>
            {selectedState !== "All States" && (
              <button
                type="button"
                onClick={onResetState}
                className="mt-4 px-4 py-2 rounded-full bg-[#173D32]/10 hover:bg-[#173D32]/15 text-[#173D32] text-xs font-bold transition-colors cursor-pointer"
              >
                Show All Northeast States
              </button>
            )}
          </div>
        )}
      </div>

      {/* Footer: Last Synced Timestamp + Issue Alert CTA */}
      <div className="relative z-10 mt-5 pt-4 border-t border-[#173D32]/10 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-1.5 text-xs font-medium text-[#173D32]/70">
          <Clock className="w-3.5 h-3.5 text-[#173D32]/60 shrink-0" strokeWidth={2.1} aria-hidden="true" />
          <span>
            Last Synced:{" "}
            <strong className="font-bold text-[#173D32]">
              {selectedCorridor
                ? formatSyncedTimestamp(selectedCorridor.lastUpdated)
                : "Live"}
            </strong>
          </span>
        </div>

        <button
          type="button"
          onClick={() => onIssueAlert(selectedCorridor)}
          disabled={isLoading || !selectedCorridor}
          className="px-4 sm:px-5 py-2.5 rounded-xl bg-[#173D32] hover:bg-[#1a4437] text-[#F6F4EC] text-xs font-bold shadow-xs hover:shadow transition-all inline-flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span>Issue Alert for Corridor</span>
          <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.4} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
