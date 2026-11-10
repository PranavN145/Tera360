"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  ExternalLink,
  Megaphone,
  Radio,
  ShieldAlert,
  Users,
  X,
  Zap,
} from "lucide-react";
import AlertReviewModal, {
  AlertDraftData,
} from "@/components/officer/alerts/AlertReviewModal";
import StatusBadge from "@/components/ui/StatusBadge";
import { PublicAlertItem, PublicRiskMapItem } from "@/types/public";
import { formatAlertDraftFromCorridor } from "./corridorTelemetry";

interface OfficerCorridorAlertModalProps {
  isOpen: boolean;
  corridor: PublicRiskMapItem | null;
  matchedAlert: PublicAlertItem | null;
  onClose: () => void;
}

export default function OfficerCorridorAlertModal({
  isOpen,
  corridor,
  matchedAlert,
  onClose,
}: OfficerCorridorAlertModalProps) {
  const [draft, setDraft] = useState<AlertDraftData | null>(() =>
    corridor ? formatAlertDraftFromCorridor(corridor, matchedAlert) : null
  );
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isReviewOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isReviewOpen, onClose]);

  if (!isOpen || !corridor || !draft) return null;

  const toggleAudience = (aud: "Villagers" | "Drivers" | "Field Teams") => {
    setDraft((prev) => {
      if (!prev) return prev;
      const next = prev.audiences.includes(aud)
        ? prev.audiences.filter((a) => a !== aud)
        : [...prev.audiences, aud];
      return { ...prev, audiences: next };
    });
  };

  const toggleChannel = (ch: "App Notification" | "SMS" | "IVRS Voice Call") => {
    setDraft((prev) => {
      if (!prev) return prev;
      const next = prev.channels.includes(ch)
        ? prev.channels.filter((c) => c !== ch)
        : [...prev.channels, ch];
      return { ...prev, channels: next };
    });
  };

  const canProceed =
    draft.title.trim().length > 0 &&
    draft.description.trim().length > 0 &&
    draft.advisory.trim().length > 0 &&
    draft.audiences.length > 0 &&
    draft.channels.length > 0;

  return (
    <>
      {!isReviewOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/55 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="corridor-alert-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <div className="relative w-full max-w-2xl max-h-[90vh] bg-[#FAF8F2] border border-[#173D32]/15 rounded-3xl shadow-2xl flex flex-col text-[#173D32] overflow-hidden">
            {/* Header */}
            <div className="p-5 sm:p-6 pb-4 border-b border-[#173D32]/10 flex items-start justify-between gap-4 shrink-0">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <span className="px-2.5 py-0.5 rounded-full bg-[#173D32] text-[#F6F4EC] text-[11px] font-extrabold">
                    {corridor.code}
                  </span>
                  <span className="text-xs font-bold text-[#173D32]/70">
                    {corridor.state}
                  </span>
                  <StatusBadge status={draft.severity} size="xs" pulse={draft.severity === "Critical"} />
                </div>
                <h2
                  id="corridor-alert-modal-title"
                  className="text-lg sm:text-xl font-extrabold text-[#173D32] tracking-tight flex items-center gap-2"
                >
                  <Megaphone className="w-5 h-5 text-[#173D32]" strokeWidth={2.2} aria-hidden="true" />
                  <span>Issue Alert for Corridor</span>
                </h2>
                <p className="text-xs text-[#173D32]/70 mt-0.5">
                  Pre-populated from live telemetry for {corridor.name} ({corridor.stretch}).
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close alert composer"
                className="p-2 rounded-full text-[#173D32]/65 hover:text-[#173D32] hover:bg-[#173D32]/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4 text-xs">
              {/* Severity */}
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#173D32]/70 block mb-2">
                  Alert Severity
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {(
                    [
                      {
                        value: "Watch",
                        icon: <Zap className="w-4 h-4 text-amber-600" />,
                        hint: "Precautionary watch",
                        activeClass: "bg-yellow-500/10 border-yellow-500 ring-2 ring-yellow-500/20",
                      },
                      {
                        value: "Warning",
                        icon: <AlertTriangle className="w-4 h-4 text-amber-600" />,
                        hint: "Restricted transit",
                        activeClass: "bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/20",
                      },
                      {
                        value: "Critical",
                        icon: <ShieldAlert className="w-4 h-4 text-red-600" />,
                        hint: "Immediate hazard / closure",
                        activeClass: "bg-red-500/10 border-red-500 ring-2 ring-red-500/20",
                      },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setDraft({ ...draft, severity: opt.value })}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        draft.severity === opt.value
                          ? opt.activeClass
                          : "bg-[#F6F4EC] border-[#173D32]/12 hover:border-[#173D32]/25"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        {opt.icon}
                        {draft.severity === opt.value && (
                          <span className="text-[9px] font-black uppercase text-[#173D32]">
                            Selected
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-extrabold text-[#173D32] block">
                        {opt.value}
                      </span>
                      <span className="text-[10px] text-[#173D32]/65 block mt-0.5">
                        {opt.hint}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Audience & Channels */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-[#F6F4EC] border border-[#173D32]/10">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#173D32]/75 mb-2">
                    <Users className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Target Audience</span>
                  </span>
                  <div className="space-y-1.5">
                    {(["Villagers", "Drivers", "Field Teams"] as const).map((aud) => (
                      <label
                        key={aud}
                        className="flex items-center gap-2 font-semibold text-[#173D32] cursor-pointer select-none"
                      >
                        <input
                          type="checkbox"
                          checked={draft.audiences.includes(aud)}
                          onChange={() => toggleAudience(aud)}
                          className="w-4 h-4 rounded border-[#173D32]/30 text-[#173D32] focus:ring-[#173D32] cursor-pointer"
                        />
                        <span>{aud}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#F6F4EC] border border-[#173D32]/10">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#173D32]/75 mb-2">
                    <Radio className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Delivery Channels</span>
                  </span>
                  <div className="space-y-1.5">
                    {(["App Notification", "SMS", "IVRS Voice Call"] as const).map((ch) => (
                      <label
                        key={ch}
                        className="flex items-center gap-2 font-semibold text-[#173D32] cursor-pointer select-none"
                      >
                        <input
                          type="checkbox"
                          checked={draft.channels.includes(ch)}
                          onChange={() => toggleChannel(ch)}
                          className="w-4 h-4 rounded border-[#173D32]/30 text-[#173D32] focus:ring-[#173D32] cursor-pointer"
                        />
                        <span>{ch}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Headline */}
              <div>
                <label
                  htmlFor="corridor-alert-headline"
                  className="text-[11px] font-bold uppercase tracking-wider text-[#173D32]/70 block mb-1"
                >
                  Advisory Headline
                </label>
                <input
                  id="corridor-alert-headline"
                  type="text"
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  className="w-full h-10 px-3.5 rounded-xl bg-white border border-[#173D32]/20 text-xs font-bold text-[#173D32] focus:outline-none focus:ring-1 focus:ring-[#173D32]"
                />
              </div>

              {/* Description */}
              <div>
                <label
                  htmlFor="corridor-alert-desc"
                  className="text-[11px] font-bold uppercase tracking-wider text-[#173D32]/70 block mb-1"
                >
                  Hazard Observation &amp; Telemetry Summary
                </label>
                <textarea
                  id="corridor-alert-desc"
                  rows={3}
                  value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                  className="w-full p-3 rounded-xl bg-white border border-[#173D32]/20 text-xs text-[#173D32] focus:outline-none focus:ring-1 focus:ring-[#173D32] resize-none"
                />
              </div>

              {/* Advisory */}
              <div>
                <label
                  htmlFor="corridor-alert-advisory"
                  className="text-[11px] font-bold uppercase tracking-wider text-[#173D32]/70 block mb-1"
                >
                  Routing &amp; Public Safety Directive
                </label>
                <textarea
                  id="corridor-alert-advisory"
                  rows={2}
                  value={draft.advisory}
                  onChange={(e) => setDraft({ ...draft, advisory: e.target.value })}
                  className="w-full p-3 rounded-xl bg-white border border-[#173D32]/20 text-xs text-[#173D32] focus:outline-none focus:ring-1 focus:ring-[#173D32] resize-none"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 sm:p-5 border-t border-[#173D32]/10 bg-[#FAF8F2] shrink-0 flex flex-wrap items-center justify-between gap-3">
              <Link
                href="/officer/alerts"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#173D32]/75 hover:text-[#173D32] hover:underline"
              >
                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Open Full Alert Center</span>
              </Link>

              <div className="flex items-center gap-2.5 ml-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-full text-xs font-bold text-[#173D32] border border-[#173D32]/20 hover:bg-[#173D32]/5 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!canProceed}
                  onClick={() => {
                    setDraft({
                      ...draft,
                      localizedText: `Official Landslide Alert [${draft.severity}]: ${draft.title} - Target: ${draft.targetLocation} (${draft.state}). ${draft.description} Mandatory Advisory: ${draft.advisory}`,
                    });
                    setIsReviewOpen(true);
                  }}
                  className="px-5 py-2 rounded-full bg-[#173D32] hover:bg-[#1a4437] text-[#F6F4EC] text-xs font-bold shadow-xs transition-all inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Bell className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Review &amp; Authorize</span>
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <AlertReviewModal
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        draft={draft}
      />
    </>
  );
}
