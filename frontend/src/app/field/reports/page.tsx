"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  Clock,
  Compass,
  FilePlus2,
  FileText,
  Inbox,
  MapPin,
  Phone,
  Search,
  User,
  X,
} from "lucide-react";
import PortalLayout from "@/components/portal/PortalLayout";
import PortalMetricGrid from "@/components/portal/PortalMetricGrid";
import PortalSplitLayout from "@/components/portal/PortalSplitLayout";
import { PortalKpiCard } from "@/components/portal";
import StatusBadge from "@/components/ui/StatusBadge";
import { reportsApi, fieldOfficerApi } from "@/lib/api";
import { HazardReportOutput } from "@/types/public";

function getSeverityBarClass(severity: string): string {
  switch (severity) {
    case "Critical":
    case "High":
      return "bg-[#DC2626]";
    case "Warning":
    case "Medium":
      return "bg-[#D97706]";
    default:
      return "bg-[#2563EB]";
  }
}

export default function FieldReportsPage() {
  const [reports, setReports] = useState<HazardReportOutput[]>([]);
  const [selectedReport, setSelectedReport] =
    useState<HazardReportOutput | null>(null);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTriagePending, setIsTriagePending] = useState(false);
  const [triageNotice, setTriageNotice] = useState<string | null>(null);
  const [activeTriageModal, setActiveTriageModal] = useState<"verify" | "reject" | "escalate" | null>(null);
  const [triageNotes, setTriageNotes] = useState("");

  const handleTriageSubmit = async () => {
    if (!selectedReport || !activeTriageModal) return;
    setIsTriagePending(true);
    setTriageNotice(null);
    try {
      if (activeTriageModal === "verify") {
        await fieldOfficerApi.verifyReport(
          selectedReport.reportId,
          triageNotes || "Field inspection confirmed ground truth hazard."
        );
        setTriageNotice(`Report #${selectedReport.reportId} verified and updated.`);
      } else if (activeTriageModal === "reject") {
        await fieldOfficerApi.rejectReport(
          selectedReport.reportId,
          triageNotes || "Inspected on site: slope normal, false alarm."
        );
        setTriageNotice(`Report #${selectedReport.reportId} marked as rejected.`);
      } else if (activeTriageModal === "escalate") {
        await fieldOfficerApi.escalateReport(selectedReport.reportId, {
          escalationReason: triageNotes || "Immediate geotechnical hazard response required.",
        });
        setTriageNotice(`Report #${selectedReport.reportId} escalated to Emergency Operations Command.`);
      }

      setActiveTriageModal(null);
      setTriageNotes("");
      const refreshed = await reportsApi.getReports();
      setReports(refreshed);
      const found = refreshed.find((r) => r.reportId === selectedReport.reportId);
      if (found) setSelectedReport(found);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to execute triage operation.";
      setTriageNotice(`Error: ${msg}`);
    } finally {
      setIsTriagePending(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    async function loadReports() {
      try {
        const data = await reportsApi.getReports();
        if (mounted) {
          setReports(data);
          setSelectedReport((prev) =>
            prev && data.some((d) => d.reportId === prev.reportId)
              ? prev
              : (data[0] ?? null)
          );
          setError(null);
        }
      } catch (err: unknown) {
        if (mounted) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load field reports"
          );
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }
    void loadReports();
    return () => {
      mounted = false;
    };
  }, []);

  const filtered = reports.filter((r) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      r.reportId.toLowerCase().includes(q) ||
      r.location.toLowerCase().includes(q) ||
      r.hazardType.toLowerCase().includes(q) ||
      r.state.toLowerCase().includes(q) ||
      (r.reporterName && r.reporterName.toLowerCase().includes(q))
    );
  });

  const totalCount = reports.length;
  const urgentCount = reports.filter(
    (r) => r.severity === "Critical" || r.severity === "Warning"
  ).length;
  const pendingCount = reports.filter((r) => r.status === "submitted").length;
  const verifiedCount = reports.filter((r) => r.status === "verified").length;

  return (
    <PortalLayout
      allowedRoles={["field_officer"]}
      title="Field Hazard Reports & Ground Truth"
      subtitle="Crowd-sourced incident submissions, field sensor anomalies, and ground verifications."
      headerActions={
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/report"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#D6A65D] hover:bg-[#c9984e] text-[#173D32] text-xs font-bold shadow-xs transition-all"
          >
            <FilePlus2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>File Incident Report</span>
          </Link>
          <Link
            href="/field/tasks"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#173D32] text-[#F6F4EC] text-xs font-bold hover:bg-[#1a4437] transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            <span>My Tasks</span>
          </Link>
        </div>
      }
    >
      <div className="space-y-6 sm:space-y-8 w-full">
        {/* ── 1. Summary Metric Cards ───────────────────────────────────── */}
        <PortalMetricGrid columns={4} ariaLabel="Field Reports Summary">
          <PortalKpiCard
            id="field-reports-total"
            variant="summary"
            title="Total Field Logs"
            value={totalCount}
            unit="Submissions"
            icon={ClipboardList}
            badge="Active Sync"
            badgeTone="neutral"
            detail="Aggregated ground responder & community reports"
            isLoading={isLoading}
          />

          <PortalKpiCard
            id="field-reports-urgent"
            variant="summary"
            title="Priority Incidents"
            value={urgentCount}
            unit="Critical / Warning"
            icon={AlertTriangle}
            accent={urgentCount > 0 ? "amber" : "green"}
            badge={urgentCount > 0 ? "Field Verification" : "Nominal"}
            badgeTone={urgentCount > 0 ? "amber" : "green"}
            detail="Reports requiring immediate ground inspection"
            isLoading={isLoading}
          />

          <PortalKpiCard
            id="field-reports-pending"
            variant="summary"
            title="Pending Triage"
            value={pendingCount}
            unit="New Intake"
            icon={Inbox}
            accent={pendingCount > 0 ? "blue" : "green"}
            badge="Awaiting Review"
            badgeTone={pendingCount > 0 ? "blue" : "green"}
            detail="Recent observations awaiting command triage"
            isLoading={isLoading}
          />

          <PortalKpiCard
            id="field-reports-verified"
            variant="summary"
            title="Verified Ground Truth"
            value={verifiedCount}
            unit="Confirmed"
            icon={CheckCircle2}
            accent="green"
            badge="Verified"
            badgeTone="green"
            detail="Observations confirmed by field patrols"
            isLoading={isLoading}
          />
        </PortalMetricGrid>

        {/* ── 2. Split Workspace: Reports Feed + Inspection Dossier ─────── */}
        <PortalSplitLayout
          leftSpan={7}
          stickyRight={true}
          left={
            <div className="bg-[#FAF8F2] border border-[#173D32]/12 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#173D32]/10">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#EAF0E6] border border-[#173D32]/10 flex items-center justify-center text-[#173D32] shrink-0">
                    <ClipboardList className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#173D32]/55">
                      Ground Truth Intake
                    </p>
                    <h3 className="text-base font-extrabold text-[#173D32] leading-tight">
                      Recent Ground Observations ({filtered.length})
                    </h3>
                  </div>
                </div>

                <div className="relative w-full sm:w-56">
                  <Search
                    className="w-3.5 h-3.5 text-[#173D32]/45 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    id="field-reports-search"
                    name="field-reports-search"
                    type="text"
                    aria-label="Search field reports"
                    placeholder="Search ID, hazard, location..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-9 pl-9 pr-8 rounded-full bg-white border border-[#173D32]/15 text-xs text-[#173D32] placeholder:text-[#173D32]/45 focus:outline-none focus:ring-1 focus:ring-[#173D32] w-full"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      aria-label="Clear search"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-[#173D32]/50 hover:text-[#173D32] cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((n) => (
                    <div
                      key={n}
                      className="h-28 bg-white border border-[#173D32]/10 rounded-2xl animate-pulse"
                    />
                  ))}
                </div>
              ) : error ? (
                <div className="p-4 rounded-2xl bg-red-50 text-red-900 text-xs border border-red-200 flex items-center gap-2 font-semibold">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" aria-hidden="true" />
                  <span>{error}</span>
                </div>
              ) : filtered.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#173D32]/65 bg-white rounded-2xl border border-[#173D32]/10">
                  No ground truth reports match your filter.
                </div>
              ) : (
                <div className="space-y-3">
                  {filtered.map((report) => {
                    const isSelected =
                      selectedReport?.reportId === report.reportId;
                    return (
                      <button
                        type="button"
                        key={report.reportId}
                        onClick={() => setSelectedReport(report)}
                        className={`w-full text-left p-4 sm:p-5 rounded-2xl border bg-white transition-all cursor-pointer ${
                          isSelected
                            ? "border-[#173D32] shadow-[0_6px_20px_-6px_rgba(23,61,50,0.16)] ring-1 ring-[#173D32]/25"
                            : "border-[#173D32]/10 shadow-[0_2px_10px_-3px_rgba(23,61,50,0.05)] hover:border-[#173D32]/25"
                        }`}
                      >
                        <div className="flex items-stretch gap-3.5">
                          <div
                            className={`w-1 rounded-full shrink-0 ${getSeverityBarClass(
                              report.severity
                            )}`}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded-md bg-[#FAF8F2] border border-[#173D32]/12 font-mono font-extrabold text-[11px] text-[#173D32]">
                                  {report.reportId}
                                </span>
                                <StatusBadge status={report.severity} size="xs" />
                              </div>
                              <StatusBadge status={report.status} size="xs" />
                            </div>

                            <h4 className="font-extrabold text-sm text-[#173D32]">
                              {report.hazardType} — {report.location}
                            </h4>

                            <p className="text-xs text-[#173D32]/75 mt-1 line-clamp-2 leading-relaxed">
                              {report.description}
                            </p>

                            <div className="mt-3 pt-2.5 border-t border-[#173D32]/10 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#173D32]/65 font-medium">
                              <span className="inline-flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 text-[#173D32]/45" aria-hidden="true" />
                                <span>
                                  {report.state} ·{" "}
                                  {report.reporterName || "Ground Observer"}
                                </span>
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-[#173D32]/45" aria-hidden="true" />
                                <span>
                                  {new Date(report.createdAt).toLocaleDateString()}
                                </span>
                              </span>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          }
          right={
            <div className="relative overflow-hidden bg-[#FAF8F2] border border-[#173D32]/12 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
              <svg
                aria-hidden="true"
                viewBox="0 0 220 90"
                className="pointer-events-none absolute right-0 top-0 h-24 w-56 text-[#173D32] opacity-[0.07]"
                preserveAspectRatio="none"
              >
                <path
                  d="M0 90 L52 38 L88 64 L138 14 L182 54 L220 26 L220 90 Z"
                  fill="currentColor"
                />
              </svg>

              <div className="relative">
                <span className="text-[10px] uppercase font-bold text-[#173D32]/55 tracking-[0.12em] block mb-1">
                  Field Observation Dossier
                </span>
                <h3 className="text-xl font-extrabold text-[#173D32] leading-tight">
                  {selectedReport?.hazardType || "Select a Report"}
                </h3>
                {selectedReport && (
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#173D32] text-[#F6F4EC] font-mono font-bold text-[11px]">
                      {selectedReport.reportId}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-white border border-[#173D32]/12 text-[11px] font-bold text-[#173D32]/80">
                      {selectedReport.state}
                    </span>
                    <StatusBadge status={selectedReport.status} size="xs" />
                  </div>
                )}

                {selectedReport ? (
                  <div className="mt-5 space-y-3 text-xs">
                    <div className="p-3.5 rounded-2xl bg-white border border-[#173D32]/10 shadow-[0_2px_8px_-2px_rgba(23,61,50,0.04)]">
                      <span className="text-[10px] uppercase tracking-[0.1em] text-[#173D32]/55 inline-flex items-center gap-1.5 font-bold">
                        <MapPin className="w-3.5 h-3.5 text-[#173D32]/65" />
                        <span>Reported Location</span>
                      </span>
                      <span className="font-bold text-[#173D32] text-sm mt-1 block">
                        {selectedReport.location}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-white border border-[#173D32]/10 shadow-[0_2px_8px_-2px_rgba(23,61,50,0.04)]">
                      <span className="text-[10px] uppercase tracking-[0.1em] text-[#173D32]/55 inline-flex items-center gap-1.5 font-bold">
                        <FileText className="w-3.5 h-3.5 text-[#173D32]/65" />
                        <span>Incident Statement</span>
                      </span>
                      <p className="font-normal text-[#173D32]/85 mt-1 leading-relaxed">
                        {selectedReport.description}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-white border border-[#173D32]/10 shadow-[0_2px_8px_-2px_rgba(23,61,50,0.04)]">
                      <span className="text-[10px] uppercase tracking-[0.1em] text-[#173D32]/55 inline-flex items-center gap-1.5 font-bold">
                        <User className="w-3.5 h-3.5 text-[#173D32]/65" />
                        <span>Observer Contact</span>
                      </span>
                      <div className="mt-1.5 flex items-center justify-between gap-2 font-bold text-[#173D32] flex-wrap">
                        <span>
                          {selectedReport.reporterName || "Ground Observer"}
                        </span>
                        {selectedReport.reporterPhone && (
                          <span className="text-xs font-mono inline-flex items-center gap-1 text-[#173D32]/80">
                            <Phone className="w-3 h-3" />
                            <span>{selectedReport.reporterPhone}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {selectedReport.coordinates && (
                      <div className="p-3.5 rounded-2xl bg-white border border-[#173D32]/10 shadow-[0_2px_8px_-2px_rgba(23,61,50,0.04)]">
                        <span className="text-[10px] uppercase tracking-[0.1em] text-[#173D32]/55 inline-flex items-center gap-1.5 font-bold">
                          <Compass className="w-3.5 h-3.5 text-[#173D32]/65" />
                          <span>Geospatial Coordinates</span>
                        </span>
                        <span className="font-mono font-bold text-[#173D32] mt-1 block">
                          {selectedReport.coordinates.coordinates[1].toFixed(4)}° N,{" "}
                          {selectedReport.coordinates.coordinates[0].toFixed(4)}° E
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-12 text-center text-xs text-[#173D32]/60">
                    Click any ground report to inspect incident evidence.
                  </div>
                )}
                {/* Field Triage Actions (AUD-07) */}
                {selectedReport && (
                  <div className="mt-4 pt-3 border-t border-[#173D32]/10">
                    <span className="text-[10px] uppercase font-bold text-[#173D32]/55 tracking-wide block mb-2">
                      Field Triage & Verification Actions
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveTriageModal("verify")}
                        disabled={isTriagePending || selectedReport.status === "verified"}
                        className="px-3.5 py-1.5 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-40"
                      >
                        ✓ Verify Ground Hazard
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTriageModal("reject")}
                        disabled={isTriagePending || selectedReport.status === "rejected"}
                        className="px-3.5 py-1.5 rounded-full bg-white hover:bg-red-50 text-red-700 border border-red-200 text-xs font-bold transition-colors cursor-pointer disabled:opacity-40"
                      >
                        ✕ Reject / False Alarm
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTriageModal("escalate")}
                        disabled={isTriagePending}
                        className="px-3.5 py-1.5 rounded-full bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-40"
                      >
                        ⚠ Escalate to HQ
                      </button>
                    </div>
                    {triageNotice && (
                      <p className="text-xs text-[#173D32] bg-emerald-50 border border-emerald-200 p-2 rounded-xl mt-2 font-medium">
                        {triageNotice}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="relative mt-6 pt-4 border-t border-[#173D32]/10 flex flex-wrap items-center justify-between gap-3 text-xs">
                <span className="text-[#173D32]/65 inline-flex items-center gap-1.5 font-medium">
                  <Clock className="w-3.5 h-3.5 text-[#173D32]/50" />
                  <span>
                    Logged:{" "}
                    {selectedReport
                      ? new Date(selectedReport.createdAt).toLocaleDateString()
                      : "Pending"}
                  </span>
                </span>
                <Link
                  href="/report"
                  className="px-4 py-2 rounded-full bg-[#173D32] hover:bg-[#1a4437] text-[#F6F4EC] font-bold inline-flex items-center gap-1.5 transition-all shadow-2xs"
                >
                  <FilePlus2 className="w-3.5 h-3.5" />
                  <span>Submit Field Update</span>
                </Link>
              </div>
            </div>
          }
        />
      </div>

      {/* Field Triage Action Modal */}
      {activeTriageModal && selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[#FAF8F2] border border-[#173D32]/20 rounded-2xl p-6 max-w-lg w-full shadow-2xl">
            <h3 className="text-base font-bold text-[#173D32] mb-1">
              {activeTriageModal === "verify" && `Verify Incident #${selectedReport.reportId}`}
              {activeTriageModal === "reject" && `Reject Report #${selectedReport.reportId}`}
              {activeTriageModal === "escalate" && `Escalate Incident #${selectedReport.reportId} to HQ`}
            </h3>
            <p className="text-xs text-[#173D32]/70 mb-4">
              {selectedReport.location} • {selectedReport.hazardType}
            </p>

            <label className="block text-xs font-bold text-[#173D32] uppercase mb-1">
              {activeTriageModal === "verify" && "Field Verification Notes:"}
              {activeTriageModal === "reject" && "Reason for Rejection / False Alarm:"}
              {activeTriageModal === "escalate" && "Urgent Escalation Summary:"}
            </label>
            <textarea
              rows={4}
              value={triageNotes}
              onChange={(e) => setTriageNotes(e.target.value)}
              placeholder="Enter official observations..."
              className="w-full p-3 rounded-xl bg-white border border-[#173D32]/20 text-xs text-[#173D32] focus:outline-none focus:ring-1 focus:ring-[#173D32] mb-4"
            />

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setActiveTriageModal(null);
                  setTriageNotes("");
                }}
                className="px-4 py-2 rounded-full text-xs font-semibold text-[#173D32] hover:bg-black/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleTriageSubmit}
                disabled={isTriagePending}
                className="px-5 py-2 rounded-full bg-[#173D32] hover:bg-[#1f4e40] text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isTriagePending ? "Submitting..." : "Confirm Action"}
              </button>
            </div>
          </div>
        </div>
      )}
    </PortalLayout>
  );
}
