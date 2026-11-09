"use client";

import React, { useState } from "react";
import Link from "next/link";
import PortalLayout from "@/components/portal/PortalLayout";

interface VillageItem {
  id: string;
  name: string;
  district: string;
  state: string;
  currentRiskLevel: "Critical" | "High" | "Moderate" | "Low";
  populationEstimate: number;
  contactPerson: {
    name: string;
    phone: string;
    designation: string;
  };
  safeShelter: {
    name: string;
    capacity: number;
    distanceKm: number;
  };
  lastRainfall: string;
}

const DEMO_VILLAGES: VillageItem[] = [
  {
    id: "VIL-01",
    name: "Phesama",
    district: "Kohima",
    state: "Nagaland",
    currentRiskLevel: "Critical",
    populationEstimate: 3400,
    contactPerson: {
      name: "Toshitsungba Jamir",
      phone: "+91 98621 11204",
      designation: "Village Disaster Committee Head",
    },
    safeShelter: {
      name: "Phesama Community Hall (High Ground)",
      capacity: 450,
      distanceKm: 0.8,
    },
    lastRainfall: "164 mm / 24h",
  },
  {
    id: "VIL-02",
    name: "Jatinga",
    district: "Dima Hasao",
    state: "Assam",
    currentRiskLevel: "Moderate",
    populationEstimate: 2100,
    contactPerson: {
      name: "Debojit Hojai",
      phone: "+91 94350 78201",
      designation: "Gaon Burah (Village Elder)",
    },
    safeShelter: {
      name: "Jatinga High Secondary School Shelter",
      capacity: 320,
      distanceKm: 1.2,
    },
    lastRainfall: "62 mm / 24h",
  },
  {
    id: "VIL-03",
    name: "Melli Bazaar",
    district: "South Sikkim",
    state: "Sikkim",
    currentRiskLevel: "High",
    populationEstimate: 4200,
    contactPerson: {
      name: "Pemba Bhutia",
      phone: "+91 97330 45109",
      designation: "Panchayat Disaster Coordinator",
    },
    safeShelter: {
      name: "Melli Indoor Sports Complex",
      capacity: 600,
      distanceKm: 1.5,
    },
    lastRainfall: "112 mm / 24h",
  },
  {
    id: "VIL-04",
    name: "Cherrapunji (Sohra Outskirts)",
    district: "East Khasi Hills",
    state: "Meghalaya",
    currentRiskLevel: "Moderate",
    populationEstimate: 5100,
    contactPerson: {
      name: "Bah Kynmaw Lyndem",
      phone: "+91 98560 33219",
      designation: "Headman (Rangbah Shnong)",
    },
    safeShelter: {
      name: "Sohra Presbyterian Higher Secondary Hall",
      capacity: 500,
      distanceKm: 0.6,
    },
    lastRainfall: "84 mm / 24h",
  },
];

export default function OfficerVillagesPage() {
  const [selectedState, setSelectedState] = useState("All");
  const [selectedRisk, setSelectedRisk] = useState("All");
  const [search, setSearch] = useState("");

  const filtered = DEMO_VILLAGES.filter((v) => {
    const matchesState = selectedState === "All" || v.state === selectedState;
    const matchesRisk = selectedRisk === "All" || v.currentRiskLevel === selectedRisk;
    const q = search.toLowerCase().trim();
    const matchesSearch =
      !q ||
      v.name.toLowerCase().includes(q) ||
      v.district.toLowerCase().includes(q) ||
      v.state.toLowerCase().includes(q) ||
      v.contactPerson.name.toLowerCase().includes(q);
    return matchesState && matchesRisk && matchesSearch;
  });

  return (
    <PortalLayout
      allowedRoles={["officer", "admin"]}
      title="Settlement Vulnerability & Shelter Directory"
      subtitle="Supervise high-risk village boundaries, emergency contact persons, evacuation centers, and local population readiness."
      headerActions={
        <div className="flex items-center gap-2">
          <Link
            href="/officer/dashboard"
            className="px-3.5 py-1.5 rounded-full bg-[#173D32] text-[#F6F4EC] text-xs font-bold hover:bg-[#1a4437] transition-all"
          >
            ← Dashboard
          </Link>
        </div>
      }
    >
      {/* Filter and Search Bar */}
      <div className="mb-6 bg-[#FAF8F2] border border-[#173D32]/12 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
            className="h-9 px-3 rounded-xl bg-[#F6F4EC] border border-[#173D32]/20 text-xs font-bold text-[#173D32] focus:outline-none cursor-pointer"
          >
            <option value="All">All States</option>
            <option value="Nagaland">Nagaland</option>
            <option value="Assam">Assam</option>
            <option value="Sikkim">Sikkim</option>
            <option value="Meghalaya">Meghalaya</option>
          </select>

          <select
            value={selectedRisk}
            onChange={(e) => setSelectedRisk(e.target.value)}
            className="h-9 px-3 rounded-xl bg-[#F6F4EC] border border-[#173D32]/20 text-xs font-bold text-[#173D32] focus:outline-none cursor-pointer"
          >
            <option value="All">All Risk Levels</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Moderate">Moderate</option>
            <option value="Low">Low</option>
          </select>
        </div>

        <input
          type="text"
          placeholder="Search village, contact person, district..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 px-3.5 rounded-xl bg-[#F6F4EC] border border-[#173D32]/20 text-xs text-[#173D32] placeholder:text-[#173D32]/50 focus:outline-none focus:ring-1 focus:ring-[#173D32] w-full sm:w-64"
        />
      </div>

      {/* Villages Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {filtered.map((village) => (
          <div
            key={village.id}
            className="p-5 sm:p-6 rounded-2xl bg-[#FAF8F2] border border-[#173D32]/12 hover:border-[#173D32]/25 shadow-xs transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <div>
                  <h3 className="text-base sm:text-lg font-extrabold text-[#173D32]">
                    {village.name}
                  </h3>
                  <span className="text-xs font-medium text-[#173D32]/70">
                    {village.district} District · {village.state}
                  </span>
                </div>

                <span
                  className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                    village.currentRiskLevel === "Critical"
                      ? "bg-red-100 text-red-800 border border-red-200"
                      : village.currentRiskLevel === "High"
                      ? "bg-amber-100 text-amber-800 border border-amber-200"
                      : "bg-yellow-100 text-yellow-800 border border-yellow-200"
                  }`}
                >
                  {village.currentRiskLevel} Risk
                </span>
              </div>

              {/* Stats Bar */}
              <div className="my-3 py-2 border-y border-[#173D32]/8 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[#173D32]/60 block font-medium">Population Est.</span>
                  <span className="font-extrabold text-[#173D32] block">
                    {village.populationEstimate.toLocaleString()} residents
                  </span>
                </div>
                <div>
                  <span className="text-[#173D32]/60 block font-medium">Rainfall 24h</span>
                  <span className="font-extrabold text-[#173D32] block">
                    {village.lastRainfall}
                  </span>
                </div>
              </div>

              {/* Designated Safe Shelter */}
              <div className="p-3 rounded-xl bg-[#F6F4EC] border border-[#173D32]/10 text-xs mb-3">
                <span className="text-[#173D32]/60 block font-medium">Designated Safe Evacuation Shelter:</span>
                <span className="font-bold text-[#173D32] block mt-0.5">
                  🏫 {village.safeShelter.name}
                </span>
                <span className="text-[11px] text-[#173D32]/70 block mt-0.5">
                  Capacity: {village.safeShelter.capacity} people · Distance: {village.safeShelter.distanceKm} km
                </span>
              </div>

              {/* Village Contact Person */}
              <div className="p-3 rounded-xl bg-[#173D32]/5 border border-[#173D32]/10 text-xs">
                <span className="text-[#173D32]/60 block font-medium">Village Point of Contact:</span>
                <div className="flex items-center justify-between mt-1">
                  <div>
                    <span className="font-bold text-[#173D32] block">{village.contactPerson.name}</span>
                    <span className="text-[10px] text-[#173D32]/70 block">{village.contactPerson.designation}</span>
                  </div>
                  <a
                    href={`tel:${village.contactPerson.phone}`}
                    className="px-2.5 py-1 rounded-lg bg-[#173D32] text-[#F6F4EC] text-[11px] font-bold hover:bg-[#1a4437] transition-colors"
                  >
                    📞 Call
                  </a>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#173D32]/8 flex items-center justify-between text-xs">
              <span className="text-[11px] text-[#173D32]/60">ID: {village.id}</span>
              <Link
                href="/officer/alerts"
                className="font-bold text-[#173D32] hover:underline"
              >
                Send Village Advisory →
              </Link>
            </div>
          </div>
        ))}
      </div>
    </PortalLayout>
  );
}

