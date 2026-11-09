"use client";

import React, { useState, useEffect } from "react";
import PortalLayout from "@/components/portal/PortalLayout";
import { publicApi } from "@/lib/api";
import { PublicRoadStatusItem } from "@/types/public";

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

export default function FieldRoadsPage() {
  const [selectedState, setSelectedState] = useState("All States");
  const [roads, setRoads] = useState<PublicRoadStatusItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function loadRoads() {
      try {
        const data = await publicApi.getRoadStatus({
          state: selectedState === "All States" ? undefined : selectedState,
        });
        if (mounted) {
          setRoads(data);
          setError(null);
        }
      } catch (err: unknown) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Failed to load highway road data");
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }
    void loadRoads();
    return () => {
      mounted = false;
    };
  }, [selectedState]);

  return (
    <PortalLayout
      allowedRoles={["field_officer"]}
      title="Road Status & Highway Corridors"
      subtitle="Real-time clearance tracking, landslide blockages, and regulated pilot convoys for field operations."
    >
      <div className="space-y-6">
        {/* State filter buttons */}
        <div className="flex flex-wrap items-center gap-2 pb-2">
          {STATES.map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setSelectedState(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedState === st
                  ? "bg-[#173D32] text-[#F6F4EC] shadow-2xs"
                  : "bg-white/80 hover:bg-white text-[#173D32] border border-[#173D32]/15"
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Highway Corridors List */}
        <div className="p-6 bg-[#FAF8F2] rounded-2xl border border-[#173D32]/12 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-[#173D32]/10 mb-4">
            <h3 className="text-base font-extrabold text-[#173D32]">
              Monitored Corridors ({roads.length})
            </h3>
            <span className="text-xs text-[#173D32]/60">
              Filtered by: <strong>{selectedState}</strong>
            </span>
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-xs text-[#173D32]/60">
              Loading road statuses...
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-red-50 text-red-800 text-xs border border-red-200">
              {error}
            </div>
          ) : roads.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#173D32]/60">
              No road corridor records found for this state.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {roads.map((road) => (
                <div
                  key={road.id || road.name}
                  className="p-5 rounded-2xl bg-white border border-[#173D32]/12 shadow-2xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="px-2.5 py-1 rounded-md bg-[#173D32]/10 text-xs font-black text-[#173D32]">
                        {road.code || road.name.split(" ")[0]}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${
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

                    <h4 className="text-sm font-extrabold text-[#173D32]">
                      {road.name}
                    </h4>
                    <p className="text-xs text-[#173D32]/70 mt-1">
                      {road.stretch} ({road.state})
                    </p>

                    {road.statusReason && (
                      <div className="mt-3 p-3 rounded-xl bg-[#FAF8F2] border border-[#173D32]/8 text-xs text-[#173D32]/85">
                        <span className="font-bold text-[#173D32] block mb-0.5">Field Status:</span>
                        {road.statusReason}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#173D32]/10 flex items-center justify-between text-xs text-[#173D32]/60">
                    <span>Assessed Risk: <strong className="text-[#173D32]">{road.riskLevel}</strong></span>
                    <span>Last updated: {new Date(road.lastUpdated).toLocaleDateString()}</span>
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
