"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Bell,
  MapPin,
  PhoneCall,
  Road,
  ShieldCheck,
} from "lucide-react";
import PortalLayout from "@/components/portal/PortalLayout";
import PortalFilterBar from "@/components/portal/PortalFilterBar";
import PortalSectionCard from "@/components/portal/PortalSectionCard";
import StatusBadge from "@/components/ui/StatusBadge";
import RiskMap from "@/components/RiskMap";
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
      headerActions={
        <div className="flex items-center gap-2">
          <Link
            href="/citizen/safe-place"
            className="px-3.5 py-1.5 rounded-full bg-[#173D32]/10 hover:bg-[#173D32]/15 text-[#173D32] text-xs font-bold transition-all inline-flex items-center gap-1.5"
          >
            <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Safe Places</span>
          </Link>
          <Link
            href="/citizen/home"
            className="px-3.5 py-1.5 rounded-full bg-[#173D32] text-[#F6F4EC] text-xs font-bold hover:bg-[#1a4437] transition-all inline-flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Home</span>
          </Link>
        </div>
      }
    >
      <div className="space-y-5 sm:space-y-6 w-full">
        {/* Region selector pill bar */}
        <PortalFilterBar
          className="px-3 py-2.5 sm:px-4 sm:py-3"
          left={
            <nav
              aria-label="Select local hill region"
              className="flex flex-wrap items-center gap-1.5"
            >
              {REGIONS.map((reg) => {
                const isActive = selectedRegion.id === reg.id;
                return (
                  <button
                    key={reg.id}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => setSelectedRegion(reg)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                      isActive
                        ? "bg-[#173D32] text-[#F6F4EC] shadow-xs"
                        : "text-[#173D32]/80 hover:text-[#173D32] hover:bg-[#173D32]/6"
                    }`}
                  >
                    {isActive && (
                      <MapPin className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    )}
                    <span>{reg.name}</span>
                  </button>
                );
              })}
            </nav>
          }
        />

        {/* Selected Area Risk Overview Card */}
        <PortalSectionCard
          title={selectedRegion.name}
          subtitle="Local Hill District"
          badge={
            <span className="px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-[#DCE8D4] text-[#173D32]">
              Monitored Corridor: {selectedRegion.corridor}
            </span>
          }
          padding="lg"
        >
          {/* Standardized 3D Topographic Terrain View */}
          <div className="mb-6 w-full h-[300px] sm:h-[360px] rounded-2xl overflow-hidden border border-[#173D32]/15 bg-[#EEF4EB] shadow-xs">
            <RiskMap
              variant="mini"
              selectedState={
                selectedRegion.id === "nagaland"
                  ? "Nagaland"
                  : selectedRegion.id === "assam"
                  ? "Assam"
                  : selectedRegion.id === "sikkim"
                  ? "Sikkim"
                  : selectedRegion.id === "meghalaya"
                  ? "Meghalaya"
                  : undefined
              }
              showPlayback={false}
              showControls={false}
              className="w-full h-full"
            />
          </div>

          {/* Area Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 text-xs">
            <div className="p-4 rounded-2xl bg-white border border-[#173D32]/12 shadow-[0_2px_8px_-2px_rgba(23,61,50,0.04)] flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#173D32]/55 inline-flex items-center gap-1.5 mb-2">
                  <Road className="w-3.5 h-3.5 text-[#173D32]/65" aria-hidden="true" />
                  <span>Corridor Clearance</span>
                </span>
                <div>
                  {isLoading ? (
                    <div className="h-6 w-28 rounded-full bg-[#173D32]/10 animate-pulse" />
                  ) : (
                    <StatusBadge
                      status={relevantRoad ? relevantRoad.status : "open"}
                      size="sm"
                      pulse={relevantRoad?.status === "blocked"}
                    />
                  )}
                </div>
              </div>
              <p className="text-[11px] text-[#173D32]/65 mt-2.5 leading-relaxed">
                {relevantRoad?.stretch || "Arterial Highway Link"}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-[#173D32]/12 shadow-[0_2px_8px_-2px_rgba(23,61,50,0.04)] flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#173D32]/55 inline-flex items-center gap-1.5 mb-2">
                  <Bell className="w-3.5 h-3.5 text-[#173D32]/65" aria-hidden="true" />
                  <span>Active Advisory</span>
                </span>
                {isLoading ? (
                  <div className="h-5 w-40 rounded bg-[#173D32]/10 animate-pulse" />
                ) : (
                  <span className="text-sm font-extrabold text-[#173D32] block line-clamp-2">
                    {relevantAlert ? relevantAlert.title : "No Active Hazard Warning"}
                  </span>
                )}
              </div>
              <div className="mt-2.5 flex items-center gap-2">
                {relevantAlert ? (
                  <StatusBadge status={relevantAlert.severity} size="xs" />
                ) : (
                  <span className="text-[11px] text-[#173D32]/65">
                    Conditions within safe limits
                  </span>
                )}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-[#173D32]/12 shadow-[0_2px_8px_-2px_rgba(23,61,50,0.04)] flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#173D32]/55 inline-flex items-center gap-1.5 mb-2">
                  <PhoneCall className="w-3.5 h-3.5 text-[#1E7A45]" aria-hidden="true" />
                  <span>Local Helpline</span>
                </span>
                <a
                  href="tel:1077"
                  className="text-sm font-black text-[#173D32] hover:underline block"
                >
                  1077 (District Disaster Line)
                </a>
              </div>
              <p className="text-[11px] text-[#173D32]/65 mt-2.5">
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
              <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
              <span>View Designated Evacuation Shelters</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
            <Link
              href="/citizen/report"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#173D32] text-[#F6F4EC] text-xs font-bold hover:bg-[#1a4437] transition-all shadow-2xs"
            >
              <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Report Local Hazard</span>
            </Link>
          </div>
        </PortalSectionCard>
      </div>
    </PortalLayout>
  );
}
