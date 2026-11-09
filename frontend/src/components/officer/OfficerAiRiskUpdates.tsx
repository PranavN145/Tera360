"use client";

import React from "react";
import Link from "next/link";
import { PublicAlertItem } from "@/types/public";

export interface AiRiskUpdateItem {
  id: string;
  model: string;
  zone: string;
  corridor: string;
  state: string;
  severity: "Critical" | "Warning" | "Watch" | "Stable";
  confidence: number; // e.g. 96
  timestamp: string;
  summary: string;
  metric: string;
  targetHref: string;
}

interface OfficerAiRiskUpdatesProps {
  alerts?: PublicAlertItem[];
  isLoading?: boolean;
}

export const DEFAULT_AI_UPDATES: AiRiskUpdateItem[] = [
  {
    id: "ai-up-1",
    model: "SAR-InSAR Displacement Engine v2.4",
    zone: "Dzüdza Bridge Sector (KM 44)",
    corridor: "NH-29",
    state: "Nagaland",
    severity: "Critical",
    confidence: 96,
    timestamp: "14m ago",
    summary:
      "Sentinel-1 SAR coherence drop (0.74 → 0.19) detected along cut slope. Surface displacement exceeded 24mm/6h with saturation at 94%.",
    metric: "172 mm / 24h · 94% Saturation",
    targetHref: "/officer/alerts",
  },
  {
    id: "ai-up-2",
    model: "Hydro-Geomorphic Runoff Classifier",
    zone: "29th Mile Gorge (Coronation – Teesta)",
    corridor: "NH-10",
    state: "Sikkim",
    severity: "Critical",
    confidence: 93,
    timestamp: "42m ago",
    summary:
      "Rainfall intensity breached 90th percentile threshold. River toe erosion combined with pore-water pressure spike triggers high slide probability.",
    metric: "148 mm / 24h · Active Rockfall",
    targetHref: "/officer/roads",
  },
  {
    id: "ai-up-3",
    model: "DeepSlope Soil Saturation Model",
    zone: "Sonapur Tunnel South Embankment",
    corridor: "NH-6",
    state: "Meghalaya",
    severity: "Warning",
    confidence: 89,
    timestamp: "1h 15m ago",
    summary:
      "Continuous monsoon inflow inducing rapid sub-surface saturation (86%). Risk of slurry debris overrun across portal entrance.",
    metric: "124 mm / 24h · Silt Risk",
    targetHref: "/officer/roads",
  },
  {
    id: "ai-up-4",
    model: "Acoustic & Geotechnical Sensor Mesh",
    zone: "Jatinga – Haflong Hill Range",
    corridor: "NH-27",
    state: "Assam",
    severity: "Watch",
    confidence: 84,
    timestamp: "2h 30m ago",
    summary:
      "Minor geotechnical creep observed along KM 118 cut embankment. Surface tension cracks detected by drone aerial survey.",
    metric: "64 mm / 24h · Creep Watch",
    targetHref: "/officer/map",
  },
];

export default function OfficerAiRiskUpdates({
  alerts = [],
  isLoading = false,
}: OfficerAiRiskUpdatesProps) {
  // Dynamically augment AI feed with any live critical alerts if present
  const updates: AiRiskUpdateItem[] = React.useMemo(() => {
    if (alerts && alerts.length > 0) {
      const derivedFromAlerts: AiRiskUpdateItem[] = alerts.slice(0, 3).map((a, i) => ({
        id: `alert-ai-${a.id || i}`,
        model: "Multi-Source Geomorphic AI Pipeline",
        zone: a.location || a.corridor,
        corridor: a.corridor,
        state: a.state,
        severity: (a.severity as "Critical" | "Warning" | "Watch") || "Warning",
        confidence: a.severity === "Critical" ? 95 : 88,
        timestamp: new Date(a.publishedAt || a.createdAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        summary: a.description || a.advisory,
        metric: `${a.rainfall24h || "Rainfall Active"} · ${a.saturation || "High Saturation"}`,
        targetHref: "/officer/alerts",
      }));

      // Combine with baseline updates to ensure complete feed
      const existingIds = new Set(derivedFromAlerts.map((d) => d.corridor));
      const complement = DEFAULT_AI_UPDATES.filter((def) => !existingIds.has(def.corridor));
      return [...derivedFromAlerts, ...complement].slice(0, 4);
    }
    return DEFAULT_AI_UPDATES;
  }, [alerts]);

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case "Critical":
        return "bg-red-100 text-red-800 border-red-200";
      case "Warning":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "Watch":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
    }
  };

  return (
    <div className="bg-[#FAF8F2] border border-[#173D32]/12 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[#173D32]/10 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm">🤖</span>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#173D32]/70">
              Automated Telemetry & Inference
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-extrabold text-[#173D32] mt-0.5">
            Recent AI Risk Updates
          </h3>
        </div>

        <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#173D32]/10 text-[11px] font-bold text-[#173D32]">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
          Model Active
        </span>
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-24 rounded-2xl bg-[#173D32]/5 animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && updates.length === 0 && (
        <div className="text-center py-10 text-[#173D32]/60 text-xs">
          <span>🌱 No AI risk triggers recorded in the last 24 hours.</span>
        </div>
      )}

      {/* Content Feed */}
      {!isLoading && updates.length > 0 && (
        <div className="space-y-3">
          {updates.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-2xl bg-[#F6F4EC] border border-[#173D32]/10 hover:border-[#173D32]/25 transition-all text-[#173D32]"
            >
              {/* Top metadata strip */}
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${getSeverityStyle(
                      item.severity
                    )}`}
                  >
                    {item.severity}
                  </span>
                  <span className="text-xs font-black text-[#173D32]">
                    {item.corridor} · {item.zone}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-[#173D32]/60 font-semibold shrink-0">
                  {item.timestamp}
                </span>
              </div>

              {/* Model and State */}
              <div className="flex items-center justify-between text-[11px] text-[#173D32]/70 font-semibold mb-1">
                <span>{item.model}</span>
                <span className="text-[#173D32] font-bold">
                  {item.confidence}% Confidence
                </span>
              </div>

              {/* Risk Summary Description */}
              <p className="text-xs text-[#173D32]/85 font-medium leading-relaxed mt-1">
                {item.summary}
              </p>

              {/* Bottom Telemetry & Quick Action */}
              <div className="mt-3 pt-2 border-t border-[#173D32]/8 flex items-center justify-between text-[11px]">
                <span className="text-[10px] font-mono font-bold text-[#173D32]/70">
                  📊 {item.metric}
                </span>
                <Link
                  href={item.targetHref}
                  className="font-bold text-[#173D32] hover:underline flex items-center gap-0.5"
                >
                  <span>Review Risk</span>
                  <span>→</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
