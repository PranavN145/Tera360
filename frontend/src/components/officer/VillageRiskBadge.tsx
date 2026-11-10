"use client";

import React from "react";
import { VillageRiskLevel } from "@/types/village";

/**
 * Maps internal VillageRiskLevel values to clean UI display labels.
 */
export function getVillageRiskDisplayLabel(level: VillageRiskLevel): string {
  return level === "Medium" ? "Moderate" : level;
}

/**
 * Returns row background tint and left accent bar classes for a selected village row.
 */
export function getSelectedRowTheme(level: VillageRiskLevel): {
  rowBg: string;
  barBg: string;
  iconBoxBg: string;
} {
  switch (level) {
    case "Critical":
      return {
        rowBg: "bg-[#FDF0F0]",
        barBg: "bg-[#D92D20]",
        iconBoxBg: "bg-[#F6DCDA]",
      };
    case "High":
      return {
        rowBg: "bg-[#FEF6E8]",
        barBg: "bg-[#D97706]",
        iconBoxBg: "bg-[#FAE7C7]",
      };
    case "Medium":
      return {
        rowBg: "bg-[#EEF7F0]",
        barBg: "bg-[#16A34A]",
        iconBoxBg: "bg-[#DCEEE0]",
      };
    default:
      return {
        rowBg: "bg-[#EEF6F0]",
        barBg: "bg-[#1E7A45]",
        iconBoxBg: "bg-[#DCEEE2]",
      };
  }
}

interface VillageRiskBadgeProps {
  level: VillageRiskLevel;
  showRiskSuffix?: boolean;
  compact?: boolean;
  className?: string;
}

const BADGE_STYLE: Record<
  VillageRiskLevel,
  {
    pill: string;
    iconFill: string;
  }
> = {
  Critical: {
    pill: "bg-[#FDE2E1] text-[#B91C1C] border-[#F6B8B6]",
    iconFill: "#DC2626",
  },
  High: {
    pill: "bg-[#FEF0C7] text-[#B54708] border-[#F8D688]",
    iconFill: "#D97706",
  },
  Medium: {
    pill: "bg-[#DCFCE7] text-[#15803D] border-[#9BE6B4]",
    iconFill: "#16A34A",
  },
  Low: {
    pill: "bg-[#E6F4EA] text-[#166534] border-[#A7E0BA]",
    iconFill: "#1E7A45",
  },
};

/**
 * Consistent risk status pill with custom filled semantic icon
 * matching the Terra360 Settlement Directory & Dossier specification.
 */
export default function VillageRiskBadge({
  level,
  showRiskSuffix = false,
  compact = false,
  className = "",
}: VillageRiskBadgeProps) {
  const style = BADGE_STYLE[level] ?? BADGE_STYLE.Low;
  const label = getVillageRiskDisplayLabel(level);

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-bold leading-none border whitespace-nowrap ${
        compact ? "px-2 py-0.5 text-[10.5px]" : "px-2.5 py-1 text-[11px]"
      } ${style.pill} ${className}`}
    >
      {level === "Critical" && (
        <svg
          viewBox="0 0 16 16"
          className="w-3.5 h-3.5 shrink-0"
          aria-hidden="true"
        >
          <circle cx="8" cy="8" r="7.5" fill={style.iconFill} />
          <rect x="7.25" y="3.8" width="1.5" height="5.2" rx="0.75" fill="#FFFFFF" />
          <circle cx="8" cy="11.4" r="0.95" fill="#FFFFFF" />
        </svg>
      )}
      {level === "High" && (
        <svg
          viewBox="0 0 16 16"
          className="w-3.5 h-3.5 shrink-0"
          aria-hidden="true"
        >
          <path
            d="M7.15 2.1a1 1 0 0 1 1.7 0l5.7 9.8A1 1 0 0 1 13.7 13.4H2.3a1 1 0 0 1-.85-1.5l5.7-9.8Z"
            fill={style.iconFill}
          />
          <rect x="7.3" y="5.3" width="1.4" height="4.1" rx="0.7" fill="#FFFFFF" />
          <circle cx="8" cy="11.2" r="0.85" fill="#FFFFFF" />
        </svg>
      )}
      {(level === "Medium" || level === "Low") && (
        <svg
          viewBox="0 0 16 16"
          className="w-3.5 h-3.5 shrink-0"
          aria-hidden="true"
        >
          <circle cx="8" cy="8" r="7.5" fill={style.iconFill} />
          <path
            d="M4.8 8.2 7 10.4 11.4 5.8"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
      <span>{showRiskSuffix ? `${label} Risk` : label}</span>
    </span>
  );
}
