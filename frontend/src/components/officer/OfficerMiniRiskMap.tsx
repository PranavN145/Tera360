"use client";

import React, { useState } from "react";
import Link from "next/link";
import RiskMap from "@/components/RiskMap";
import { PublicRiskMapItem } from "@/types/public";

interface OfficerMiniRiskMapProps {
  corridors: PublicRiskMapItem[];
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

// Map calibrated coordinates for Northeast India regional projection (0-100 percentage space)
const DEFAULT_HOTSPOTS: Array<{
  id: string;
  name: string;
  code: string;
  state: string;
  stretch: string;
  status: "blocked" | "caution" | "open" | "partial";
  riskLevel: "Critical" | "High" | "Moderate" | "Low";
  statusReason: string;
  moisture: string;
  rainfall: string;
  x: number;
  y: number;
}> = [
  {
    id: "hotspot-nh29",
    name: "Dimapur – Kohima – Mao Highway",
    code: "NH-29",
    state: "Nagaland",
    stretch: "KM 38 to KM 52 (Phesama – Dzüdza)",
    status: "blocked",
    riskLevel: "Critical",
    statusReason: "Major slope collapse & deep mud deposit near Dzüdza Bridge; clearance underway.",
    moisture: "94% Saturation",
    rainfall: "172 mm / 24h",
    x: 74,
    y: 44,
  },
  {
    id: "hotspot-nh10",
    name: "Sevoke – Teesta Gorge Highway",
    code: "NH-10",
    state: "Sikkim",
    stretch: "KM 24 to KM 32 (29th Mile / Coronation Bridge)",
    status: "caution",
    riskLevel: "Critical",
    statusReason: "Active rockfall & riverbank slope cutting; heavy vehicles restricted.",
    moisture: "82% Saturation",
    rainfall: "118 mm / 24h",
    x: 24,
    y: 38,
  },
  {
    id: "hotspot-nh27",
    name: "Haflong – Jatinga – Silchar Highway",
    code: "NH-27",
    state: "Assam",
    stretch: "KM 110 to KM 135 (Borail Hill Range)",
    status: "open",
    riskLevel: "Moderate",
    statusReason: "Normal transit operational; cautionary speed limits on mountain curves.",
    moisture: "68% Saturation",
    rainfall: "64 mm / 24h",
    x: 52,
    y: 56,
  },
  {
    id: "hotspot-nh6",
    name: "Sonapur Tunnel Corridor",
    code: "NH-6",
    state: "Meghalaya",
    stretch: "KM 78 to KM 92 (East Jaintia Hills)",
    status: "caution",
    riskLevel: "High",
    statusReason: "Slurry runoff and silt deposits across southern portal; convoy active.",
    moisture: "86% Saturation",
    rainfall: "124 mm / 24h",
    x: 44,
    y: 68,
  },
];

export default function OfficerMiniRiskMap({
  corridors,
  isLoading = false,
  error = null,
  onRetry,
}: OfficerMiniRiskMapProps) {
  // Use fetched corridors if they contain map coordinates; otherwise fall back to calibrated Northeast hotspots
  const displayHotspots = React.useMemo(() => {
    if (corridors && corridors.length > 0) {
      return corridors.map((c, idx) => {
        const fallback = DEFAULT_HOTSPOTS[idx % DEFAULT_HOTSPOTS.length];
        return {
          id: c.id,
          name: c.name,
          code: c.code,
          state: c.state,
          stretch: c.stretch,
          status: (c.status || "open") as "blocked" | "caution" | "open" | "partial",
          riskLevel: (c.riskLevel || "Low") as "Critical" | "High" | "Moderate" | "Low",
          statusReason: c.statusReason || fallback.statusReason,
          moisture: c.riskLevel === "Critical" ? "92% Saturation" : c.riskLevel === "High" ? "82% Saturation" : "65% Saturation",
          rainfall: c.riskLevel === "Critical" ? "165 mm / 24h" : "78 mm / 24h",
          x: c.mapCoordinates?.x ?? fallback.x,
          y: c.mapCoordinates?.y ?? fallback.y,
        };
      });
    }
    return DEFAULT_HOTSPOTS;
  }, [corridors]);

  const [activeHotspotId, setActiveHotspotId] = useState<string>(
    displayHotspots[0]?.id || "hotspot-nh29"
  );
  const [filterMode, setFilterMode] = useState<"all" | "critical">("all");

  const filteredHotspots = React.useMemo(() => {
    if (filterMode === "critical") {
      return displayHotspots.filter(
        (h) => h.riskLevel === "Critical" || h.status === "blocked"
      );
    }
    return displayHotspots;
  }, [displayHotspots, filterMode]);

  const activeHotspot =
    filteredHotspots.find((h) => h.id === activeHotspotId) ||
    filteredHotspots[0] ||
    displayHotspots[0];

  const getMarkerColor = (risk: string, status: string) => {
    if (risk === "Critical" || status === "blocked") return "#DC2626"; // red
    if (risk === "High" || status === "caution" || status === "partial") return "#EA580C"; // orange
    if (risk === "Moderate") return "#D97706"; // amber
    return "#16A34A"; // green
  };

  return (
    <div className="bg-[#FAF8F2] border border-[#173D32]/12 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-4 border-b border-[#173D32]/10 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#173D32]/70">
              GIS Radar Engine · Northeast Sector
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-extrabold text-[#173D32] mt-0.5">
            Current Risk Hotspots & Corridors
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {/* Filter Pill */}
          <div className="flex items-center rounded-xl bg-[#F6F4EC] border border-[#173D32]/15 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setFilterMode("all")}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                filterMode === "all"
                  ? "bg-[#173D32] text-[#F6F4EC] shadow-2xs"
                  : "text-[#173D32]/70 hover:text-[#173D32]"
              }`}
            >
              All ({displayHotspots.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode("critical")}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                filterMode === "critical"
                  ? "bg-red-700 text-white shadow-2xs"
                  : "text-red-700 hover:text-red-900"
              }`}
            >
              Critical Only
            </button>
          </div>

          <Link
            href="/officer/map"
            className="px-3 py-1.5 rounded-full bg-[#173D32] hover:bg-[#1a4437] text-[#F6F4EC] text-xs font-bold transition-colors flex items-center gap-1 shrink-0"
            title="Expand to Fullscreen GIS Map"
          >
            <span>Expand Map</span>
            <span>↗</span>
          </Link>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="min-h-[260px] rounded-2xl bg-[#173D32]/5 border border-[#173D32]/10 flex flex-col items-center justify-center gap-3 p-8 animate-pulse">
          <div className="w-10 h-10 rounded-full border-2 border-[#173D32]/30 border-t-[#173D32] animate-spin" />
          <p className="text-xs font-semibold text-[#173D32]/70">
            Querying spatial radar layers and corridor status...
          </p>
        </div>
      )}

      {/* Error State */}
      {!isLoading && error && (
        <div className="min-h-[220px] rounded-2xl bg-red-50 border border-red-200 p-5 flex flex-col items-center justify-center text-center gap-2.5">
          <span className="text-2xl">⚠️</span>
          <p className="text-xs font-bold text-red-900">{error}</p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-2 px-3 py-1 rounded-full bg-red-700 text-white text-xs font-bold hover:bg-red-800 transition-colors"
            >
              Retry Hotspots Sync
            </button>
          )}
        </div>
      )}

      {/* Active Hotspot Radar Canvas */}
      {!isLoading && !error && (
        <div className="space-y-4">
          {/* High-Fidelity 3D Terrain Mini Map */}
          <div className="relative rounded-2xl overflow-hidden border border-[#173D32]/20 shadow-xs h-[250px] sm:h-[270px] bg-[#EEF4EB]">
            <RiskMap
              variant="mini"
              showPlayback={false}
              showControls={false}
              className="w-full h-full"
            />
          </div>

          {/* Active Hotspot Telemetry Card */}
          {activeHotspot && (
            <div className="p-3.5 sm:p-4 rounded-2xl bg-[#F6F4EC] border border-[#173D32]/12 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[#173D32]">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-[#173D32] text-[#F6F4EC] text-xs font-black">
                    {activeHotspot.code}
                  </span>
                  <span className="font-extrabold text-xs sm:text-sm">
                    {activeHotspot.name}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      activeHotspot.status === "blocked"
                        ? "bg-red-100 text-red-800 border border-red-200"
                        : activeHotspot.status === "caution" || activeHotspot.status === "partial"
                        ? "bg-amber-100 text-amber-800 border border-amber-200"
                        : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                    }`}
                  >
                    {activeHotspot.status}
                  </span>
                </div>
                <p className="text-xs text-[#173D32]/75">
                  📍 {activeHotspot.stretch} ({activeHotspot.state})
                </p>
                <p className="text-[11px] text-[#173D32]/85 font-medium leading-snug">
                  {activeHotspot.statusReason}
                </p>
              </div>

              <div className="shrink-0 flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#173D32]/10 text-xs">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-[#173D32]/10 text-[11px] font-bold">
                    💧 {activeHotspot.moisture}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-[#173D32]/10 text-[11px] font-bold">
                    🌧️ {activeHotspot.rainfall}
                  </span>
                </div>
                <Link
                  href="/officer/map"
                  className="text-xs font-bold text-[#173D32] hover:underline flex items-center gap-1"
                >
                  View in GIS Map →
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
