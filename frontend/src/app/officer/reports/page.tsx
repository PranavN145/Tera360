"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Clock,
  Compass,
  FileText,
  Inbox,
  MapPin,
  Megaphone,
  Phone,
  Search,
  User,
  X,
} from "lucide-react";
import PortalLayout from "@/components/portal/PortalLayout";
import PortalMetricGrid from "@/components/portal/PortalMetricGrid";
import PortalSplitLayout from "@/components/portal/PortalSplitLayout";
import OfficerKpiCard from "@/components/officer/OfficerKpiCard";
import StatusBadge from "@/components/ui/StatusBadge";
import { reportsApi } from "@/lib/api";
import { HazardReportOutput } from "@/types/public";

const STATES = [
  "All States",
  "Assam",
  "Nagaland",
  "Sikkim",
  "Meghalaya",
  "Arunachal Pradesh",
  "Manipur",
  "Mizoram",
  "Tripura",
];

const STATUS_FILTERS = ["All", "submitted", "under_review", "verified"];

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

export default function OfficerReportsPage() {
  const [selectedState, setSelectedState] = useState("All States");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [search, setSearch] = useState("");

  const [reports, setReports] = useState<HazardReportOutput[]>([]);
  const [selectedReport, setSelectedReport] = useState<HazardReportOutput | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    let mounted = true;
    async function loadReports() {
      try {
        const data = await reportsApi.getReports({
          state: selectedState === "All States" ? undefined : selectedState,
          status: selectedStatus === "All" ? undefined : selectedStatus,
          limit: 50,
        });
        if (mounted) {
          setReports(data);
          setError(null);
          setSelectedReport((prev) =>
            prev && data.some((d) => d.reportId === prev.reportId)
              ? prev
              : (data[0] ?? null)
          );
        }
      } catch (err: unknown) {
        if (mounted) {
          const msg = err instanceof Error ? err.message : "Failed to load field reports";
          setError(msg);
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
  }, [selectedState, selectedStatus, refreshTrigger]);

  const handleStatusChange = (status: string) => {
    if (status === selectedStatus) return;
    setIsLoading(true);
    setSelectedStatus(status);
  };

  const handleStateChange = (state: string) => {
    if (state === selectedState) return;
    setIsLoading(true);
    setSelectedState(state);
  };

  const handleRetry = () => {
    setIsLoading(true);
    setRefreshTrigger((prev) => prev + 1);
  };

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

  const totalReportsCount = reports.length;
  const pendingCount = reports.filter((r) => r.status === "submitted").length;
  const underReviewCount = reports.filter((r) => r.status === "under_review").length;
  const verifiedCount = reports.filter((r) => r.status === "verified").length;

  return (
    <PortalLayout
      allowedRoles={["officer", "admin"]}
      title="Field Reports & Ground Truth Verification"
      subtitle="Examine crowd-sourced danger reports submitted by local villagers, highway drivers, and frontline responders."
      headerActions={
        <div className="flex items-center gap-2">
          <Link
            href="/officer/dashboard"
            className="px-3.5 py-1.5 rounded-full bg-[#173D32] text-[#F6F4EC] text-xs font-bold hover:bg-[#1a4437] transition-all inline-flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Dashboard</span>
          </Link>
        </div>
      }
    >
      <div className="space-y-6 sm:space-y-8 w-full">
        {/* ── 1. Metric Summary Cards (4 columns) ── */}
        <PortalMetricGrid columns={4} ariaLabel="Field Reports Summary">
          <OfficerKpiCard
            id="metric-total-reports"
            variant="summary"
            title="Total Field Reports"
            value={totalReportsCount}
            unit="Submissions"
            icon={ClipboardList}
            badge="Incident Intake"
            badgeTone="neutral"
            detail="Aggregated crowd and responder field logs"
            isLoading={isLoading}
          />

          <OfficerKpiCard
            id="metric-pending-reports"
            variant="summary"
            title="Pending Triage"
            value={pendingCount}
            unit="Awaiting Review"
            icon={Inbox}
            accent={pendingCount > 0 ? "blue" : "green"}
            badge={pendingCount > 0 ? "Action Required" : "Cleared"}
            badgeTone={pendingCount > 0 ? "blue" : "green"}
            detail="New ground observations needing verification"
            isLoading={isLoading}
          />

          <OfficerKpiCard
            id="metric-review-reports"
            variant="summary"
            title="Under Investigation"
            value={underReviewCount}
            unit="Active Teams"
            icon={Search}
            accent={underReviewCount > 0 ? "amber" : "green"}
            badge="Field Check"
            badgeTone={underReviewCount > 0 ? "amber" : "green"}
            detail="Dispatched scouts assessing slope deformation"
            isLoading={isLoading}
          />

          <OfficerKpiCard
            id="metric-verified-reports"
            variant="summary"
            title="Verified Ground Truth"
            value={verifiedCount}
            unit="Confirmed"
            icon={CheckCircle2}
            accent="green"
            badge="Verified"
            badgeTone="green"
            detail="Geotechnical evidence approved by command desk"
            isLoading={isLoading}
          />
        </PortalMetricGrid>

        {/* ── 2. Filter and Search Bar ── */}
        <div className="bg-[#FAF8F2] border border-[#173D32]/12 rounded-3xl p-4 sm:p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
          <div className="inline-flex items-center gap-1 flex-wrap bg-[#F2EFE6] border border-[#173D32]/12 p-1 rounded-full self-start">
            {STATUS_FILTERS.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => handleStatusChange(status)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all capitalize cursor-pointer ${
                  selectedStatus === status
                    ? "bg-[#173D32] text-[#F6F4EC] shadow-2xs"
                    : "text-[#173D32]/75 hover:text-[#173D32] hover:bg-white/60"
                }`}
              >
                {status === "All" ? "All Reports" : status.replace("_", " ")}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            <select
              value={selectedState}
              onChange={(e) => handleStateChange(e.target.value)}
              className="h-9 px-3.5 rounded-full bg-white border border-[#173D32]/15 text-xs font-bold text-[#173D32] focus:outline-none focus:ring-1 focus:ring-[#173D32] cursor-pointer"
            >
              {STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <div className="relative flex-1 sm:flex-initial">
              <Search className="w-3.5 h-3.5 text-[#173D32]/45 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search report ID, hazard, location..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 pl-9 pr-8 rounded-full bg-white border border-[#173D32]/15 text-xs text-[#173D32] placeholder:text-[#173D32]/45 focus:outline-none focus:ring-1 focus:ring-[#173D32] w-full sm:w-60"
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
        </div>

        {/* Error State */}
        {error && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-900 flex items-center justify-between gap-3 text-xs font-semibold">
            <span className="inline-flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </span>
            <button
              type="button"
              onClick={handleRetry}
              className="px-3.5 py-1.5 rounded-full bg-red-700 text-white font-bold cursor-pointer hover:bg-red-800 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* ── 3. 2-Column Split Workspace: Feed (7 cols) + Inspection Dossier (5 cols) ── */}
        <PortalSplitLayout
          leftSpan={7}
          stickyRight={true}
          left={
            <div className="bg-[#FAF8F2] border border-[#173D32]/12 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-start justify-between gap-3 pb-4 border-b border-[#173D32]/10">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#EAF0E6] border border-[#173D32]/10 flex items-center justify-center text-[#173D32] shrink-0">
                    <ClipboardList className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#173D32]/55">
                      Ground Truth Intake
                    </p>
                    <h3 className="text-base font-extrabold text-[#173D32] leading-tight">
                      Incoming Field &amp; Community Hazard Reports
                    </h3>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full bg-white border border-[#173D32]/12 text-[11px] font-bold text-[#173D32]/75 shrink-0">
                  {filtered.length} Shown
                </span>
              </div>

              {isLoading && (
                <div className="space-y-3">
                  {[1, 2, 3].map((n) => (
                    <div
                      key={n}
                      className="h-28 bg-white border border-[#173D32]/10 rounded-2xl animate-pulse"
                    />
                  ))}
                </div>
              )}

              {!isLoading && !error && filtered.length === 0 && (
                <div className="text-center py-14 bg-white border border-[#173D32]/10 rounded-2xl p-6 shadow-[0_2px_10px_-3px_rgba(23,61,50,0.05)]">
                  <div className="w-12 h-12 rounded-2xl bg-[#EAF0E6] border border-[#173D32]/10 flex items-center justify-center text-[#173D32] mx-auto mb-3">
                    <ClipboardList className="w-6 h-6" />
                  </div>
                  <h4 className="text-base font-extrabold text-[#173D32]">No Reports Found</h4>
                  <p className="text-xs text-[#173D32]/65 mt-1">
                    No hazard submissions recorded under the selected filters.
                  </p>
                </div>
              )}

              {!isLoading && !error && filtered.length > 0 && (
                <div className="space-y-3">
                  {filtered.map((report) => {
                    const isSelected = selectedReport?.reportId === report.reportId;
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
                                <MapPin className="w-3.5 h-3.5 text-[#173D32]/45" />
                                <span>
                                  {report.state} · Source: {report.source}
                                </span>
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-[#173D32]/45" />
                                <span>{new Date(report.createdAt).toLocaleDateString()}</span>
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
              {/* Subtle top-right mountain SVG watermark matching dashboard / dossier style */}
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
                  Inspection Dossier
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
                        <span>Reporter Ground Identity</span>
                      </span>
                      <div className="mt-1.5 flex items-center justify-between gap-2 font-bold text-[#173D32] flex-wrap">
                        <span>{selectedReport.reporterName || "Anonymous Reporter"}</span>
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
                    Click on any report to review incident evidence and dispatcher notes.
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
                  href="/officer/alerts"
                  className="px-4 py-2 rounded-full bg-[#173D32] hover:bg-[#1a4437] text-[#F6F4EC] font-bold inline-flex items-center gap-1.5 transition-all shadow-2xs"
                >
                  <Megaphone className="w-3.5 h-3.5" />
                  <span>Escalate to Alert</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          }
        />
      </div>
    </PortalLayout>
  );
}
