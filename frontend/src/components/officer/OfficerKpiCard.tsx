"use client";

import React, { useId } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export type KpiCardAccent = "red" | "amber" | "green" | "blue";
export type KpiBadgeTone = "red" | "amber" | "green" | "blue" | "neutral";

export interface OfficerKpiCardProps {
  id?: string;
  title: string;
  value: number | string;
  unit?: string;
  icon: LucideIcon;
  accent?: KpiCardAccent;
  badge?: string;
  badgeTone?: KpiBadgeTone;
  detail?: string;
  href?: string;
  variant?: "kpi" | "summary";
  isLoading?: boolean;
  className?: string;
}

const ACCENT_STYLES: Record<
  KpiCardAccent,
  {
    iconBox: string;
    iconColor: string;
    summaryBorder: string;
    waveStart: string;
    waveEnd: string;
  }
> = {
  red: {
    iconBox: "bg-[#FDECEC]",
    iconColor: "text-[#C52936]",
    summaryBorder: "border-[#DC2626]/22",
    waveStart: "#FCA5A5",
    waveEnd: "#F87171",
  },
  amber: {
    iconBox: "bg-[#FEF1DC]",
    iconColor: "text-[#B45E09]",
    summaryBorder: "border-[#D97706]/26",
    waveStart: "#FDE68A",
    waveEnd: "#F59E0B",
  },
  green: {
    iconBox: "bg-[#E2F4E8]",
    iconColor: "text-[#1E7A45]",
    summaryBorder: "border-[#173D32]/14",
    waveStart: "#A7F3D0",
    waveEnd: "#4ADE80",
  },
  blue: {
    iconBox: "bg-[#E2F1F8]",
    iconColor: "text-[#17688A]",
    summaryBorder: "border-[#2563EB]/20",
    waveStart: "#BAE6FD",
    waveEnd: "#60A5FA",
  },
};

const BADGE_STYLES: Record<
  KpiBadgeTone,
  {
    pill: string;
    dot: string;
  }
> = {
  red: {
    pill: "bg-[#FDE8E8] text-[#B91C1C]",
    dot: "bg-[#DC2626]",
  },
  amber: {
    pill: "bg-[#FEEFD6] text-[#9A5B06]",
    dot: "bg-[#D97706]",
  },
  green: {
    pill: "bg-[#DCFCE7] text-[#166534]",
    dot: "bg-[#16A34A]",
  },
  blue: {
    pill: "bg-[#E1ECFF] text-[#1D4ED8]",
    dot: "bg-[#2563EB]",
  },
  neutral: {
    pill: "bg-[#EEF2EF] text-[#3E554B]",
    dot: "bg-[#64756C]",
  },
};

/**
 * Reusable Officer Portal metric card supporting:
 * - "kpi" (default): Dashboard KPI card with top label, count + inline status pill, and bottom-right wave
 * - "summary": Summary card with top-left icon/title, top-right status pill, count + unit, and full-width bottom wave
 */
export default function OfficerKpiCard({
  id,
  title,
  value,
  unit,
  icon: Icon,
  accent = "green",
  badge,
  badgeTone = "neutral",
  detail,
  href,
  variant = "kpi",
  isLoading = false,
  className = "",
}: OfficerKpiCardProps) {
  const rawId = useId().replace(/:/g, "");
  const backWaveGradId = `kpi-wave-back-${rawId}`;
  const frontWaveGradId = `kpi-wave-front-${rawId}`;

  const accentStyle = ACCENT_STYLES[accent];
  const badgeStyle = BADGE_STYLES[badgeTone];

  if (variant === "summary") {
    const summaryCard = (
      <div
        id={id}
        className={`relative overflow-hidden h-full rounded-2xl bg-[#FAF8F2] border ${accentStyle.summaryBorder} p-4 sm:p-5 pb-8 shadow-[0_2px_10px_-3px_rgba(23,61,50,0.06),0_1px_2px_rgba(23,61,50,0.03)] flex flex-col justify-between ${className}`}
      >
        {/* Full-width soft translucent wave accent along bottom edge */}
        <svg
          viewBox="0 0 360 36"
          preserveAspectRatio="none"
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-7 w-full select-none"
        >
          <defs>
            <linearGradient id={backWaveGradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={accentStyle.waveStart} stopOpacity="0.18" />
              <stop offset="55%" stopColor={accentStyle.waveEnd} stopOpacity="0.24" />
              <stop offset="100%" stopColor={accentStyle.waveStart} stopOpacity="0.16" />
            </linearGradient>
            <linearGradient id={frontWaveGradId} x1="0%" y1="20%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={accentStyle.waveEnd} stopOpacity="0.14" />
              <stop offset="50%" stopColor={accentStyle.waveStart} stopOpacity="0.22" />
              <stop offset="100%" stopColor={accentStyle.waveEnd} stopOpacity="0.28" />
            </linearGradient>
          </defs>
          <path
            d="M 0 36 L 0 22 C 48 12, 92 26, 148 18 C 204 10, 244 25, 300 15 C 328 10, 346 15, 360 19 L 360 36 Z"
            fill={`url(#${backWaveGradId})`}
          />
          <path
            d="M 0 36 L 0 27 C 54 31, 98 16, 158 24 C 216 32, 262 14, 316 22 C 336 25, 350 22, 360 20 L 360 36 Z"
            fill={`url(#${frontWaveGradId})`}
          />
        </svg>

        <div className="relative z-10 flex flex-col flex-1">
          {/* Header Row: Tinted Lucide Icon + Title on left, Status Pill on right */}
          <div className="flex flex-wrap items-start justify-between gap-2 min-h-9">
            <div className="flex items-center gap-2.5 min-w-[120px] flex-1">
              <span
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${accentStyle.iconBox} ${accentStyle.iconColor}`}
                aria-hidden="true"
              >
                <Icon className="w-[18px] h-[18px]" strokeWidth={2} />
              </span>
              <span className="text-[13px] font-bold text-[#173D32] leading-tight">
                {title}
              </span>
            </div>

            {badge && (
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold leading-none whitespace-nowrap shrink-0 mt-0.5 ${badgeStyle.pill}`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${badgeStyle.dot}`}
                  aria-hidden="true"
                />
                <span>{badge}</span>
              </span>
            )}
          </div>

          {/* Metric Row: Large Number + Unit */}
          <div className="flex items-baseline gap-2.5 mt-3.5 mb-2">
            {isLoading ? (
              <>
                <div className="h-9 w-11 rounded-lg bg-[#173D32]/10 animate-pulse" />
                <div className="h-4 w-20 rounded bg-[#173D32]/8 animate-pulse" />
              </>
            ) : (
              <>
                <span className="text-3xl sm:text-[34px] font-extrabold text-[#173D32] leading-none tracking-tight tabular-nums">
                  {typeof value === "number" ? value.toLocaleString() : value}
                </span>
                {unit && (
                  <span className="text-xs sm:text-[13px] font-semibold text-[#173D32]/75 leading-none">
                    {unit}
                  </span>
                )}
              </>
            )}
          </div>

          {/* Supporting Context Description */}
          {isLoading ? (
            <div className="space-y-1.5 mt-0.5">
              <div className="h-3.5 w-full rounded bg-[#173D32]/8 animate-pulse" />
              <div className="h-3.5 w-3/4 rounded bg-[#173D32]/8 animate-pulse" />
            </div>
          ) : (
            detail && (
              <p className="text-xs sm:text-[12.5px] font-medium text-[#173D32]/75 leading-snug">
                {detail}
              </p>
            )
          )}
        </div>
      </div>
    );

    return summaryCard;
  }

  const cardBody = (
    <div
      id={id}
      className={`relative overflow-hidden h-full rounded-2xl bg-white border border-[#173D32]/10 px-4 pt-4 pb-6 xl:px-3.5 xl:pt-4 xl:pb-6 2xl:px-5 2xl:pt-5 2xl:pb-7 shadow-[0_2px_12px_-3px_rgba(23,61,50,0.07),0_1px_3px_-1px_rgba(23,61,50,0.04)] flex flex-col justify-start transition-all duration-200 ${
        href
          ? "hover:border-[#173D32]/22 hover:shadow-[0_10px_24px_-6px_rgba(23,61,50,0.12),0_2px_6px_-1px_rgba(23,61,50,0.05)] hover:-translate-y-0.5"
          : ""
      } ${className}`}
    >
      {/* Bottom-right translucent wave accent */}
      <svg
        viewBox="0 0 240 56"
        preserveAspectRatio="none"
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 right-0 h-11 w-[76%] select-none"
      >
        <defs>
          <linearGradient id={backWaveGradId} x1="0%" y1="50%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={accentStyle.waveStart} stopOpacity="0" />
            <stop offset="55%" stopColor={accentStyle.waveStart} stopOpacity="0.2" />
            <stop offset="100%" stopColor={accentStyle.waveEnd} stopOpacity="0.32" />
          </linearGradient>
          <linearGradient id={frontWaveGradId} x1="15%" y1="60%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={accentStyle.waveStart} stopOpacity="0" />
            <stop offset="50%" stopColor={accentStyle.waveEnd} stopOpacity="0.2" />
            <stop offset="100%" stopColor={accentStyle.waveEnd} stopOpacity="0.38" />
          </linearGradient>
        </defs>
        <path
          d="M 16 56 C 58 55, 90 36, 128 39 C 158 41, 182 18, 214 14 C 227 12, 235 13, 240 15 L 240 56 Z"
          fill={`url(#${backWaveGradId})`}
        />
        <path
          d="M 56 56 C 98 55, 122 42, 152 44 C 182 46, 204 26, 228 24 C 234 23, 238 24, 240 25 L 240 56 Z"
          fill={`url(#${frontWaveGradId})`}
        />
      </svg>

      {/* Card Header: Lucide Icon + Uppercase Forest-Green Label */}
      <div className="relative z-10 flex items-center gap-2 2xl:gap-2.5 min-h-8 mb-3.5">
        <span
          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${accentStyle.iconBox} ${accentStyle.iconColor}`}
          aria-hidden="true"
        >
          <Icon className="w-[18px] h-[18px]" strokeWidth={2} />
        </span>
        <span className="text-xs xl:text-[10.5px] 2xl:text-xs font-bold uppercase tracking-[0.03em] xl:tracking-[0.015em] 2xl:tracking-[0.03em] text-[#173D32] leading-tight">
          {title}
        </span>
      </div>

      {/* Prominent Count + Soft Colored Status Badge */}
      <div className="relative z-10 flex flex-wrap items-center gap-2.5 sm:gap-3 mb-2.5">
        {isLoading ? (
          <>
            <div className="h-9 w-11 rounded-lg bg-[#173D32]/10 animate-pulse" />
            <div className="h-6 w-20 rounded-full bg-[#173D32]/8 animate-pulse" />
          </>
        ) : (
          <>
            <span className="text-3xl sm:text-[34px] font-extrabold text-[#173D32] leading-none tracking-tight tabular-nums">
              {typeof value === "number" ? value.toLocaleString() : value}
            </span>
            {badge && (
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-semibold leading-none whitespace-nowrap ${badgeStyle.pill}`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${badgeStyle.dot}`}
                  aria-hidden="true"
                />
                <span>{badge}</span>
              </span>
            )}
          </>
        )}
      </div>

      {/* Supporting Context Description */}
      {isLoading ? (
        <div className="relative z-10 space-y-1.5 mt-0.5">
          <div className="h-3.5 w-full rounded bg-[#173D32]/8 animate-pulse" />
          <div className="h-3.5 w-3/4 rounded bg-[#173D32]/8 animate-pulse" />
        </div>
      ) : (
        detail && (
          <p className="relative z-10 text-[12.5px] sm:text-[13px] font-medium text-[#173D32]/80 leading-[1.45]">
            {detail}
          </p>
        )
      )}
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        aria-label={`${title}: ${typeof value === "number" ? value.toLocaleString() : value}${badge ? `, ${badge}` : ""}`}
        className="block h-full rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173D32]/40"
      >
        {cardBody}
      </Link>
    );
  }

  return cardBody;
}

