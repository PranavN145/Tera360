"use client";

import React, { useEffect } from "react";
import { Clock, MapPin, Route, Share2, X } from "lucide-react";
import { useApp } from "@/context/AppContext";
import RelativeTime from "@/components/common/RelativeTime";
import StatusBadge from "@/components/ui/StatusBadge";

export default function AlertDetailsModal() {
  const { selectedAlert, closeAlertModal, addToast } = useApp();

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedAlert) {
        closeAlertModal();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedAlert, closeAlertModal]);

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (selectedAlert) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [selectedAlert]);

  if (!selectedAlert) return null;

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard?.writeText(window.location.href);
      addToast({
        title: "Link Copied",
        description: `Alert details for ${selectedAlert.location} copied to clipboard.`,
        type: "success",
      });
    }
  };

  const getSeverityBadge = (level: string) => {
    switch (level) {
      case "Critical":
        return "bg-red-50 text-red-700 border-red-300";
      case "Warning":
        return "bg-amber-50 text-amber-700 border-amber-300";
      default:
        return "bg-yellow-50 text-yellow-800 border-yellow-300";
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-sm overflow-hidden animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="alert-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeAlertModal();
      }}
    >
      <div className="relative w-full max-w-xl max-h-[min(90vh,760px)] bg-[#FAF8F2] border border-[#173D32]/15 rounded-[24px] sm:rounded-[28px] shadow-2xl flex flex-col text-[#173D32] overflow-hidden my-auto transition-all">
        {/* Sticky Header */}
        <div className="p-5 sm:p-6 pb-3 sm:pb-4 border-b border-[#173D32]/10 shrink-0 relative bg-[#FAF8F2]">
          {/* Close Button */}
          <button
            type="button"
            onClick={closeAlertModal}
            className="absolute top-4 right-4 p-2 rounded-full text-[#173D32]/60 hover:text-[#173D32] hover:bg-[#173D32]/10 transition-colors focus-visible:outline-2 focus-visible:outline-[#173D32] cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>

          {/* Top Badges */}
          <div className="flex items-center gap-2 mb-2 pr-6">
            <StatusBadge status={selectedAlert.severity} size="sm" pulse />
            <span className="text-xs font-semibold text-[#173D32]/70 bg-[#173D32]/5 px-2.5 py-0.5 rounded-md">
              {selectedAlert.state}
            </span>
          </div>

          {/* Heading */}
          <h2 id="alert-modal-title" className="text-xl sm:text-2xl font-bold tracking-tight text-[#173D32] leading-snug">
            {selectedAlert.location}
          </h2>

          {/* Timestamp & Coordinates */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-[#173D32]/75 mt-1.5">
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 opacity-70" aria-hidden="true" />
              <RelativeTime date={selectedAlert.timestamp} fallback="Recently" />
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 opacity-70" aria-hidden="true" />
              {selectedAlert.coordinates}
            </span>
            <span className="inline-flex items-center gap-1">
              <Route className="w-3.5 h-3.5 opacity-70" aria-hidden="true" />
              Corridor: {selectedAlert.corridor}
            </span>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto overscroll-contain flex-1 flex flex-col gap-4">
          {/* Incident Summary */}
          <div className="p-4 rounded-2xl bg-[#F6F4EC] border border-[#173D32]/10">
            <span className="text-xs font-bold uppercase tracking-wider text-[#173D32]/70 block mb-1">
              Hazard Description
            </span>
            <p className="text-xs sm:text-sm text-[#173D32]/90 leading-relaxed font-normal">
              {selectedAlert.description}
            </p>
          </div>

          {/* Telemetry Metrics */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 rounded-xl bg-[#F6F4EC] border border-[#173D32]/10">
              <span className="text-[10px] uppercase font-bold text-[#173D32]/60 block mb-0.5">24h Rainfall</span>
              <span className="text-sm sm:text-base font-bold text-[#173D32]">{selectedAlert.rainfall24h}</span>
            </div>

            <div className="p-3 rounded-xl bg-[#F6F4EC] border border-[#173D32]/10">
              <span className="text-[10px] uppercase font-bold text-[#173D32]/60 block mb-0.5">Soil Saturation</span>
              <span className="text-sm sm:text-base font-bold text-[#173D32]">{selectedAlert.saturation}</span>
            </div>
          </div>

          {/* Traffic Status & Clearance Info */}
          <div className="p-3.5 rounded-xl bg-[#F6F4EC] border border-[#173D32]/10">
            <span className="text-[10px] uppercase font-bold text-[#173D32]/60 block mb-1">
              Traffic Status
            </span>
            <p className="text-xs sm:text-sm font-semibold text-amber-800 leading-relaxed break-words whitespace-normal">
              {selectedAlert.trafficStatus || "Active Monitoring"}
            </p>
          </div>

          {/* Action Advisory */}
          <div className="p-4 rounded-2xl bg-[#DCE8D4]/40 border border-[#173D32]/15">
            <span className="text-xs font-bold uppercase tracking-wider text-[#173D32] block mb-1">
              Recommended Advisory
            </span>
            <p className="text-xs sm:text-sm text-[#173D32]/85 leading-relaxed font-normal">
              {selectedAlert.advisory}
            </p>
          </div>
        </div>

        {/* Sticky Action Buttons */}
        <div className="p-4 sm:p-5 border-t border-[#173D32]/10 bg-[#FAF8F2] shrink-0 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleShare}
            className="h-10 px-4 rounded-full text-xs sm:text-sm font-semibold text-[#173D32] border border-[#173D32]/20 hover:bg-[#173D32]/5 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Share2 className="w-4 h-4" aria-hidden="true" />
            <span>Share Alert</span>
          </button>
          <button
            type="button"
            onClick={closeAlertModal}
            className="h-10 px-6 rounded-full bg-[#173D32] hover:bg-[#1f4e40] text-[#F6F4EC] text-xs sm:text-sm font-bold shadow-sm transition-all cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
