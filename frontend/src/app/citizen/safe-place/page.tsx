"use client";

import React, { useState } from "react";
import PortalLayout from "@/components/portal/PortalLayout";

const SHELTERS = [
  {
    id: "s1",
    name: "Haflong District Sports Complex Shelter",
    state: "Assam",
    district: "Dima Hasao",
    address: "Upper Haflong Ridge (Elevation 960m)",
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
    capacity: "500 Persons",
    amenities: ["Generator Backup", "Blankets", "Child Care Facility"],
    helpline: "+91 364 2225289",
    status: "Operational",
  },
];

export default function CitizenSafePlacePage() {
  const [filterState, setFilterState] = useState("All");

  const filteredShelters =
    filterState === "All"
      ? SHELTERS
      : SHELTERS.filter((s) => s.state === filterState);

  return (
    <PortalLayout
      allowedRoles={["citizen"]}
      title="Safe Places & Evacuation Shelters"
      subtitle="Geotechnically vetted emergency relief shelters, high-elevation staging points, and community disaster contacts."
    >
      <div className="space-y-6">
        {/* State filter buttons */}
        <div className="flex flex-wrap items-center gap-2 pb-2">
          {["All", "Assam", "Nagaland", "Sikkim", "Meghalaya"].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setFilterState(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterState === st
                  ? "bg-[#173D32] text-[#F6F4EC] shadow-2xs"
                  : "bg-white/80 hover:bg-white text-[#173D32] border border-[#173D32]/15"
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Shelters Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredShelters.map((shelter) => (
            <div
              key={shelter.id}
              className="p-6 bg-[#FAF8F2] rounded-3xl border border-[#173D32]/12 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-[#DCE8D4] text-[#173D32] text-xs font-black uppercase tracking-wider">
                    {shelter.district}, {shelter.state}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                    ✓ {shelter.status}
                  </span>
                </div>

                <h3 className="text-base font-extrabold text-[#173D32] mt-1">
                  {shelter.name}
                </h3>
                <p className="text-xs text-[#173D32]/70 mt-1">
                  📍 {shelter.address}
                </p>

                <div className="mt-4 pt-3 border-t border-[#173D32]/10 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[#173D32]/60">Designated Capacity:</span>
                    <strong className="text-[#173D32]">{shelter.capacity}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#173D32]/60">Emergency Contact:</span>
                    <a
                      href={`tel:${shelter.helpline}`}
                      className="font-bold text-[#173D32] hover:underline"
                    >
                      {shelter.helpline}
                    </a>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-1.5">
                  {shelter.amenities.map((amenity) => (
                    <span
                      key={amenity}
                      className="px-2 py-0.5 rounded-md bg-white border border-[#173D32]/10 text-[10px] font-semibold text-[#173D32]"
                    >
                      • {amenity}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-[#173D32]/10 flex items-center justify-between">
                <span className="text-[11px] text-[#173D32]/60">Vetted for Landslide Safety</span>
                <a
                  href={`tel:${shelter.helpline}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#173D32] text-[#F6F4EC] text-xs font-bold hover:bg-[#1f4e40] transition-colors"
                >
                  Call Shelter 📞
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PortalLayout>
  );
}

