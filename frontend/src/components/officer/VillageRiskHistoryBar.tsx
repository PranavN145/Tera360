"use client";

import React from "react";
import { History, ScrollText } from "lucide-react";
import { VillageItem, VillageRiskLevel } from "@/types/village";
import VillageRiskBadge from "@/components/officer/VillageRiskBadge";

interface VillageRiskHistoryBarProps {
  village: VillageItem | null;
}

function getTimelineDotClass(level: VillageRiskLevel): string {
  switch (level) {
    case "Critical":
      return "bg-[#DC2626]";
    case "High":
      return "bg-[#D97706]";
    case "Medium":
      return "bg-[#16A34A]";
    default:
      return "bg-[#1E7A45]";
  }
}

/**
 * Full-width horizontal risk history timeline for the currently inspected settlement.
 * Placed below the split table/dossier workspace so both columns balance cleanly.
 */
export default function VillageRiskHistoryBar({
  village,
}: VillageRiskHistoryBarProps) {
  if (!village) return null;

  const events = village.riskHistory ?? [];
  const gridColsClass =
    events.length === 1
      ? "grid-cols-1"
      : events.length === 2
        ? "grid-cols-1 md:grid-cols-2"
        : "grid-cols-1 md:grid-cols-3";

  return (
    <section
      aria-label={`Recent Risk History for ${village.name}`}
      className="bg-[#FCFBF8] border border-[#173D32]/12 rounded-2xl p-4 sm:p-5 shadow-[0_2px_10px_-3px_rgba(23,61,50,0.06)]"
    >
      {/* Section Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3.5 mb-4 border-b border-[#173D32]/10">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-xl bg-[#EAF0E6] border border-[#173D32]/10 text-[#173D32] flex items-center justify-center shrink-0"
            aria-hidden="true"
          >
            <History className="w-4 h-4" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold text-[#173D32]">
                Recent Risk History
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-[#F5F2E9] border border-[#173D32]/10 text-[10.5px] font-bold text-[#173D32]/80">
                {village.name} &bull; {village.id}
              </span>
            </div>
            <p className="text-[11px] text-[#173D32]/65 mt-0.5">
              Chronological geotechnical triggers, sensor alerts, and field audit logs
            </p>
          </div>
        </div>

        <span className="px-2.5 py-1 rounded-full bg-[#FAF8F2] border border-[#173D32]/12 text-[11px] font-bold text-[#173D32]/75">
          {events.length} {events.length === 1 ? "Recorded Audit" : "Recorded Audits"}
        </span>
      </div>

      {/* Horizontal Timeline Grid */}
      {events.length === 0 ? (
        <div className="py-6 px-4 rounded-xl bg-[#FAF8F2] border border-[#173D32]/10 flex items-center justify-center gap-2.5 text-xs text-[#173D32]/65">
          <ScrollText className="w-4 h-4 text-[#173D32]/50 shrink-0" aria-hidden="true" />
          <span>No historical telemetry audits logged for {village.name}.</span>
        </div>
      ) : events.length === 1 ? (
        <div className="p-3.5 sm:p-4 rounded-xl bg-[#FAF8F2] border border-[#173D32]/10 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3 shrink-0">
            <span
              className={`w-2.5 h-2.5 rounded-full shrink-0 ${getTimelineDotClass(
                events[0].level
              )}`}
              aria-hidden="true"
            />
            <VillageRiskBadge level={events[0].level} showRiskSuffix compact />
            <span className="text-[11px] font-mono font-bold text-[#173D32]/70">
              {events[0].date}
            </span>
          </div>
          <p className="text-xs font-medium text-[#173D32]/85 leading-relaxed flex-1">
            {events[0].trigger}
          </p>
          {events[0].source && (
            <span className="text-[11px] text-[#173D32]/60 shrink-0 md:text-right">
              Source: <strong className="font-semibold text-[#173D32]/80">{events[0].source}</strong>
            </span>
          )}
        </div>
      ) : (
        <div className={`grid ${gridColsClass} gap-4`}>
          {events.map((item, idx) => (
            <div key={`${village.id}-hist-${idx}`} className="flex flex-col">
              {/* Horizontal Timeline Node & Connector Line */}
              <div className="flex items-center gap-2 mb-2.5">
                <span
                  className={`w-2.5 h-2.5 rounded-full shrink-0 ring-4 ring-[#FCFBF8] ${getTimelineDotClass(
                    item.level
                  )}`}
                  aria-hidden="true"
                />
                <span className="text-[11px] font-mono font-bold text-[#173D32]/75 whitespace-nowrap">
                  {item.date}
                </span>
                <span
                  className="flex-1 h-px bg-[#173D32]/15"
                  aria-hidden="true"
                />
              </div>

              {/* Event Card */}
              <div className="p-3.5 rounded-xl bg-[#FAF8F2] border border-[#173D32]/10 flex-1 flex flex-col justify-between gap-2.5">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <VillageRiskBadge level={item.level} showRiskSuffix compact />
                    {idx === 0 && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#173D32]/55">
                        Latest
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-medium text-[#173D32]/85 leading-relaxed">
                    {item.trigger}
                  </p>
                </div>

                {item.source && (
                  <div className="pt-2 border-t border-[#173D32]/8 text-[10.5px] text-[#173D32]/60">
                    Source: {item.source}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

