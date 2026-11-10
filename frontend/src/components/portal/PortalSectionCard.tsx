"use client";

import React from "react";
import SectionHeader from "@/components/ui/SectionHeader";

export interface PortalSectionCardProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  borderBottomHeader?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
  className?: string;
  children: React.ReactNode;
  ariaLabel?: string;
}

export default function PortalSectionCard({
  title,
  subtitle,
  icon,
  badge,
  actions,
  borderBottomHeader = true,
  padding = "md",
  className = "",
  children,
  ariaLabel,
}: PortalSectionCardProps) {
  const paddingClass = {
    none: "",
    sm: "p-4",
    md: "p-5 sm:p-6",
    lg: "p-6 sm:p-8",
  }[padding];

  const hasHeader = Boolean(title || actions || icon);

  return (
    <div
      aria-label={ariaLabel || (typeof title === "string" ? title : undefined)}
      className={`bg-[#FAF8F2] border border-[#173D32]/12 rounded-2xl sm:rounded-3xl shadow-xs transition-all ${paddingClass} ${className}`}
    >
      {hasHeader && (
        <SectionHeader
          title={title}
          subtitle={subtitle}
          icon={icon}
          badge={badge}
          actions={actions}
          borderBottom={borderBottomHeader}
          compact={padding === "sm"}
        />
      )}
      {children}
    </div>
  );
}

