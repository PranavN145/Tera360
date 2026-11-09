"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import PortalLayout from "@/components/portal/PortalLayout";
import { reportsApi } from "@/lib/api";
import { HazardReportOutput } from "@/types/public";

export default function FieldReportsPage() {
  const [reports, setReports] = useState<HazardReportOutput[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function loadReports() {
      try {
        const data = await reportsApi.getReports();
        if (mounted) {
          setReports(data);
          setError(null);
        }
      } catch (err: unknown) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Failed to load field reports");
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

  return (
    <PortalLayout
      allowedRoles={["field_officer"]}
      title="Field Hazard Reports & Ground Truth"
      subtitle="Crowd-sourced incident submissions, field sensor anomalies, and ground verifications."
      headerActions={
        <Link
          href="/report"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#173D32] text-[#F6F4EC] text-xs font-bold hover:bg-[#1f4e40] shadow-2xs transition-colors"
        >
          <span>+ File Incident Report</span>
        </Link>
      }
    >
      <div className="space-y-6">
        {/* Reports Overview Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-4 bg-[#FAF8F2] rounded-2xl border border-[#173D32]/12 shadow-2xs">
            <span className="text-[#173D32]/60 font-medium block">Total Field Submissions</span>
            <span className="font-extrabold text-[#173D32] text-xl mt-1 block">
              {reports.length}
            </span>
          </div>
          <div className="p-4 bg-[#FAF8F2] rounded-2xl border border-[#173D32]/12 shadow-2xs">
            <span className="text-[#173D32]/60 font-medium block">Under Field Verification</span>
            <span className="font-extrabold text-amber-900 text-xl mt-1 block">
              {reports.filter((r) => r.severity === "Critical" || r.severity === "Warning").length}
            </span>
          </div>
          <div className="p-4 bg-[#FAF8F2] rounded-2xl border border-[#173D32]/12 shadow-2xs">
            <span className="text-[#173D32]/60 font-medium block">Operational Clearance</span>
            <span className="font-extrabold text-emerald-800 text-xl mt-1 block">
              Active Sync
            </span>
          </div>
        </div>

        {/* Reports Listing Table */}
        <div className="p-6 bg-[#FAF8F2] rounded-2xl border border-[#173D32]/12 shadow-xs">
          <h3 className="text-base font-extrabold text-[#173D32] mb-4">
            Recent Ground Observations
          </h3>

          {isLoading ? (
            <div className="py-12 text-center text-xs text-[#173D32]/60">
              Loading field reports...
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-red-50 text-red-800 text-xs border border-red-200">
              {error}
            </div>
          ) : reports.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#173D32]/60">
              No ground truth reports logged yet.
            </div>
          ) : (
            <div className="divide-y divide-[#173D32]/10">
              {reports.map((report) => (
                <div key={report.reportId} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-[#173D32]/10 text-[10px] font-mono font-bold text-[#173D32]">
                        {report.reportId}
                      </span>
                      <span className="text-xs font-bold text-[#173D32]">
                        {report.hazardType}
                      </span>
                      <span className="text-xs text-[#173D32]/60">
                        · {report.location} ({report.state})
                      </span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider self-start sm:self-auto ${
                        report.severity.toLowerCase() === "critical"
                          ? "bg-red-100 text-red-800"
                          : "bg-amber-100 text-amber-900"
                      }`}
                    >
                      {report.severity}
                    </span>
                  </div>
                  <p className="text-xs text-[#173D32]/80 leading-relaxed">
                    {report.description}
                  </p>
                  <div className="mt-2 flex items-center gap-4 text-[11px] text-[#173D32]/60">
                    <span>Reported by: <strong className="text-[#173D32]">{report.reporterName || "Ground Observer"}</strong></span>
                    <span>Contact: {report.reporterPhone || "Not provided"}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PortalLayout>
  );
}
