"use client";

import React from "react";

export interface PortalMetricGridProps {
  columns?: 4 | 5;
  className?: string;
  children: React.ReactNode;
  ariaLabel?: string;
}

export default function PortalMetricGrid({
  columns = 4,
  className = "",
  children,
  ariaLabel = "Summary Metrics",
}: PortalMetricGridProps) {
  const gridColsClass =
    columns === 5
      ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4"
      : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5";

  return (
    <section aria-label={ariaLabel} className="w-full">
      <div className={`grid ${gridColsClass} ${className}`}>{children}</div>
    </section>
  );
}
