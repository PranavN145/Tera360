"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import PortalLayout from "@/components/portal/PortalLayout";
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
          if (data.length > 0 && !selectedReport) {
            setSelectedReport(data[0]);
          }
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
  }, [selectedState, selectedStatus, selectedReport, refreshTrigger]);

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
            className="px-3.5 py-1.5 rounded-full bg-[#173D32] text-[#F6F4EC] text-xs font-bold hover:bg-[#1a4437] transition-all"
          >
            ← Dashboard
          </Link>
        </div>
      }
    >
      {/* Metric Summary Cards */}
      <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#FAF8F2] border border-[#173D32]/12 rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-blue-700 tracking-wider block">
              New Submissions (Pending)
            </span>
            <span className="text-2xl font-black text-blue-700 mt-0.5 block">
              {isLoading ? "..." : pendingCount}
            </span>
          </div>
          <span className="text-2xl">📥</span>
        </div>

        <div className="bg-[#FAF8F2] border border-[#173D32]/12 rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-amber-700 tracking-wider block">
              Under Field Review
            </span>
            <span className="text-2xl font-black text-amber-700 mt-0.5 block">
              {isLoading ? "..." : underReviewCount}
            </span>
          </div>
          <span className="text-2xl">🔍</span>
        </div>

        <div className="bg-[#FAF8F2] border border-[#173D32]/12 rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider block">
              Verified Ground Truth
            </span>
            <span className="text-2xl font-black text-emerald-800 mt-0.5 block">
              {isLoading ? "..." : verifiedCount}
            </span>
          </div>
          <span className="text-2xl">✅</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="mb-6 bg-[#FAF8F2] border border-[#173D32]/12 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 w-full md:w-auto">
          {STATUS_FILTERS.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setSelectedStatus(status)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all capitalize cursor-pointer ${
                selectedStatus === status
                  ? "bg-[#173D32] text-[#F6F4EC] shadow-xs"
                  : "text-[#173D32]/75 hover:bg-[#173D32]/5"
              }`}
            >
              {status === "All" ? "All Reports" : status.replace("_", " ")}
            </button>
          ))}
        </div>

        {/* State Dropdown & Search Input */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <select
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
            className="h-9 px-3 rounded-xl bg-[#F6F4EC] border border-[#173D32]/20 text-xs font-bold text-[#173D32] focus:outline-none cursor-pointer"
          >
            {STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Search report ID, hazard, location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 px-3.5 rounded-xl bg-[#F6F4EC] border border-[#173D32]/20 text-xs text-[#173D32] placeholder:text-[#173D32]/50 focus:outline-none focus:ring-1 focus:ring-[#173D32] w-full sm:w-56"
          />
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-900 flex items-center justify-between text-xs font-semibold">
          <span>⚠️ {error}</span>
          <button
            type="button"
            onClick={handleRetry}
            className="px-3 py-1 rounded-full bg-red-700 text-white font-bold"
          >
            Retry
          </button>
        </div>
      )}

      {/* 2-Column Reports Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Reports Feed List (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          {isLoading && (
            <div className="space-y-3">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-28 bg-[#FAF8F2] border border-[#173D32]/10 rounded-2xl animate-pulse" />
              ))}
            </div>
          )}

          {!isLoading && !error && filtered.length === 0 && (
            <div className="text-center py-16 bg-[#FAF8F2] border border-[#173D32]/10 rounded-3xl p-6">
              <span className="text-3xl block mb-2">📋</span>
              <h4 className="text-base font-extrabold text-[#173D32]">No Reports Found</h4>
              <p className="text-xs text-[#173D32]/70 mt-1">
                No hazard submissions recorded under the selected filters.
              </p>
            </div>
          )}

          {!isLoading && !error && filtered.length > 0 && (
            <div className="space-y-3">
              {filtered.map((report) => {
                const isSelected = selectedReport?.reportId === report.reportId;
                return (
                  <div
                    key={report.reportId}
                    onClick={() => setSelectedReport(report)}
                    className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-[#FAF8F2] border-[#173D32] shadow-sm ring-1 ring-[#173D32]/30"
                        : "bg-[#FAF8F2] border-[#173D32]/12 hover:border-[#173D32]/25"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-xs text-[#173D32]">
                          {report.reportId}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                            report.severity === "Critical"
                              ? "bg-red-100 text-red-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {report.severity}
                        </span>
                      </div>

                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          report.status === "verified"
                            ? "bg-emerald-100 text-emerald-800"
                            : report.status === "under_review"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {report.status.replace("_", " ")}
                      </span>
                    </div>

                    <h4 className="font-extrabold text-sm text-[#173D32]">
                      {report.hazardType} — {report.location}
                    </h4>

                    <p className="text-xs text-[#173D32]/80 mt-1 line-clamp-2 leading-relaxed">
                      {report.description}
                    </p>

                    <div className="mt-3 pt-2 border-t border-[#173D32]/8 flex items-center justify-between text-[11px] text-[#173D32]/65 font-medium">
                      <span>Source: {report.source}</span>
                      <span>Submitted: {new Date(report.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Selected Report Detailed Verification Card (5 cols) */}
        <div className="lg:col-span-5 bg-[#FAF8F2] border border-[#173D32]/12 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-[#173D32]/60 tracking-wider block mb-1">
              Inspection Dossier
            </span>
            <h3 className="text-xl font-extrabold text-[#173D32] leading-tight">
              {selectedReport?.hazardType || "Select a Report"}
            </h3>
            {selectedReport && (
              <span className="inline-block mt-1 font-mono font-bold text-xs text-[#173D32]/75">
                Ref: {selectedReport.reportId} · {selectedReport.state}
              </span>
            )}

            {selectedReport ? (
              <div className="mt-5 space-y-3.5 text-xs">
                <div className="p-3.5 rounded-xl bg-[#F6F4EC] border border-[#173D32]/10">
                  <span className="text-[#173D32]/60 block font-medium">Reported Location</span>
                  <span className="font-bold text-[#173D32] text-sm mt-0.5 block">
                    {selectedReport.location}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-[#F6F4EC] border border-[#173D32]/10">
                  <span className="text-[#173D32]/60 block font-medium">Incident Statement</span>
                  <p className="font-normal text-[#173D32] mt-1 leading-relaxed">
                    {selectedReport.description}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#F6F4EC] border border-[#173D32]/10">
                  <span className="text-[#173D32]/60 block font-medium">Reporter Ground Identity</span>
                  <div className="mt-1 flex items-center justify-between font-bold text-[#173D32]">
                    <span>{selectedReport.reporterName || "Anonymous Reporter"}</span>
                    {selectedReport.reporterPhone && (
                      <span className="text-xs font-mono">{selectedReport.reporterPhone}</span>
                    )}
                  </div>
                </div>

                {selectedReport.coordinates && (
                  <div className="p-3.5 rounded-xl bg-[#F6F4EC] border border-[#173D32]/10">
                    <span className="text-[#173D32]/60 block font-medium">Geospatial Coordinates</span>
                    <span className="font-mono font-bold text-[#173D32] mt-0.5 block">
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

          <div className="mt-6 pt-4 border-t border-[#173D32]/10 flex items-center justify-between text-xs">
            <span className="text-[#173D32]/60">
              Logged: {selectedReport ? new Date(selectedReport.createdAt).toLocaleDateString() : ""}
            </span>
            <Link
              href="/officer/alerts"
              className="font-bold text-[#173D32] hover:underline"
            >
              Escalate to Alert →
            </Link>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}

