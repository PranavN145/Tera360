"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  MapPin,
  Road,
} from "lucide-react";
import PortalLayout from "@/components/portal/PortalLayout";
import PortalFilterBar from "@/components/portal/PortalFilterBar";
import PortalSectionCard from "@/components/portal/PortalSectionCard";
import StatusBadge from "@/components/ui/StatusBadge";
import RiskMap from "@/components/RiskMap";
import { publicApi } from "@/lib/api";
import { PublicRoadStatusItem } from "@/types/public";

const SECTORS = [
  "All Sectors",
  "Assam (Borail)",
  "Nagaland (Kohima)",
  "Sikkim (Teesta)",
];

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
          setError(
            err instanceof Error ? err.message : "Failed to load sector telemetry"
          );
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
    if (selectedSector === "Assam (Borail)")
      return r.state.toLowerCase() === "assam";
    if (selectedSector === "Nagaland (Kohima)")
      return r.state.toLowerCase() === "nagaland";
    if (selectedSector === "Sikkim (Teesta)")
      return r.state.toLowerCase() === "sikkim";
    return true;
  });

  return (
    <PortalLayout
      allowedRoles={["field_officer"]}
      title="Assigned Area Map & Field Telemetry"
      subtitle="Geotechnical sensor stations, cut-slope moisture monitoring, and incident telemetry for ground response teams."
      headerActions={
        <div className="flex items-center gap-2">
          <Link
            href="/field/roads"
            className="px-3.5 py-1.5 rounded-full bg-[#173D32]/10 hover:bg-[#173D32]/15 text-[#173D32] text-xs font-bold transition-all inline-flex items-center gap-1.5"
          >
            <Road className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Road Status</span>
          </Link>
          <Link
            href="/field/tasks"
            className="px-3.5 py-1.5 rounded-full bg-[#173D32] text-[#F6F4EC] text-xs font-bold hover:bg-[#1a4437] transition-all inline-flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            <span>My Tasks</span>
          </Link>
        </div>
      }
    >
      <div className="space-y-5 sm:space-y-6 w-full">
        {/* Sector Quick Switcher */}
        <PortalFilterBar
          className="px-3 py-2.5 sm:px-4 sm:py-3"
          left={
            <nav
              aria-label="Filter assigned sectors"
              className="flex items-center gap-1.5 overflow-x-auto max-w-full"
            >
              {SECTORS.map((sector) => {
                const isActive = selectedSector === sector;
                return (
                  <button
                    key={sector}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => setSelectedSector(sector)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap inline-flex items-center gap-1.5 shrink-0 ${
                      isActive
                        ? "bg-[#173D32] text-[#F6F4EC] shadow-xs"
                        : "text-[#173D32]/80 hover:text-[#173D32] hover:bg-[#173D32]/6"
                    }`}
                  >
                    {isActive && (
                      <MapPin className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    )}
                    <span>{sector}</span>
                  </button>
                );
              })}
            </nav>
          }
          right={
            <span className="text-xs font-medium text-[#173D32]/70">
              Showing{" "}
              <strong className="font-extrabold text-[#173D32]">
                {filteredRoads.length}
              </strong>{" "}
              {filteredRoads.length === 1 ? "corridor" : "corridors"}
            </span>
          }
        />

        {/* GIS Map Visualizer Canvas */}
        <PortalSectionCard
          title="Northeast Operational Field Grid"
          subtitle="Live Sensor Telemetry"
          badge={
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
              <span>Live Feed</span>
            </span>
          }
          actions={
            <Link
              href="/risk-map"
              className="inline-flex items-center gap-1 text-xs font-bold text-[#173D32] hover:underline"
            >
              <span>Full GIS Map</span>
              <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
          }
        >
          {/* Standardized 3D Mountain Terrain Visualizer */}
          <div className="mb-6 w-full h-[380px] sm:h-[440px] rounded-2xl overflow-hidden border border-[#173D32]/15 bg-[#EEF4EB] shadow-xs">
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
          <div className="space-y-3">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((n) => (
                  <div
                    key={n}
                    className="h-44 rounded-2xl bg-white border border-[#173D32]/10 animate-pulse"
                  />
                ))}
              </div>
            ) : error ? (
              <div className="p-4 rounded-2xl bg-red-50 text-red-900 text-xs border border-red-200 flex items-center gap-2 font-semibold">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" aria-hidden="true" />
                <span>{error}</span>
              </div>
            ) : filteredRoads.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#173D32]/65 bg-white rounded-2xl border border-[#173D32]/10">
                No active hazard corridors recorded for this sector.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredRoads.map((road) => (
                  <div
                    key={road.id || road.name}
                    className="p-4 rounded-2xl bg-white border border-[#173D32]/12 shadow-[0_2px_8px_-2px_rgba(23,61,50,0.04)] flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <span className="px-2.5 py-0.5 rounded-full bg-[#173D32] text-[10px] font-extrabold text-[#F6F4EC] tracking-wide">
                          {road.code || road.name.split(" ")[0]}
                        </span>
                        <StatusBadge
                          status={road.status}
                          size="xs"
                          pulse={road.status === "blocked"}
                        />
                      </div>
                      <h4 className="text-sm font-extrabold text-[#173D32] leading-snug line-clamp-1">
                        {road.name}
                      </h4>
                      <p className="text-xs text-[#173D32]/70 mt-1">
                        {road.stretch} ({road.state})
                      </p>
                      {road.statusReason && (
                        <p className="text-xs text-[#173D32]/85 mt-2.5 bg-[#FAF8F2] p-2.5 rounded-xl border border-[#173D32]/8 line-clamp-2">
                          {road.statusReason}
                        </p>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#173D32]/10 flex items-center justify-between text-[11px] text-[#173D32]/65">
                      <span>
                        Risk:{" "}
                        <strong className="text-[#173D32]">
                          {road.riskLevel}
                        </strong>
                      </span>
                      <Link
                        href={`/field/roads?corridor=${encodeURIComponent(
                          road.code || road.name
                        )}`}
                        className="font-bold text-[#173D32] hover:underline inline-flex items-center gap-1"
                      >
                        <span>Inspect</span>
                        <ArrowRight className="w-3 h-3" aria-hidden="true" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </PortalSectionCard>
      </div>
    </PortalLayout>
  );
}
