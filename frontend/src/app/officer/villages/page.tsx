"use client";

import React, { useState } from "react";
import Link from "next/link";
import PortalLayout from "@/components/portal/PortalLayout";
import { DEMO_VILLAGES } from "@/data/villages";

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

