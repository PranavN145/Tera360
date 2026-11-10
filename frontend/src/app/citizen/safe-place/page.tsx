"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  MapPin,
  PhoneCall,
  Search,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import PortalLayout from "@/components/portal/PortalLayout";
import PortalMetricGrid from "@/components/portal/PortalMetricGrid";
import PortalFilterBar from "@/components/portal/PortalFilterBar";
import { PortalKpiCard } from "@/components/portal";
import StatusBadge from "@/components/ui/StatusBadge";

const SHELTERS = [
  {
    id: "s1",
    name: "Haflong District Sports Complex Shelter",
    state: "Assam",
    district: "Dima Hasao",
    address: "Upper Haflong Ridge (Elevation 960m)",
    capacityCount: 450,
    capacity: "450 Persons",
    amenities: ["Emergency Power", "Potable Water", "Medical Staging", "Satellite Comms"],
    helpline: "+91 3673 236222",
    status: "Operational",
  },
  {
    id: "s2",
    name: "Kohima Local Ground Community Hall",
    state: "Nagaland",
    district: "Kohima",
    address: "Khuochiezie, Midlane Kohima",
    capacityCount: 600,
    capacity: "600 Persons",
    amenities: ["Food Reserves", "First Aid Kit", "Thermal Blankets"],
    helpline: "+91 370 2290022",
    status: "Operational",
  },
  {
    id: "s3",
    name: "Rangpo Community Relief Shelter",
    state: "Sikkim",
    district: "Pakyong",
    address: "Mining Ground Sector, High Bank",
    capacityCount: 350,
    capacity: "350 Persons",
    amenities: ["Emergency Rations", "Water Tankers", "Paramedic Post"],
    helpline: "+91 3592 202111",
    status: "Operational",
  },
  {
    id: "s4",
    name: "Shillong Civil Defense Evacuation Center",
    state: "Meghalaya",
    district: "East Khasi Hills",
    address: "Laban Sports Club Compound",
    capacityCount: 500,
    capacity: "500 Persons",
    amenities: ["Generator Backup", "Blankets", "Child Care Facility"],
    helpline: "+91 364 2225289",
    status: "Operational",
  },
];

export default function CitizenSafePlacePage() {
  const [filterState, setFilterState] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredShelters = SHELTERS.filter((s) => {
    if (filterState !== "All" && s.state !== filterState) return false;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      s.name.toLowerCase().includes(q) ||
      s.district.toLowerCase().includes(q) ||
      s.state.toLowerCase().includes(q) ||
      s.address.toLowerCase().includes(q)
    );
  });

  const totalCapacity = SHELTERS.reduce((sum, s) => sum + s.capacityCount, 0);

  return (
    <PortalLayout
      allowedRoles={["citizen"]}
      title="Safe Places & Evacuation Shelters"
      subtitle="Geotechnically vetted emergency relief shelters, high-elevation staging points, and community disaster contacts."
      headerActions={
        <div className="flex items-center gap-2">
          <Link
            href="/citizen/my-area"
            className="px-3.5 py-1.5 rounded-full bg-[#173D32]/10 hover:bg-[#173D32]/15 text-[#173D32] text-xs font-bold transition-all inline-flex items-center gap-1.5"
          >
            <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
            <span>My Area Risk</span>
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
      <div className="space-y-6 sm:space-y-8 w-full">
        {/* ── 1. Summary KPI Cards ──────────────────────────────────────── */}
        <PortalMetricGrid columns={4} ariaLabel="Evacuation Shelter Metrics">
          <PortalKpiCard
            id="citizen-shelter-count"
            variant="summary"
            title="Verified Shelters"
            value={SHELTERS.length}
            unit="Active Centers"
            icon={Building2}
            accent="green"
            badge="Vetted Safe"
            badgeTone="green"
            detail="High-ground structures outside landslide runout zones"
          />

          <PortalKpiCard
            id="citizen-shelter-capacity"
            variant="summary"
            title="Total Capacity"
            value={totalCapacity.toLocaleString()}
            unit="Evacuees"
            icon={Users}
            accent="blue"
            badge="Ready Staging"
            badgeTone="blue"
            detail="Combined relief intake across 4 Northeast districts"
          />

          <PortalKpiCard
            id="citizen-shelter-operational"
            variant="summary"
            title="Operational Status"
            value="100%"
            unit="Stocked"
            icon={ShieldCheck}
            accent="green"
            badge="Power & Water"
            badgeTone="green"
            detail="Equipped with backup generators and emergency rations"
          />

          <PortalKpiCard
            id="citizen-shelter-helpline"
            variant="summary"
            title="SDMA Helpline"
            value="1070"
            unit="24×7 Toll-Free"
            icon={PhoneCall}
            accent="amber"
            badge="Control Room"
            badgeTone="amber"
            detail="Direct state disaster response & evacuation dispatch"
          />
        </PortalMetricGrid>

        {/* ── 2. State Filter & Search Bar ──────────────────────────────── */}
        <PortalFilterBar
          left={
            <div className="flex flex-wrap items-center gap-1.5">
              {["All", "Assam", "Nagaland", "Sikkim", "Meghalaya"].map((st) => {
                const isActive = filterState === st;
                return (
                  <button
                    key={st}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => setFilterState(st)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? "bg-[#173D32] text-[#F6F4EC] shadow-2xs"
                        : "text-[#173D32]/80 hover:text-[#173D32] hover:bg-white/70"
                    }`}
                  >
                    {st === "All" ? "All States" : st}
                  </button>
                );
              })}
            </div>
          }
          right={
            <div className="relative w-full sm:w-64">
              <Search
                className="w-3.5 h-3.5 text-[#173D32]/45 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                id="citizen-shelters-search"
                name="citizen-shelters-search"
                type="text"
                aria-label="Search evacuation shelters"
                placeholder="Search shelter, district, address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 pl-9 pr-8 rounded-full bg-white border border-[#173D32]/15 text-xs text-[#173D32] placeholder:text-[#173D32]/45 focus:outline-none focus:ring-1 focus:ring-[#173D32] w-full"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-[#173D32]/50 hover:text-[#173D32] cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          }
        />

        {/* ── 3. Shelters Grid ──────────────────────────────────────────── */}
        {filteredShelters.length === 0 ? (
          <div className="py-12 text-center bg-[#FAF8F2] rounded-3xl border border-[#173D32]/12 text-xs text-[#173D32]/65">
            No evacuation shelters match your filter criteria.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredShelters.map((shelter) => (
              <div
                key={shelter.id}
                className="p-5 sm:p-6 bg-[#FAF8F2] rounded-3xl border border-[#173D32]/12 shadow-xs flex flex-col justify-between"
              >
                <div className="flex items-stretch gap-3.5">
                  <div className="w-1 rounded-full bg-[#16A34A] shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-2.5 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full bg-[#DCE8D4] text-[#173D32] text-[10.5px] font-extrabold uppercase tracking-wider">
                        {shelter.district}, {shelter.state}
                      </span>
                      <StatusBadge
                        status="open"
                        label={shelter.status}
                        size="xs"
                      />
                    </div>

                    <h3 className="text-base font-extrabold text-[#173D32]">
                      {shelter.name}
                    </h3>
                    <p className="text-xs text-[#173D32]/70 mt-1 inline-flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#173D32]/55 shrink-0" aria-hidden="true" />
                      <span>{shelter.address}</span>
                    </p>

                    <div className="mt-4 p-3 rounded-2xl bg-white border border-[#173D32]/10 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[#173D32]/65">Designated Capacity</span>
                        <strong className="text-[#173D32] font-extrabold">
                          {shelter.capacity}
                        </strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[#173D32]/65">Emergency Contact</span>
                        <a
                          href={`tel:${shelter.helpline}`}
                          className="font-mono font-bold text-[#173D32] hover:underline"
                        >
                          {shelter.helpline}
                        </a>
                      </div>
                    </div>

                    <div className="mt-3.5 flex flex-wrap gap-1.5">
                      {shelter.amenities.map((amenity) => (
                        <span
                          key={amenity}
                          className="px-2.5 py-0.5 rounded-full bg-white border border-[#173D32]/10 text-[10px] font-semibold text-[#173D32] inline-flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3 h-3 text-[#1E7A45]" aria-hidden="true" />
                          <span>{amenity}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-[#173D32]/10 flex items-center justify-between gap-3">
                  <span className="text-[11px] font-medium text-[#173D32]/65 inline-flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#1E7A45]" aria-hidden="true" />
                    <span>Vetted for Landslide Safety</span>
                  </span>
                  <a
                    href={`tel:${shelter.helpline}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#173D32] text-[#F6F4EC] text-xs font-bold hover:bg-[#1a4437] transition-colors shadow-2xs"
                  >
                    <PhoneCall className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Call Shelter</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
