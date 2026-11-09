"use client";

import React from "react";
import Link from "next/link";
import StatusBadge, { BadgeVariant } from "@/components/ui/StatusBadge";

export interface PortalMetricCardProps {
  id?: string;
  title: string;
  value: number | string;
  unit?: string;
  icon?: React.ReactNode | string;
  badge?: string;
  badgeColor?: string;
  badgeVariant?: BadgeVariant;
  detail?: string;
  href?: string;
  linkText?: string;
  pulse?: boolean;
  isLoading?: boolean;
  onClick?: () => void;
  className?: string;
}

export default function PortalMetricCard({
  id,
  title,
  value,
  unit,
  icon,
  badge,
  badgeColor,
  badgeVariant,
  detail,
  href,
  linkText,
  pulse = false,
  isLoading = false,
  onClick,
  className = "",
}: PortalMetricCardProps) {
  const content = (
    <div
      id={id}
      onClick={onClick}
      className={`bg-[#FAF8F2] border border-[#173D32]/12 rounded-2xl p-4 sm:p-5 shadow-2xs hover:shadow-xs hover:border-[#173D32]/25 transition-all flex flex-col justify-between h-full ${
        onClick ? "cursor-pointer" : ""
      } ${pulse ? "ring-1 ring-red-400/40" : ""} ${className}`}
    >
      <div>
        {/* Card Header: Icon, Title & Badge/Pulse */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2 min-w-0">
            {icon && (
              <span className="text-base select-none shrink-0" aria-hidden="true">
                {icon}
              </span>
            )}
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#173D32]/65 truncate">
              {title}
            </span>
          </div>

          <div className="shrink-0 flex items-center gap-1.5">
            {pulse && !badgeVariant && !badge && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
              </span>
            )}

            {badgeVariant ? (
              <StatusBadge
                status={badgeVariant}
                label={badge}
                size="xs"
                pulse={pulse}
                showDot={pulse}
              />
            ) : badge ? (
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                  badgeColor ||
                  (pulse
                    ? "bg-red-100 text-red-800 border-red-200"
                    : "bg-[#173D32]/10 text-[#173D32] border-[#173D32]/20")
                }`}
              >
                {badge}
              </span>
            ) : null}
          </div>
        </div>

        {/* Big Metric Value Display */}
        <div className="flex items-baseline gap-2 my-1">
          {isLoading ? (
            <div className="h-8 sm:h-9 w-16 sm:w-20 bg-[#173D32]/10 rounded-lg animate-pulse" />
          ) : (
            <span className="text-2xl sm:text-3xl font-black text-[#173D32] tracking-tight">
              {typeof value === "number" ? value.toLocaleString() : value}
            </span>
          )}
          {unit && !isLoading && (
            <span className="text-xs font-bold text-[#173D32]/60">{unit}</span>
          )}
        </div>

        {/* Supporting Context / Detail */}
        {detail && (
          <p className="text-xs text-[#173D32]/70 leading-relaxed mt-1 line-clamp-2">
            {detail}
          </p>
        )}
      </div>

      {/* Optional Card Bottom Action / Direct Link */}
      {href && linkText && (
        <div className="mt-3.5 pt-2.5 border-t border-[#173D32]/8 flex items-center justify-end">
          <Link
            href={href}
            className="text-xs font-bold text-[#173D32] hover:underline inline-flex items-center gap-1 group"
          >
            <span>{linkText}</span>
            <span className="transition-transform group-hover:translate-x-0.5">→</span>
          </Link>
        </div>
      )}
    </div>
  );

  return content;
}
