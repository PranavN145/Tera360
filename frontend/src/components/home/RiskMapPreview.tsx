"use client";

import React from "react";
import RiskMap from "@/components/RiskMap";

export interface RiskMapPreviewProps {
  className?: string;
  height?: string;
}

export default function RiskMapPreview({
  className = "",
  height = "h-[360px]",
}: RiskMapPreviewProps) {
  return (
    <div
      className={`relative w-full ${height} rounded-2xl overflow-hidden border border-[#173D32]/15 shadow-sm bg-[#FAF8F2] ${className}`}
    >
      <RiskMap className="w-full h-full" />
    </div>
  );
}

