"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import PortalLayout from "@/components/portal/PortalLayout";
import RiskMap from "@/components/RiskMap";
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
        
        {/* Left: Interactive 3D GIS Mapbox Workstation (7 Cols) */}
        <div className="lg:col-span-7 rounded-3xl overflow-hidden shadow-sm border border-[#173D32]/20 min-h-[520px] lg:min-h-[580px] relative bg-[#EEF4EB]">
          <RiskMap
            variant="dashboard"
            selectedState={selectedState}
            className="w-full h-full min-h-[520px]"
            onSelectCorridor={(corridorId) => {
              const matched = corridors.find(
                (c) =>
                  c.code.toLowerCase().includes(corridorId.toLowerCase()) ||
                  corridorId.toLowerCase().includes(c.code.toLowerCase())
              );
              if (matched) {
                setSelectedCorridor(matched);
              }
            }}
          />
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

