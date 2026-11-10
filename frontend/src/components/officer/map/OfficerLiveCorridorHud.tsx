"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CloudRain,
  Flame,
  GitFork,
  Mountain,
  Radio,
  Route,
  ShieldCheck,
} from "lucide-react";
import { PublicAlertItem, PublicRiskMapItem } from "@/types/public";
import {
  classifyCorridorSeverity,
  getAlternateRouteSummary,
} from "./corridorTelemetry";

export interface OfficerMapLayersState {
  hillshade: boolean;
  hazardHeatmap: boolean;
  rescueRoute: boolean;
  fieldSensors: boolean;
}

interface OfficerLiveCorridorHudProps {
  corridors: PublicRiskMapItem[];
  selectedCorridor: PublicRiskMapItem | null;
  matchedAlert: PublicAlertItem | null;
  selectedState: string;
  layers: OfficerMapLayersState;
  onToggleLayer: (key: keyof OfficerMapLayersState, next: boolean) => void;
  onSelectCorridor: (corridor: PublicRiskMapItem) => void;
}

interface HudLayerRowProps {
  id: string;
  label: string;
  icon: React.ReactNode;
  checked: boolean;
  onChange: (next: boolean) => void;
  activeTrackClass?: string;
}

function HudLayerRow({
  id,
  label,
  icon,
  checked,
  onChange,
  activeTrackClass = "bg-[#173D32]",
}: HudLayerRowProps) {
  return (
    <label
      htmlFor={id}
      className="flex items-center justify-between gap-2.5 py-1 px-1.5 rounded-lg hover:bg-[#173D32]/5 transition-colors cursor-pointer select-none"
    >
      <span className="flex items-center gap-2 min-w-0">
        <span className="shrink-0 flex items-center justify-center" aria-hidden="true">
          {icon}
        </span>
        <span className="text-xs font-semibold text-[#173D32] truncate">
          {label}
        </span>
      </span>

      <span className="relative inline-flex items-center shrink-0">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
        />
        <span
          role="switch"
          aria-checked={checked}
          aria-label={label}
          className={`inline-flex h-5 w-9 items-center rounded-full p-0.5 transition-colors duration-200 ${
            checked ? activeTrackClass : "bg-[#CBD5CC]"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 rounded-full bg-white shadow-xs transition-transform duration-200 ${
              checked ? "translate-x-4" : "translate-x-0"
            }`}
          />
        </span>
      </span>
    </label>
  );
}

export default function OfficerLiveCorridorHud({
  corridors,
  selectedCorridor,
  matchedAlert,
  selectedState,
  layers,
  onToggleLayer,
  onSelectCorridor,
}: OfficerLiveCorridorHudProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileCollapsed, setIsMobileCollapsed] = useState<boolean | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isDropdownOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [isDropdownOpen]);

  const severity = selectedCorridor
    ? classifyCorridorSeverity(selectedCorridor, matchedAlert)
    : null;
  const statusLower = (selectedCorridor?.status || "").toLowerCase();
  const isBlocked = statusLower === "blocked" || severity === "Critical";
  const isWarning =
    !isBlocked &&
    (severity === "Warning" || statusLower === "caution" || statusLower === "partial");

  const alertCardStyles = !selectedCorridor
    ? {
        wrapper: "bg-[#F6F4EC] border-[#173D32]/12",
        title: "text-[#173D32]",
        subtitle: "text-[#173D32]/75",
        badge: "bg-[#173D32]/15 text-[#173D32]",
        badgeText: "NOMINAL",
        iconBg: "bg-[#DCE8D4] text-[#173D32]",
      }
    : isBlocked
    ? {
        wrapper: "bg-[#FEF2F2]/95 border-[#FECACA]",
        title: "text-[#991B1B]",
        subtitle: "text-[#7F1D1D]",
        badge: "bg-[#DC2626] text-white",
        badgeText: statusLower === "blocked" ? "BLOCKED" : "CRITICAL",
        iconBg: "bg-[#FEE2E2] text-[#DC2626]",
      }
    : isWarning
    ? {
        wrapper: "bg-[#FFFBEB]/95 border-[#FDE68A]",
        title: "text-[#92400E]",
        subtitle: "text-[#78350F]",
        badge: "bg-[#D97706] text-white",
        badgeText: statusLower === "caution" ? "CAUTION" : "WARNING",
        iconBg: "bg-[#FEF3C7] text-[#D97706]",
      }
    : {
        wrapper: "bg-[#ECFDF5]/95 border-[#A7F3D0]",
        title: "text-[#166534]",
        subtitle: "text-[#14532D]",
        badge: "bg-[#16A34A] text-white",
        badgeText: "OPEN",
        iconBg: "bg-[#DCFCE7] text-[#16A34A]",
      };

  const alertSubtitle = selectedCorridor
    ? `${selectedCorridor.code} · ${
        matchedAlert?.location || selectedCorridor.stretch
      }`
    : `No active corridor alerts in ${selectedState}`;

  const alternateRoute = getAlternateRouteSummary(selectedCorridor, matchedAlert);

  return (
    <aside
      aria-label="Live Corridor HUD"
      className="absolute top-3 left-3 sm:top-4 sm:left-4 z-20 w-[calc(100%-56px)] max-w-[300px] sm:w-[318px] sm:max-w-[318px] max-h-[calc(100%-24px)] sm:max-h-[calc(100%-32px)] overflow-y-auto bg-[#FAF8F2]/95 backdrop-blur-md border border-[#173D32]/15 rounded-2xl shadow-[0_12px_32px_rgba(23,61,50,0.16)] p-3 sm:p-4 text-[#173D32] select-none transition-all"
    >
      {/* Card Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Radio
            className="w-4 h-4 text-[#173D32] shrink-0"
            strokeWidth={2.2}
            aria-hidden="true"
          />
          <h2 className="text-[13px] sm:text-sm font-extrabold text-[#173D32] tracking-tight truncate">
            Live Corridor Map
          </h2>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Corridor Selector Pill */}
          <div ref={dropdownRef} className="relative">
            <button
              type="button"
              onClick={() => corridors.length > 0 && setIsDropdownOpen((prev) => !prev)}
              disabled={corridors.length === 0}
              aria-haspopup="listbox"
              aria-expanded={isDropdownOpen}
              aria-label="Select monitored corridor"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#DCE8D4]/75 hover:bg-[#DCE8D4] border border-[#173D32]/15 text-[11px] font-extrabold text-[#173D32] transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-default"
            >
              <span>{selectedCorridor?.code || "All"}</span>
              {corridors.length > 0 && (
                <ChevronDown
                  className={`w-3.5 h-3.5 text-[#173D32]/75 transition-transform ${
                    isDropdownOpen ? "rotate-180" : ""
                  }`}
                  aria-hidden="true"
                />
              )}
            </button>

            {isDropdownOpen && corridors.length > 0 && (
              <div
                role="listbox"
                aria-label="Available highway corridors"
                className="absolute right-0 mt-1.5 w-60 max-w-[calc(100vw-3rem)] max-h-56 overflow-y-auto rounded-xl bg-[#FAF8F2] border border-[#173D32]/15 shadow-xl p-1 z-30"
              >
                {corridors.map((c) => {
                  const isActive = selectedCorridor?.id === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      onClick={() => {
                        onSelectCorridor(c);
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-2 rounded-lg transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                        isActive
                          ? "bg-[#173D32] text-[#F6F4EC]"
                          : "hover:bg-[#173D32]/8 text-[#173D32]"
                      }`}
                    >
                      <div className="min-w-0">
                        <span className="block text-xs font-extrabold leading-tight">
                          {c.code} · {c.state}
                        </span>
                        <span
                          className={`block text-[10px] truncate mt-0.5 ${
                            isActive ? "text-[#F6F4EC]/75" : "text-[#173D32]/65"
                          }`}
                        >
                          {c.name}
                        </span>
                      </div>
                      <span
                        className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded shrink-0 ${
                          c.status === "blocked"
                            ? "bg-red-600 text-white"
                            : c.status === "caution" || c.status === "partial"
                            ? "bg-amber-500 text-white"
                            : "bg-emerald-600 text-white"
                        }`}
                      >
                        {c.status}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Mobile-only collapse button */}
          <button
            type="button"
            onClick={() =>
              setIsMobileCollapsed((prev) => (prev === null ? false : !prev))
            }
            className="sm:hidden p-1 rounded-lg hover:bg-[#173D32]/8 text-[#173D32]/75 cursor-pointer"
            aria-label={
              isMobileCollapsed === false
                ? "Collapse Live Corridor HUD"
                : "Expand Live Corridor HUD"
            }
            aria-expanded={isMobileCollapsed === false}
          >
            {isMobileCollapsed === false ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Collapsible Body (always open on sm+ desktop, collapsed initially on mobile and toggleable) */}
      <div
        className={
          isMobileCollapsed === null
            ? "hidden sm:block"
            : isMobileCollapsed
            ? "hidden sm:block"
            : "block"
        }
      >
        {/* 3 Dynamic Status Cards */}
        <div className="space-y-2 mt-3">
          {/* 1. Active Corridor Alert */}
          <div
            className={`p-2.5 rounded-xl border flex items-start gap-2.5 shadow-2xs transition-colors ${alertCardStyles.wrapper}`}
          >
            <span
              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${alertCardStyles.iconBg}`}
              aria-hidden="true"
            >
              {!selectedCorridor ? (
                <ShieldCheck className="w-4 h-4" strokeWidth={2.2} />
              ) : isBlocked || isWarning ? (
                <AlertTriangle className="w-4 h-4" strokeWidth={2.2} />
              ) : (
                <CheckCircle2 className="w-4 h-4" strokeWidth={2.2} />
              )}
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1.5">
                <span className={`text-[11px] font-bold leading-tight ${alertCardStyles.title}`}>
                  Active Corridor Alert
                </span>
                <span
                  className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md tracking-wide shrink-0 ${alertCardStyles.badge}`}
                >
                  {alertCardStyles.badgeText}
                </span>
              </div>
              <p
                className={`text-[11px] font-semibold mt-0.5 leading-snug line-clamp-2 ${alertCardStyles.subtitle}`}
                title={alertSubtitle}
              >
                {alertSubtitle}
              </p>
            </div>
          </div>

          {/* 2. Rainfall Intensity */}
          <div className="p-2.5 rounded-xl bg-[#EFF6FF]/95 border border-[#BFDBFE] flex items-start gap-2.5 shadow-2xs">
            <span
              className="w-7 h-7 rounded-lg bg-[#DBEAFE] text-[#0284C7] flex items-center justify-center shrink-0 mt-0.5"
              aria-hidden="true"
            >
              <CloudRain className="w-4 h-4" strokeWidth={2.2} />
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1.5">
                <span className="text-[11px] font-bold text-[#0369A1] leading-tight">
                  Rainfall Intensity
                </span>
                <span className="text-[9.5px] font-extrabold px-1.5 py-0.5 rounded-md bg-[#0284C7] text-white whitespace-nowrap shrink-0">
                  {matchedAlert?.rainfall24h || "Monitored"}
                </span>
              </div>
              <p className="text-[11px] font-semibold text-[#0C4A6E] mt-0.5 leading-snug line-clamp-1">
                {matchedAlert?.saturation
                  ? `${matchedAlert.saturation} (Live Telemetry)`
                  : "IMD Doppler & SAR Sync Active"}
              </p>
            </div>
          </div>

          {/* 3. Alternate Rescue Route */}
          <div className="p-2.5 rounded-xl bg-[#EEF2FF]/95 border border-[#C7D2FE] flex items-start gap-2.5 shadow-2xs">
            <span
              className="w-7 h-7 rounded-lg bg-[#E0E7FF] text-[#4338CA] flex items-center justify-center shrink-0 mt-0.5"
              aria-hidden="true"
            >
              <GitFork className="w-4 h-4" strokeWidth={2.2} />
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1.5">
                <span className="text-[11px] font-bold text-[#3730A3] leading-tight">
                  Alternate Rescue Route
                </span>
                <span
                  className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md tracking-wide shrink-0 ${
                    alternateRoute.isActive
                      ? "bg-[#2563EB] text-white"
                      : "bg-[#173D32]/15 text-[#173D32]"
                  }`}
                >
                  {alternateRoute.statusLabel}
                </span>
              </div>
              <p
                className="text-[11px] font-semibold text-[#312E81] mt-0.5 leading-snug line-clamp-2"
                title={alternateRoute.description}
              >
                {alternateRoute.description}
              </p>
            </div>
          </div>
        </div>

        {/* Layer Visibility Controls */}
        <div className="pt-3 mt-3 border-t border-[#173D32]/10">
          <span className="text-xs font-bold text-[#173D32] block mb-1.5 px-1">
            Layer Visibility
          </span>

          <div className="space-y-0.5">
            <HudLayerRow
              id="hud-layer-hillshade"
              label="3D Terrain Hillshade"
              checked={layers.hillshade}
              onChange={(next) => onToggleLayer("hillshade", next)}
              icon={<Mountain className="w-4 h-4 text-[#173D32]" strokeWidth={2.1} />}
            />
            <HudLayerRow
              id="hud-layer-heatmap"
              label="Hazard Risk Heatmap"
              checked={layers.hazardHeatmap}
              onChange={(next) => onToggleLayer("hazardHeatmap", next)}
              icon={<Flame className="w-4 h-4 text-[#D97706]" strokeWidth={2.1} />}
            />
            <HudLayerRow
              id="hud-layer-rescue"
              label="Emergency Rescue Route"
              checked={layers.rescueRoute}
              onChange={(next) => onToggleLayer("rescueRoute", next)}
              icon={<Route className="w-4 h-4 text-[#0284C7]" strokeWidth={2.1} />}
            />
            <HudLayerRow
              id="hud-layer-sensors"
              label="Field Sensor Nodes"
              checked={layers.fieldSensors}
              onChange={(next) => onToggleLayer("fieldSensors", next)}
              icon={<Radio className="w-4 h-4 text-[#16A34A]" strokeWidth={2.1} />}
            />
          </div>
        </div>
      </div>
    </aside>
  );
}
