"use client";

import React from "react";
import Link from "next/link";
import { useApp } from "@/context/AppContext";

export default function QuickActions() {
  const { openReportModal } = useApp();

  return (
    <div className="w-full bg-[#FAF8F2] border border-[#173D32]/15 rounded-2xl p-4 sm:p-6 shadow-xs">
      <h3 className="text-sm font-bold text-[#173D32] uppercase tracking-wider mb-4 flex items-center gap-2">
        <span>⚡</span> Quick Emergency Actions
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          type="button"
          onClick={openReportModal}
          className="h-12 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
        >
          <span>⚠️</span> Report Landslide Danger
        </button>

        <Link
          href="/risk-map"
          className="h-12 px-4 rounded-xl bg-[#173D32] hover:bg-[#1a4437] text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer text-center"
        >
          <span>🗺️</span> Live 3D Risk Radar
        </Link>

        <Link
          href="/alerts"
          className="h-12 px-4 rounded-xl bg-[#D6A65D] hover:bg-[#c9984e] text-[#173D32] font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer text-center"
        >
          <span>📢</span> View Highway Advisories
        </Link>
      </div>
    </div>
  );
}

