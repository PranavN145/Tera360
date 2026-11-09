"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import PortalLayout from "@/components/portal/PortalLayout";
import { publicApi } from "@/lib/api";
import { PublicRiskMapItem } from "@/types/public";

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

export default function OfficerMapPage() {
  const [selectedState, setSelectedState] = useState("All States");
  const [corridors, setCorridors] = useState<PublicRiskMapItem[]>([]);
  const [selectedCorridor, setSelectedCorridor] = useState<PublicRiskMapItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        const data = await publicApi.getRiskMap({
          state: selectedState === "All States" ? undefined : selectedState,
        });
        if (mounted) {
          setCorridors(data);
          if (data.length > 0) {
            setSelectedCorridor(data[0]);
          }
        }
      } catch {
        // Non-blocking map telemetry failure
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
  }, [selectedState]);

  return (
    <PortalLayout
      allowedRoles={["officer", "admin"]}
      title="Live Risk Map & GIS Hotspots"
      subtitle="Spatial monitoring of geotechnical cut-slopes, drainage saturation, and highway clearances across the 8 Northeast states."
      headerActions={
        <div className="flex items-center gap-2">
          <Link
            href="/officer/roads"
            className="px-3.5 py-1.5 rounded-full bg-[#173D32]/10 hover:bg-[#173D32]/15 text-[#173D32] text-xs font-bold transition-all"
          >
            Road Clearances →
          </Link>
          <Link
            href="/officer/dashboard"
            className="px-3.5 py-1.5 rounded-full bg-[#173D32] text-[#F6F4EC] text-xs font-bold hover:bg-[#1a4437] transition-all"
          >
            ← Dashboard
          </Link>
        </div>
      }
    >
      {/* State Filter Tabs */}
      <div className="mb-6 flex flex-wrap items-center gap-1.5 bg-[#FAF8F2] border border-[#173D32]/10 rounded-2xl p-2.5 shadow-xs">
        {STATES.map((state) => (
          <button
            key={state}
            type="button"
            onClick={() => setSelectedState(state)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedState === state
                ? "bg-[#173D32] text-[#F6F4EC] shadow-xs"
                : "text-[#173D32]/75 hover:bg-[#173D32]/5"
            }`}
          >
            {state}
          </button>
        ))}
      </div>

      {/* Main Map Workspace: 2-Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Interactive Spatial Radar Canvas (7 Cols) */}
        <div className="lg:col-span-7 bg-[#173D32] text-[#F6F4EC] rounded-3xl p-6 shadow-sm border border-[#173D32]/20 flex flex-col justify-between min-h-[460px] relative overflow-hidden">
          {/* Subtle Grid Lines Overlay */}
          <div className="absolute inset-0 bg-[radial-gradient(#DCE8D4_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />

          {/* Radar Header */}
          <div className="relative z-10 flex items-center justify-between pb-4 border-b border-white/10">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#DCE8D4]">
                GIS Spatial Hotspot Visualizer
              </span>
              <h3 className="text-base font-extrabold text-[#F6F4EC] mt-0.5">
                Northeast Arterial Corridor Grid
              </h3>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Live GIS
            </span>
          </div>

          {/* Spatial Pins Center Area */}
          <div className="relative z-10 my-auto py-8">
            {isLoading && (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-3" />
                <p className="text-xs text-[#DCE8D4]/80">Loading GIS coordinates...</p>
              </div>
            )}

            {!isLoading && corridors.length === 0 && (
              <div className="text-center py-12 text-[#DCE8D4]/70 text-xs">
                <span>No corridors registered for {selectedState}.</span>
              </div>
            )}

            {!isLoading && corridors.length > 0 && (
              <div className="space-y-3">
                {corridors.map((c) => {
                  const isSelected = selectedCorridor?.id === c.id;
                  return (
                    <div
                      key={c.id}
                      onClick={() => setSelectedCorridor(c)}
                      className={`p-4 rounded-2xl transition-all cursor-pointer border ${
                        isSelected
                          ? "bg-[#FAF8F2] text-[#173D32] border-[#D6A65D] shadow-md"
                          : "bg-white/5 hover:bg-white/10 text-white border-white/10"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`w-3 h-3 rounded-full ${
                              c.status === "blocked"
                                ? "bg-red-500"
                                : c.status === "caution"
                                ? "bg-amber-400"
                                : "bg-emerald-400"
                            }`}
                          />
                          <span className="font-black text-sm">
                            {c.code} — {c.name}
                          </span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                            isSelected
                              ? "bg-[#173D32] text-white"
                              : "bg-white/20 text-white"
                          }`}
                        >
                          {c.status}
                        </span>
                      </div>
                      <p className={`text-xs mt-1.5 ${isSelected ? "text-[#173D32]/80" : "text-[#DCE8D4]/80"}`}>
                        {c.stretch} · {c.state}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Radar Footer */}
          <div className="relative z-10 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-[#DCE8D4]/80">
            <span>Projection: WGS84 EPSG:4326</span>
            <span>2dsphere Geospatial Index</span>
          </div>
        </div>

        {/* Right: Selected Corridor Geotechnical Inspection (5 Cols) */}
        <div className="lg:col-span-5 bg-[#FAF8F2] border border-[#173D32]/12 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#173D32]/60 block mb-1">
              Corridor Telemetry
            </span>
            <h3 className="text-xl font-extrabold text-[#173D32]">
              {selectedCorridor?.name || "Select a Corridor"}
            </h3>
            {selectedCorridor && (
              <span className="inline-block mt-1 px-2.5 py-0.5 rounded-md bg-[#173D32] text-[#F6F4EC] text-xs font-black">
                {selectedCorridor.code} · {selectedCorridor.state}
              </span>
            )}

            {selectedCorridor ? (
              <div className="mt-5 space-y-4 text-xs">
                <div className="p-3.5 rounded-xl bg-[#F6F4EC] border border-[#173D32]/10">
                  <span className="text-[#173D32]/60 block font-medium">Stretch & Mile Marker</span>
                  <span className="font-bold text-[#173D32] text-sm mt-0.5 block">
                    {selectedCorridor.stretch}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl bg-[#F6F4EC] border border-[#173D32]/10">
                    <span className="text-[#173D32]/60 block font-medium">Clearance State</span>
                    <span
                      className={`font-black text-sm mt-0.5 block uppercase ${
                        selectedCorridor.status === "blocked"
                          ? "text-red-700"
                          : selectedCorridor.status === "caution"
                          ? "text-amber-700"
                          : "text-emerald-700"
                      }`}
                    >
                      {selectedCorridor.status}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#F6F4EC] border border-[#173D32]/10">
                    <span className="text-[#173D32]/60 block font-medium">Risk Assessment</span>
                    <span className="font-black text-sm mt-0.5 block text-[#173D32]">
                      {selectedCorridor.riskLevel} Risk
                    </span>
                  </div>
                </div>

                {selectedCorridor.coordinatesText && (
                  <div className="p-3.5 rounded-xl bg-[#F6F4EC] border border-[#173D32]/10">
                    <span className="text-[#173D32]/60 block font-medium">GIS Coordinates</span>
                    <span className="font-mono font-bold text-[#173D32] mt-0.5 block">
                      {selectedCorridor.coordinatesText}
                    </span>
                  </div>
                )}

                {selectedCorridor.statusReason && (
                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-950">
                    <span className="font-bold block mb-1">Operational Observation</span>
                    <p className="leading-relaxed">{selectedCorridor.statusReason}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-[#173D32]/60">
                Click on a corridor pin from the radar to inspect live geotechnical status.
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-[#173D32]/10 flex items-center justify-between text-xs">
            <span className="text-[#173D32]/60">
              Last synced: {selectedCorridor ? new Date(selectedCorridor.lastUpdated).toLocaleDateString() : "Live"}
            </span>
            <Link
              href="/officer/alerts"
              className="font-bold text-[#173D32] hover:underline"
            >
              Issue Alert for Corridor →
            </Link>
          </div>
        </div>

      </div>
    </PortalLayout>
  );
}

