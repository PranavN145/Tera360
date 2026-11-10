"use client";

import React from "react";

export interface PortalFilterBarProps {
  left?: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

export default function PortalFilterBar({
  left,
  right,
  className = "",
  children,
}: PortalFilterBarProps) {
  return (
    <div
      className={`bg-[#FAF8F2] border border-[#173D32]/12 rounded-2xl p-3 sm:p-4 shadow-2xs ${className}`}
    >
      {children ? (
        children
      ) : (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
          {left && <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">{left}</div>}
          {right && (
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full md:w-auto justify-start md:justify-end">
              {right}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

