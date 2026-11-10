"use client";

import React, { useId } from "react";
import {
  Clock,
  CloudRain,
  Mountain,
  Radio,
  RefreshCw,
  Satellite,
  Signal,
  Zap,
  type LucideIcon,
} from "lucide-react";

interface OfficerDataStatusProps {
  lastUpdated?: Date | null;
  isLoading?: boolean;
  onRefresh?: () => void;
}

type WaveTone = "green" | "blue" | "ochre";
type BadgeTone = "green" | "blue";

interface PipelineCardConfig {
  id: string;
  name: string;
  provider: string;
  description: string;
  status: string;
  badgeTone: BadgeTone;
  showBadgeDot?: boolean;
  Icon: LucideIcon;
  iconBoxClass: string;
  iconColorClass: string;
  waveTone: WaveTone;
  lastIngestLabel: string;
  lastIngestSubtext: string;
  rightMetricLabel: string;
  rightMetricValue: string;
  RightMetricIcon: LucideIcon;
}

const WAVE_PALETTES: Record<
  WaveTone,
  { backStart: string; backEnd: string; frontStart: string; frontEnd: string }
> = {
  green: {
    backStart: "#BCEAD0",
    backEnd: "#52B778",
    frontStart: "#A7E3BC",
    frontEnd: "#3DA365",
  },
  blue: {
    backStart: "#CBE3FD",
    backEnd: "#60A5FA",
    frontStart: "#BAE0FD",
    frontEnd: "#3B82F6",
  },
  ochre: {
    backStart: "#F7DEB0",
    backEnd: "#D6A65D",
    frontStart: "#F3CE8D",
    frontEnd: "#C48D3C",
  },
};

const BADGE_STYLES: Record<BadgeTone, { pill: string; dot: string }> = {
  green: {
    pill: "bg-[#DCF5E3] text-[#166534] border-[#BBF7D0]/60",
    dot: "bg-[#16A34A]",
  },
  blue: {
    pill: "bg-[#DCE8FD] text-[#1D4ED8] border-[#BFDBFE]/60",
    dot: "bg-[#2563EB]",
  },
};

const PIPELINES: PipelineCardConfig[] = [
  {
    id: "sar-radar",
    name: "Sentinel-1 SAR Radar",
    provider: "Copernicus / ESA Constellation",
    description: "Interferometric Wide Swath (IW) C-Band coherence active.",
    status: "OK · Nominal",
    badgeTone: "green",
    Icon: Satellite,
    iconBoxClass: "bg-[#E3F3E8] border-[#1E7A45]/12",
    iconColorClass: "text-[#1E7A45]",
    waveTone: "green",
    lastIngestLabel: "Last Ingest: 18m ago",
    lastIngestSubtext: "(Pass #2841)",
    rightMetricLabel: "Latency",
    rightMetricValue: "~1.2 hours",
    RightMetricIcon: Zap,
  },
  {
    id: "rainfall-gauge",
    name: "Precipitation Telemetry",
    provider: "IMD AWS & NASA GPM IMERG",
    description: "24 regional automatic weather stations streaming live.",
    status: "OK · Active",
    badgeTone: "green",
    Icon: CloudRain,
    iconBoxClass: "bg-[#E2EFFB] border-[#1E6BA8]/12",
    iconColorClass: "text-[#1E6BA8]",
    waveTone: "blue",
    lastIngestLabel: "Last Ingest: 6m ago",
    lastIngestSubtext: "(Live Stream)",
    rightMetricLabel: "Continuity",
    rightMetricValue: "(15m interval)",
    RightMetricIcon: Signal,
  },
  {
    id: "ground-sensors",
    name: "Slope Geotechnical Mesh",
    provider: "Borehole Piezometers & Inclinometers",
    description: "Sub-surface shear and pore pressure live on NH-29 & NH-10.",
    status: "12 / 12 Online",
    badgeTone: "blue",
    showBadgeDot: true,
    Icon: Mountain,
    iconBoxClass: "bg-[#FBF0DA] border-[#A96B16]/15",
    iconColorClass: "text-[#A96B16]",
    waveTone: "ochre",
    lastIngestLabel: "Last Ingest: 2m ago",
    lastIngestSubtext: "(Pore Pressure)",
    rightMetricLabel: "Real-time",
    rightMetricValue: "Telemetry",
    RightMetricIcon: Radio,
  },
];

function CardBottomWave({ tone }: { tone: WaveTone }) {
  const uid = useId().replace(/:/g, "");
  const backGradId = `ingest-wave-back-${tone}-${uid}`;
  const frontGradId = `ingest-wave-front-${tone}-${uid}`;
  const palette = WAVE_PALETTES[tone];

  return (
    <svg
      viewBox="0 0 360 44"
      preserveAspectRatio="none"
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 bottom-0 h-8 sm:h-9 w-full select-none"
    >
      <defs>
        <linearGradient id={backGradId} x1="0%" y1="30%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={palette.backStart} stopOpacity="0.22" />
          <stop offset="55%" stopColor={palette.backEnd} stopOpacity="0.34" />
          <stop offset="100%" stopColor={palette.backEnd} stopOpacity="0.42" />
        </linearGradient>
        <linearGradient id={frontGradId} x1="0%" y1="40%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={palette.frontStart} stopOpacity="0.18" />
          <stop offset="60%" stopColor={palette.frontEnd} stopOpacity="0.32" />
          <stop offset="100%" stopColor={palette.frontEnd} stopOpacity="0.46" />
        </linearGradient>
      </defs>
      <path
        d="M 0 44 L 0 34 C 42 24, 78 33, 126 24 C 176 14, 206 27, 252 17 C 296 8, 330 22, 360 15 L 360 44 Z"
        fill={`url(#${backGradId})`}
      />
      <path
        d="M 0 44 L 0 38 C 52 30, 96 36, 148 29 C 194 23, 232 33, 278 22 C 314 14, 338 25, 360 22 L 360 44 Z"
        fill={`url(#${frontGradId})`}
      />
    </svg>
  );
}

export default function OfficerDataStatus({
  lastUpdated,
  isLoading = false,
  onRefresh,
}: OfficerDataStatusProps) {
  const formattedLastSync = lastUpdated
    ? lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "Live";

  return (
    <div className="bg-[#FAF8F2] border border-[#173D32]/12 rounded-3xl p-5 sm:p-6 shadow-xs">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#173D32]/10 mb-5">
        <div>
          <div className="flex items-center gap-2 text-[#173D32]/75">
            <Radio
              className="w-3.5 h-3.5 text-[#173D32] shrink-0"
              strokeWidth={2.2}
              aria-hidden="true"
            />
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Sensor Pipelines &amp; Telemetry Status
            </span>
          </div>
          <h3 className="text-lg sm:text-xl font-extrabold text-[#173D32] tracking-tight mt-0.5">
            Rainfall &amp; SAR-Data Ingestion
          </h3>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-center shrink-0">
          <span className="text-xs font-medium text-[#173D32]/75 tabular-nums">
            Last Sync: {formattedLastSync}
          </span>
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isLoading}
              className="px-3.5 py-1.5 rounded-full bg-[#E3EDE0] hover:bg-[#D6E5D2] border border-[#173D32]/12 text-[#173D32] text-xs font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Poll latest sensor stream"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 shrink-0 ${isLoading ? "animate-spin" : ""}`}
                strokeWidth={2.2}
                aria-hidden="true"
              />
              <span>Sync</span>
            </button>
          )}
        </div>
      </div>

      {/* Pipeline Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
        {PIPELINES.map((pipe) => {
          const { Icon, RightMetricIcon } = pipe;
          const badgeStyle = BADGE_STYLES[pipe.badgeTone];

          return (
            <article
              key={pipe.id}
              className="relative overflow-hidden h-full rounded-2xl bg-white border border-[#173D32]/10 p-4 2xl:p-5 pb-8 sm:pb-9 shadow-[0_2px_12px_-3px_rgba(23,61,50,0.06),0_1px_3px_-1px_rgba(23,61,50,0.03)] hover:border-[#173D32]/20 hover:shadow-[0_8px_20px_-6px_rgba(23,61,50,0.1)] transition-all duration-200 flex flex-col justify-between"
            >
              <CardBottomWave tone={pipe.waveTone} />

              {/* Top Content: Icon, Title, Status Badge, Source, Description */}
              <div className="relative z-10">
                <div className="flex flex-wrap xl:flex-nowrap items-center justify-between gap-1.5 mb-3">
                  <div className="flex items-center gap-1.5 2xl:gap-2 min-w-0">
                    <span
                      className={`w-8 h-8 2xl:w-9 2xl:h-9 rounded-xl border flex items-center justify-center shrink-0 ${pipe.iconBoxClass} ${pipe.iconColorClass}`}
                      aria-hidden="true"
                    >
                      <Icon className="w-4 h-4 2xl:w-[18px] 2xl:h-[18px]" strokeWidth={2} />
                    </span>
                    <h4 className="text-[12px] 2xl:text-[13.5px] font-extrabold text-[#173D32] leading-tight">
                      {pipe.name}
                    </h4>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border text-[9.5px] 2xl:text-[10px] font-bold uppercase tracking-normal 2xl:tracking-wide leading-none whitespace-nowrap shrink-0 ${badgeStyle.pill}`}
                  >
                    {pipe.showBadgeDot && (
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${badgeStyle.dot}`}
                        aria-hidden="true"
                      />
                    )}
                    <span>{pipe.status}</span>
                  </span>
                </div>

                <p className="text-xs font-semibold text-[#173D32]/65 leading-snug">
                  {pipe.provider}
                </p>

                <p className="text-[12.5px] sm:text-[13px] text-[#173D32]/85 font-medium mt-1.5 leading-relaxed">
                  {pipe.description}
                </p>
              </div>

              {/* Compact Bottom Telemetry Row */}
              <div className="relative z-10 mt-4 rounded-xl bg-[#FAF8F2]/85 border border-[#173D32]/10 grid grid-cols-[1.34fr_1fr] md:grid-cols-1 xl:grid-cols-[1.34fr_1fr] divide-x md:divide-x-0 md:divide-y xl:divide-y-0 xl:divide-x divide-[#173D32]/10">
                <div className="px-2.5 2xl:px-3 py-2.5 flex items-center gap-1.5 2xl:gap-2 min-w-0">
                  <Clock
                    className="w-3.5 h-3.5 2xl:w-4 2xl:h-4 text-[#173D32]/65 shrink-0"
                    strokeWidth={1.9}
                    aria-hidden="true"
                  />
                  <div className="min-w-0 leading-tight">
                    <span className="block text-[10.5px] 2xl:text-[11px] font-semibold text-[#173D32]/85 whitespace-nowrap">
                      {pipe.lastIngestLabel}
                    </span>
                    <span className="block text-[10.5px] 2xl:text-[11px] font-medium text-[#173D32]/65 truncate mt-0.5">
                      {pipe.lastIngestSubtext}
                    </span>
                  </div>
                </div>

                <div className="px-2.5 2xl:px-3 py-2.5 flex items-center gap-1.5 2xl:gap-2 min-w-0">
                  <RightMetricIcon
                    className="w-3.5 h-3.5 2xl:w-4 2xl:h-4 text-[#173D32]/65 shrink-0"
                    strokeWidth={1.9}
                    aria-hidden="true"
                  />
                  <div className="min-w-0 leading-tight">
                    <span className="block text-[10.5px] 2xl:text-[11px] font-semibold text-[#173D32]/85 truncate">
                      {pipe.rightMetricLabel}
                    </span>
                    <span className="block text-[10.5px] 2xl:text-[11px] font-medium text-[#173D32]/65 truncate mt-0.5">
                      {pipe.rightMetricValue}
                    </span>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
