"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import PortalLayout from "@/components/portal/PortalLayout";
import RiskMap from "@/components/RiskMap";
import { publicApi } from "@/lib/api";
import { PublicRoadStatusItem } from "@/types/public";

const SECTORS = ["All Sectors", "Assam (Borail)", "Nagaland (Kohima)", "Sikkim (Teesta)"];

export default function FieldMapPage() {
  const [selectedSector, setSelectedSector] = useState("All Sectors");
  const [roads, setRoads] = useState<PublicRoadStatusItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function loadCorridors() {
      try {
        const data = await publicApi.getRoadStatus({});
        if (mounted) {
          setRoads(data);
          setError(null);
        }
      } catch (err: unknown) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Failed to load sector telemetry");
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }
    void loadCorridors();
    return () => {
      mounted = false;
    };
  }, []);

  const filteredRoads = roads.filter((r) => {
    if (selectedSector === "Assam (Borail)") return r.state.toLowerCase() === "assam";
    if (selectedSector === "Nagaland (Kohima)") return r.state.toLowerCase() === "nagaland";
    if (selectedSector === "Sikkim (Teesta)") return r.state.toLowerCase() === "sikkim";
    return true;
  });

  return (
    <PortalLayout
      allowedRoles={["field_officer"]}
      title="Assigned Area Map & Field Telemetry"
      subtitle="Geotechnical sensor stations, cut-slope moisture monitoring, and incident telemetry for ground response teams."
    >
      <div className="space-y-6">
        {/* Sector Quick Switcher */}
        <div className="flex flex-wrap items-center gap-2 pb-2">
          {SECTORS.map((sector) => (
            <button
              key={sector}
              type="button"
              onClick={() => setSelectedSector(sector)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedSector === sector
                  ? "bg-[#173D32] text-[#F6F4EC] shadow-2xs"
                  : "bg-white/80 hover:bg-white text-[#173D32] border border-[#173D32]/15"
              }`}
            >
              {sector}
            </button>
          ))}
        </div>

        {/* GIS Map Visualizer Canvas */}
        <div className="p-6 bg-[#FAF8F2] rounded-2xl border border-[#173D32]/12 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#173D32]/10">
            <div>
              <span className="text-[11px] font-bold text-[#173D32]/60 uppercase tracking-wider block">
                Live Sensor Telemetry
              </span>
              <h3 className="text-base font-extrabold text-[#173D32] mt-0.5">
                Northeast Operational Field Grid
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                Live Feed
              </span>
              <Link
                href="/risk-map"
                className="inline-flex items-center gap-1 text-xs font-bold text-[#173D32] hover:underline"
              >
                Full GIS Map ↗
              </Link>
            </div>
          </div>

          {/* Standardized 3D Mountain Terrain Visualizer */}
          <div className="mt-5 mb-6 w-full h-[380px] sm:h-[440px] rounded-2xl overflow-hidden border border-[#173D32]/15 bg-[#EEF4EB] shadow-xs">
            <RiskMap
              variant="dashboard"
              selectedState={
                selectedSector.includes("Nagaland")
                  ? "Nagaland"
                  : selectedSector.includes("Assam")
                  ? "Assam"
                  : selectedSector.includes("Sikkim")
                  ? "Sikkim"
                  : undefined
              }
              className="w-full h-full"
            />
          </div>

          {/* Monitored Corridors & Geotechnical Stations */}
          <div className="mt-5 space-y-3">
            {isLoading ? (
              <div className="py-12 text-center text-xs text-[#173D32]/60">
                Loading assigned area telemetry...
              </div>
            ) : error ? (
              <div className="p-4 rounded-xl bg-red-50 text-red-800 text-xs border border-red-200">
                {error}
              </div>
            ) : filteredRoads.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#173D32]/60">
                No active hazard corridors recorded for this sector.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredRoads.map((road) => (
                  <div
                    key={road.id || road.name}
                    className="p-4 rounded-xl bg-white border border-[#173D32]/12 shadow-2xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="px-2 py-0.5 rounded-md bg-[#173D32]/10 text-[10px] font-black text-[#173D32]">
                          {road.code || road.name.split(" ")[0]}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wide ${
                            road.status === "blocked"
                              ? "bg-red-100 text-red-800"
                              : road.status === "caution"
                              ? "bg-amber-100 text-amber-900"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {road.status}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-[#173D32] leading-snug line-clamp-1">
                        {road.name}
                      </h4>
                      <p className="text-xs text-[#173D32]/70 mt-1">
                        {road.stretch} ({road.state})
                      </p>
                      {road.statusReason && (
                        <p className="text-xs text-[#173D32]/85 mt-2 bg-[#FAF8F2] p-2 rounded-lg border border-[#173D32]/8 line-clamp-2">
                          {road.statusReason}
                        </p>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#173D32]/10 flex items-center justify-between text-[11px] text-[#173D32]/60">
                      <span>Risk: <strong className="text-[#173D32]">{road.riskLevel}</strong></span>
                      <Link
                        href={`/field/roads?corridor=${encodeURIComponent(road.name)}`}
                        className="font-bold text-[#173D32] hover:underline"
                      >
                        Inspect →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
