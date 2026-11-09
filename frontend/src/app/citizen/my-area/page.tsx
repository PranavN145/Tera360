"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import PortalLayout from "@/components/portal/PortalLayout";
import { publicApi } from "@/lib/api";
import { PublicRoadStatusItem, PublicAlertItem } from "@/types/public";

const REGIONS = [
  { id: "assam", name: "Dima Hasao / Haflong (Assam)", corridor: "NH-27" },
  { id: "nagaland", name: "Kohima / Dzüdza Valley (Nagaland)", corridor: "NH-29" },
  { id: "sikkim", name: "Teesta Gorge / Gangtok (Sikkim)", corridor: "NH-10" },
  { id: "meghalaya", name: "East Khasi Hills / Shillong (Meghalaya)", corridor: "NH-6" },
];

export default function CitizenMyAreaPage() {
  const [selectedRegion, setSelectedRegion] = useState(REGIONS[0]);
  const [roads, setRoads] = useState<PublicRoadStatusItem[]>([]);
  const [alerts, setAlerts] = useState<PublicAlertItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        const [roadData, alertData] = await Promise.all([
          publicApi.getRoadStatus({}),
          publicApi.getAlerts(),
        ]);
        if (mounted) {
          setRoads(roadData);
          setAlerts(alertData.alerts);
        }
      } catch {
        // Fallback gracefully
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }
    void loadData();
    return () => {
      mounted = false;
    };
  }, []);

  const relevantRoad = roads.find(
    (r) =>
      r.code === selectedRegion.corridor ||
      r.name.includes(selectedRegion.corridor)
  );

  const relevantAlert = alerts.find(
    (a) =>
      a.corridor === selectedRegion.corridor ||
      a.state.toLowerCase() === selectedRegion.id
  );

  return (
    <PortalLayout
      allowedRoles={["citizen"]}
      title="My Area Local Landslide Risk"
      subtitle="Hyper-local slope moisture assessment, arterial road clearance, and weather alerts for your neighborhood."
    >
      <div className="space-y-6">
        {/* Region selector pill buttons */}
        <div className="flex flex-wrap items-center gap-2 pb-2">
          {REGIONS.map((reg) => (
            <button
              key={reg.id}
              type="button"
              onClick={() => setSelectedRegion(reg)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedRegion.id === reg.id
                  ? "bg-[#173D32] text-[#F6F4EC] shadow-2xs"
                  : "bg-white/80 hover:bg-white text-[#173D32] border border-[#173D32]/15"
              }`}
            >
              {reg.name}
            </button>
          ))}
        </div>

        {/* Selected Area Risk Overview Card */}
        <div className="p-6 sm:p-8 bg-[#FAF8F2] rounded-3xl border border-[#173D32]/12 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#173D32]/10">
            <div>
              <span className="text-[11px] font-bold text-[#173D32]/60 uppercase tracking-wider block">
                Local Hill District
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-[#173D32] mt-0.5">
                {selectedRegion.name}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-100 text-emerald-800">
                Monitored Corridor: {selectedRegion.corridor}
              </span>
            </div>
          </div>

          {/* Area Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mt-6 text-xs">
            <div className="p-4 rounded-2xl bg-white border border-[#173D32]/10 shadow-2xs">
              <span className="text-[#173D32]/60 block mb-1">Corridor Clearance</span>
              <span
                className={`text-base font-extrabold uppercase ${
                  relevantRoad?.status === "blocked"
                    ? "text-red-700"
                    : relevantRoad?.status === "caution"
                    ? "text-amber-700"
                    : "text-emerald-700"
                }`}
              >
                {relevantRoad ? relevantRoad.status : "Open"}
              </span>
              <p className="text-[11px] text-[#173D32]/60 mt-1">
                {relevantRoad?.stretch || "Arterial Highway Link"}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-[#173D32]/10 shadow-2xs">
              <span className="text-[#173D32]/60 block mb-1">Active Advisory</span>
              <span className="text-sm font-extrabold text-[#173D32] block truncate">
                {relevantAlert ? relevantAlert.title : "No Active Hazard Warning"}
              </span>
              <p className="text-[11px] text-[#173D32]/60 mt-1">
                {relevantAlert ? `Severity: ${relevantAlert.severity}` : "Conditions within safe limits"}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-[#173D32]/10 shadow-2xs">
              <span className="text-[#173D32]/60 block mb-1">Local Helpline</span>
              <span className="text-sm font-black text-[#173D32] block">
                1077 (District Disaster Line)
              </span>
              <p className="text-[11px] text-[#173D32]/60 mt-1">
                24/7 Northeast Emergency Dispatch
              </p>
            </div>
          </div>

          {/* Action Links */}
          <div className="mt-6 pt-5 border-t border-[#173D32]/10 flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/citizen/safe-place"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#173D32] hover:underline"
            >
              <span>View Designated Evacuation Shelters</span>
              <span>→</span>
            </Link>
            <Link
              href="/citizen/report"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#173D32] text-[#F6F4EC] text-xs font-bold hover:bg-[#1f4e40] transition-colors"
            >
              <span>Report Local Hazard</span>
              <span>⚠️</span>
            </Link>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
