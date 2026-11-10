"use client";

import React, { useState, useEffect } from "react";
import PortalLayout from "@/components/portal/PortalLayout";
import { publicApi } from "@/lib/api";
import { PublicAlertItem } from "@/types/public";
import { CloudRain, Droplets, AlertTriangle } from "lucide-react";

export default function FieldAlertsPage() {
  const [alerts, setAlerts] = useState<PublicAlertItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function loadAlerts() {
      try {
        const data = await publicApi.getAlerts();
        if (mounted) {
          setAlerts(data.alerts);
          setError(null);
        }
      } catch (err: unknown) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Failed to load operational alerts");
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }
    void loadAlerts();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <PortalLayout
      allowedRoles={["field_officer"]}
      title="Field Alerts & Operational Bulletins"
      subtitle="Priority hazard broadcasts, precipitation warnings, and geotechnical landslide watches."
    >
      <div className="space-y-6">
        {/* Alerts List */}
        <div className="p-6 bg-[#FAF8F2] rounded-2xl border border-[#173D32]/12 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-[#173D32]/10 mb-4">
            <h3 className="text-base font-extrabold text-[#173D32]">
              Active Bulletins ({alerts.length})
            </h3>
            <span className="text-xs text-[#173D32]/60">
              Synchronized with State Emergency Centers
            </span>
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-xs text-[#173D32]/60">
              Loading active advisories...
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-red-50 text-red-800 text-xs border border-red-200">
              {error}
            </div>
          ) : alerts.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#173D32]/60">
              No active hazard advisories published at this time.
            </div>
          ) : (
            <div className="space-y-4">
              {alerts.map((alert) => (
                <div
                  key={alert.id || alert.title}
                  className="p-5 rounded-2xl bg-white border border-[#173D32]/12 shadow-2xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider ${
                          alert.severity.toLowerCase() === "critical"
                            ? "bg-red-100 text-red-800"
                            : alert.severity.toLowerCase() === "warning"
                            ? "bg-amber-100 text-amber-900"
                            : "bg-blue-100 text-blue-900"
                        }`}
                      >
                        {alert.severity}
                      </span>
                      <span className="text-xs font-bold text-[#173D32]">
                        {alert.corridor} · {alert.state}
                      </span>
                    </div>
                    <span className="text-xs text-[#173D32]/60">
                      {new Date(alert.publishedAt || alert.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <h4 className="text-base font-extrabold text-[#173D32]">
                    {alert.title}
                  </h4>
                  <p className="text-xs text-[#173D32]/80 mt-1 leading-relaxed">
                    {alert.description}
                  </p>

                  {alert.advisory && (
                    <div className="mt-3 p-3 rounded-xl bg-[#FAF8F2] border border-[#173D32]/8 text-xs text-[#173D32]">
                      <strong className="block mb-0.5 font-bold">Field Directive:</strong>
                      {alert.advisory}
                    </div>
                  )}

                  <div className="mt-4 pt-3 border-t border-[#173D32]/10 flex flex-wrap items-center gap-4 text-xs text-[#173D32]/70">
                    {alert.rainfall24h && (
                      <span className="inline-flex items-center gap-1.5">
                        <CloudRain className="w-3.5 h-3.5 text-sky-600" />
                        <span>24h Rain: <strong>{alert.rainfall24h}</strong></span>
                      </span>
                    )}
                    {alert.saturation && (
                      <span className="inline-flex items-center gap-1.5">
                        <Droplets className="w-3.5 h-3.5 text-blue-600" />
                        <span>Saturation: <strong>{alert.saturation}</strong></span>
                      </span>
                    )}
                    {alert.trafficStatus && (
                      <span className="inline-flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        <span>Traffic: <strong>{alert.trafficStatus}</strong></span>
                      </span>
                    )}
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
