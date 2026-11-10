"use client";

import React from "react";

export interface PortalSplitLayoutProps {
  left: React.ReactNode;
  right: React.ReactNode;
  leftSpan?: 6 | 7 | 8;
  stickyRight?: boolean;
  className?: string;
  leftClassName?: string;
  rightClassName?: string;
}

export default function PortalSplitLayout({
  left,
  right,
  leftSpan = 7,
  stickyRight = true,
  className = "",
  leftClassName = "",
  rightClassName = "",
}: PortalSplitLayoutProps) {
  const leftColClass =
    leftSpan === 8
      ? "lg:col-span-8"
      : leftSpan === 6
      ? "lg:col-span-6"
      : "lg:col-span-7";

  const rightColClass =
    leftSpan === 8
      ? "lg:col-span-4"
      : leftSpan === 6
      ? "lg:col-span-6"
      : "lg:col-span-5";

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full ${className}`}>
      {/* Primary Master / List / Map / Workspace Column */}
      <div className={`${leftColClass} min-w-0 ${leftClassName}`}>{left}</div>

      {/* Secondary Detail / Inspector Column */}
      <div
        className={`${rightColClass} min-w-0 ${
          stickyRight ? "lg:sticky lg:top-6" : ""
        } ${rightClassName}`}
      >
        {right}
      </div>
    </div>
  );
}

