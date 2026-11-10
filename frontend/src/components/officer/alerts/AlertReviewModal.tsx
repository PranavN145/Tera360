import React, { useState } from 'react';
import {
  AlertTriangle,
  Ban,
  Lock,
  Radio,
  Shield,
  ShieldAlert,
  Users,
  X,
} from 'lucide-react';
import StatusBadge from '@/components/ui/StatusBadge';

export interface AlertDraftData {
  severity: 'Critical' | 'Warning' | 'Watch';
  targetType: 'corridor' | 'village' | 'state';
  state: string;
  targetLocation: string;
  audiences: ('Villagers' | 'Drivers' | 'Field Teams')[];
  channels: ('App Notification' | 'SMS' | 'IVRS Voice Call')[];
  title: string;
  locationDetails: string;
  description: string;
  advisory: string;
  localLanguage: string;
  localizedText: string;
}

interface AlertReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  draft: AlertDraftData;
  onConfirmSuccess?: () => void;
}

export default function AlertReviewModal({
  isOpen,
  onClose,
  draft,
}: AlertReviewModalProps) {
  const [criticalConfirmed, setCriticalConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionNotice, setSubmissionNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const isCritical = draft.severity === 'Critical';
  const canSubmit = !isCritical || criticalConfirmed;

  const handleAttemptSend = () => {
    if (!canSubmit || isSubmitting) return;

    setIsSubmitting(true);
    setSubmissionNotice(null);

    // In accordance with PRD constraints: Backend does NOT have POST /api/v1/alerts or SMS/IVRS gateways.
    // We clearly state this as unavailable rather than simulating success or making up fake endpoints.
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmissionNotice(
        'Action Blocked: External SMS Gateway, IVRS Telephony, and alert broadcast endpoints are not deployed on this server. This alert cannot be broadcast.'
      );
    }, 600);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-xs overflow-hidden animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div className="relative w-full max-w-2xl max-h-[min(92vh,820px)] bg-[#FAF8F2] border border-[#173D32]/15 rounded-[24px] sm:rounded-[28px] shadow-2xl flex flex-col text-[#173D32] overflow-hidden my-auto transition-all">
        {/* Header */}
        <div className="p-5 sm:p-6 pb-4 border-b border-[#173D32]/10 shrink-0 relative bg-[#FAF8F2]">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="absolute top-4 right-4 p-2 rounded-full text-[#173D32]/60 hover:text-[#173D32] hover:bg-[#173D32]/10 transition-colors disabled:opacity-40 cursor-pointer"
            aria-label="Close review dialog"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 mb-2 flex-wrap pr-8">
            <StatusBadge status={draft.severity} size="md" pulse={isCritical} />
            <span className="text-xs font-semibold text-[#173D32]/75 bg-white border border-[#173D32]/12 px-2.5 py-0.5 rounded-full">
              {draft.state}
            </span>
            <span className="text-xs font-semibold text-[#173D32]/60">
              Protocol: Officer Authorization
            </span>
          </div>

          <h2 id="review-modal-title" className="text-xl sm:text-2xl font-extrabold text-[#173D32] tracking-tight">
            Review Alert Before Approval
          </h2>
          <p className="text-xs text-[#173D32]/70 mt-1">
            Examine targeting, distribution channels, and advisory content prior to final broadcast commitment.
          </p>
        </div>

        {/* Scrollable Summary Body */}
        <div className="p-5 sm:p-6 overflow-y-auto overscroll-contain flex-1 flex flex-col gap-4 text-xs">
          {/* Critical Warning Callout if Critical */}
          {isCritical && (
            <div className="p-4 rounded-2xl bg-[#FDECEC] border border-red-300/80 text-red-900 flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-white/80 border border-red-200 flex items-center justify-center text-[#C52936] shrink-0">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <span className="font-extrabold text-sm block text-red-900">
                  Critical Level Evacuation Advisory Warning
                </span>
                <p className="text-xs text-red-900/85 mt-0.5 leading-relaxed">
                  Critical alerts trigger emergency sirens, override quiet hours, and instruct immediate evacuation or road closure. Verify all geo-coordinates and incident facts carefully.
                </p>
              </div>
            </div>
          )}

          {/* Backend Gateway Availability Banner (PRD Constraint §5) */}
          <div className="p-3.5 rounded-2xl bg-amber-50/90 border border-amber-300/80 text-amber-950 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="flex-1 text-[11px] leading-relaxed">
              <span className="font-bold text-amber-900 block">
                Backend Broadcast Telecommunications Status:
              </span>
              The Terra360 backend is currently operating in Public Monitoring Mode (PRD Milestone M3). External telecom adapters (SMS SMPP / DLT Gateway, IVRS SIP telephony, and alert broadcast write endpoints) are not configured on this server. Broadcast dispatch is locked to prevent unverified transmissions.
            </div>
          </div>

          {/* Alert Title & Location Grid */}
          <div className="p-4 rounded-2xl bg-white border border-[#173D32]/10 shadow-[0_2px_8px_-2px_rgba(23,61,50,0.04)] space-y-3">
            <div>
              <span className="text-[10px] uppercase font-bold text-[#173D32]/55 block tracking-[0.1em]">
                Alert Title & Corridor
              </span>
              <h3 className="text-base font-extrabold text-[#173D32] mt-0.5">{draft.title}</h3>
              <p className="text-xs text-[#173D32]/75 font-medium mt-0.5">
                Target: {draft.targetLocation} {draft.locationDetails ? `(${draft.locationDetails})` : ''} · {draft.state}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-[#173D32]/10">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#173D32]/55 block tracking-[0.1em]">
                  Target Audiences
                </span>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {draft.audiences.length > 0 ? (
                    draft.audiences.map((aud) => (
                      <span
                        key={aud}
                        className="px-2.5 py-1 rounded-full bg-[#FAF8F2] border border-[#173D32]/12 text-[#173D32] font-bold text-xs inline-flex items-center gap-1.5"
                      >
                        <Users className="w-3.5 h-3.5 text-[#173D32]/70" />
                        <span>{aud}</span>
                      </span>
                    ))
                  ) : (
                    <span className="text-red-700 font-semibold">No audience selected</span>
                  )}
                </div>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-[#173D32]/55 block tracking-[0.1em]">
                  Delivery Channels
                </span>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {draft.channels.length > 0 ? (
                    draft.channels.map((ch) => (
                      <span
                        key={ch}
                        className="px-2.5 py-1 rounded-full bg-[#FAF8F2] border border-[#173D32]/12 text-[#173D32] font-bold text-xs inline-flex items-center gap-1.5"
                      >
                        <Radio className="w-3.5 h-3.5 text-[#173D32]/70" />
                        <span>{ch}</span>
                      </span>
                    ))
                  ) : (
                    <span className="text-red-700 font-semibold">No channel selected</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Hazard Description & Advisory */}
          <div className="space-y-3">
            <div className="p-3.5 rounded-2xl bg-white border border-[#173D32]/10 shadow-[0_2px_8px_-2px_rgba(23,61,50,0.04)]">
              <span className="text-[10px] uppercase font-bold text-[#173D32]/55 block tracking-[0.1em] mb-1">
                Hazard Description
              </span>
              <p className="text-xs text-[#173D32]/85 leading-relaxed">{draft.description}</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#EAF0E6]/65 border border-[#173D32]/15">
              <span className="text-[10px] uppercase font-bold text-[#173D32] inline-flex items-center gap-1.5 tracking-[0.1em] mb-1">
                <Shield className="w-3.5 h-3.5 text-[#173D32]" />
                <span>Recommended Public Advisory</span>
              </span>
              <p className="text-xs text-[#173D32]/90 leading-relaxed font-medium">{draft.advisory}</p>
            </div>

            {/* Local Language Preview */}
            <div className="p-3.5 rounded-2xl bg-white border border-[#173D32]/10">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] uppercase font-bold text-[#173D32]/65 tracking-[0.1em]">
                  Vernacular Preview ({draft.localLanguage})
                </span>
                <span className="text-[10px] font-semibold text-[#173D32]/55">Northeast Emergency Dialect</span>
              </div>
              <p className="text-xs text-[#173D32]/90 leading-relaxed font-sans">{draft.localizedText}</p>
            </div>
          </div>

          {/* Two-step confirmation checkbox for Critical severity */}
          {isCritical && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={criticalConfirmed}
                  onChange={(e) => setCriticalConfirmed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-red-300 text-red-700 focus:ring-red-500 cursor-pointer"
                />
                <span className="text-xs text-red-950 font-bold leading-snug">
                  I confirm this is a verified Critical emergency. I acknowledge this advisory mandates immediate public response protocols.
                </span>
              </label>
            </div>
          )}

          {/* Submission Notice / Block Error */}
          {submissionNotice && (
            <div className="p-3.5 rounded-2xl bg-red-100 border border-red-300 text-red-900 text-xs font-semibold flex items-center gap-2.5">
              <Ban className="w-4 h-4 text-red-700 shrink-0" />
              <span>{submissionNotice}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-[#173D32]/10 bg-[#FAF8F2] shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-[11px] text-[#173D32]/65 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>Multi-channel broadcast requires backend telecom gateway (M4)</span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-full text-xs font-bold text-[#173D32] border border-[#173D32]/20 hover:bg-[#173D32]/5 transition-colors cursor-pointer"
            >
              Back to Edit
            </button>

            <button
              type="button"
              onClick={handleAttemptSend}
              disabled={!canSubmit || isSubmitting}
              className={`px-5 py-2 rounded-full text-xs font-black shadow-xs transition-all flex items-center gap-2 cursor-pointer ${
                !canSubmit || isSubmitting
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed border border-gray-300'
                  : 'bg-[#173D32] hover:bg-[#1a4437] text-[#F6F4EC]'
              }`}
              title={
                !canSubmit
                  ? 'Please check the critical confirmation box'
                  : 'Backend broadcast gateway is currently unavailable'
              }
            >
              {isSubmitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  <span>Checking Telemetry...</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>Approve & Send Broadcast</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
