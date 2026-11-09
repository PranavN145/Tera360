"use client";

import React from "react";

interface OfficerDataStatusProps {
  lastUpdated?: Date | null;
  isLoading?: boolean;
  onRefresh?: () => void;
}

export default function OfficerDataStatus({
  lastUpdated,
  isLoading = false,
  onRefresh,
}: OfficerDataStatusProps) {
  const pipelines = [
    {
      id: "sar-radar",
      name: "Sentinel-1 SAR Radar",
      provider: "Copernicus / ESA Constellation",
      status: "OK · Nominal",
      statusColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
      icon: "🛰️",
      lastSync: "18m ago (Pass #2841)",
      nextWindow: "In ~4.2 hours",
      details: "Interferometric Wide Swath (IW) C-Band Coherence active",
    },
    {
      id: "rainfall-gauge",
      name: "Precipitation Telemetry",
      provider: "IMD AWS & NASA GPM IMERG",
      status: "OK · Active",
      statusColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
      icon: "🌧️",
      lastSync: "6m ago (Live Stream)",
      nextWindow: "Continuous (15m interval)",
      details: "24 regional automatic weather stations streaming live",
    },
    {
      id: "ground-sensors",
      name: "Slope Geotechnical Mesh",
      provider: "Borehole Piezometers & Inclinometers",
      status: "12 / 12 Online",
      statusColor: "bg-blue-100 text-blue-800 border-blue-200",
      icon: "📶",
      lastSync: "2m ago (Pore Pressure)",
      nextWindow: "Real-time telemetry",
      details: "Sub-surface shear and pore pressure live on NH-29 & NH-10",
    },
  ];

  return (
    <div className="bg-[#FAF8F2] border border-[#173D32]/12 rounded-3xl p-5 sm:p-6 shadow-xs">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#173D32]/10 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#173D32]/70">
              Sensor Pipelines & Telemetry Status
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-extrabold text-[#173D32] mt-0.5">
            Rainfall & SAR-Data Ingestion
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-[#173D32]/70 font-semibold">
            Sync: {lastUpdated ? lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Live"}
          </span>
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isLoading}
              className="px-3 py-1 rounded-full bg-[#173D32]/10 hover:bg-[#173D32]/15 text-[#173D32] text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Poll latest sensor stream"
            >
              <span className={isLoading ? "animate-spin" : ""}>↻</span>
              <span>Sync</span>
            </button>
          )}
        </div>
      </div>

      {/* Pipeline Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {pipelines.map((pipe) => (
          <div
            key={pipe.id}
            className="p-4 rounded-2xl bg-[#F6F4EC] border border-[#173D32]/10 hover:border-[#173D32]/25 transition-all flex flex-col justify-between"
          >
            <div>
              {/* Top row */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-base select-none">{pipe.icon}</span>
                  <span className="text-xs font-black text-[#173D32]">
                    {pipe.name}
                  </span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${pipe.statusColor}`}
                >
                  {pipe.status}
                </span>
              </div>

              <p className="text-[11px] text-[#173D32]/60 font-semibold">
                {pipe.provider}
              </p>

              <p className="text-xs text-[#173D32]/85 font-medium mt-2 leading-snug">
                {pipe.details}
              </p>
            </div>

            {/* Ingest metrics */}
            <div className="mt-3 pt-2 border-t border-[#173D32]/8 flex items-center justify-between text-[10px] font-mono text-[#173D32]/70 font-semibold">
              <span>Last Ingest: {pipe.lastSync}</span>
              <span>{pipe.nextWindow}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
