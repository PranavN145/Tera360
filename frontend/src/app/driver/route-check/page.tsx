"use client";

import React, { useState } from "react";
import {
  AlertTriangle,
  Ambulance,
  ArrowLeftRight,
  Ban,
  Bell,
  Car,
  CheckCircle2,
  CloudRain,
  Download,
  Droplets,
  MapPin,
  Navigation,
  ShieldCheck,
  Truck,
  Zap,
} from "lucide-react";
import PortalLayout from "@/components/portal/PortalLayout";
import PortalSectionCard from "@/components/portal/PortalSectionCard";
import StatusBadge from "@/components/ui/StatusBadge";
import RiskMap from "@/components/RiskMap";
import { useApp } from "@/context/AppContext";

interface RoutePreset {
  id: string;
  name: string;
  highway: string;
  state: string;
  origin: string;
  destination: string;
  distance: string;
  normalDuration: string;
  currentDuration: string;
  status: "blocked" | "caution" | "open";
  statusText: string;
  blockageLocation: string;
  blockageReason: string;
  rainfall: string;
  soilMoisture: string;
  recommendedDetour: {
    name: string;
    extraDistance: string;
    extraTime: string;
    vehicleSuitability: string;
    description: string;
  };
  center: [number, number];
  zoom: number;
}

const ROUTE_PRESETS: RoutePreset[] = [
  {
    id: "nh29",
    name: "Dimapur – Kohima – Mao Corridor",
    highway: "NH-29",
    state: "Nagaland",
    origin: "Dimapur City Junction",
    destination: "Kohima Secretariat",
    distance: "74 km",
    normalDuration: "2h 10m",
    currentDuration: "3h 55m (+1h 45m delay)",
    status: "blocked",
    statusText: "CORRIDOR IMPASSABLE (ACTIVE DEBRIS FLOW)",
    blockageLocation: "KM 44 Dzüdza Bridge & Pherima Slide Sector",
    blockageReason:
      "Torrential overnight precipitation triggered deep rotational slope collapse. 60m of roadbed buried under mud and rock debris. Border Roads Organisation (BRO) clearing active.",
    rainfall: "84 mm/h (Extreme Saturation)",
    soilMoisture: "89% (Critical Hydrostatic Load)",
    recommendedDetour: {
      name: "Peducha – Tsiesema Ridge Alternate Bypass",
      extraDistance: "+14.2 km",
      extraTime: "+38 mins",
      vehicleSuitability: "LMV & Emergency Responders Only (No Heavy Trucks)",
      description:
        "Divert via Peducha entry toward Tsiesema Ridge Road. Narrow mountain pavement with steep switchbacks; maintain low gear and headlights on.",
    },
    center: [94.02, 25.72],
    zoom: 13.5,
  },
  {
    id: "nh10",
    name: "Siliguri – Gangtok Teesta Highway",
    highway: "NH-10",
    state: "Sikkim",
    origin: "Siliguri Junction",
    destination: "Gangtok Zero Point",
    distance: "114 km",
    normalDuration: "3h 40m",
    currentDuration: "4h 30m (+50m delay)",
    status: "caution",
    statusText: "ONE-WAY RESTRICTED (RIVERBANK SCOUR)",
    blockageLocation: "29th Mile & Teesta Low Dam Sector",
    blockageReason:
      "High river discharge eroding road toe. Single-lane convoy pilot operation active under Sikkim Police supervision.",
    rainfall: "58 mm/h (Heavy Rainfall)",
    soilMoisture: "76% (High Saturation)",
    recommendedDetour: {
      name: "Sevoke – Mungpoo – Reshi Route (Bypass NH-10)",
      extraDistance: "+22.5 km",
      extraTime: "+1h 10m",
      vehicleSuitability: "All Passenger Vehicles & SUVs",
      description:
        "Higher elevation mountain ridge road avoiding river floor. Open for two-way transit with police checkpoints at Mungpoo.",
    },
    center: [88.52, 27.20],
    zoom: 12.8,
  },
  {
    id: "nh27",
    name: "Guwahati – Lumding – Silchar Highway",
    highway: "NH-27",
    state: "Assam",
    origin: "Lumding Bypass",
    destination: "Silchar ISBT",
    distance: "198 km",
    normalDuration: "5h 15m",
    currentDuration: "7h 40m (+2h 25m delay)",
    status: "blocked",
    statusText: "CORRIDOR SEVERED (SLOPE SUBSIDENCE)",
    blockageLocation: "Jatinga Valley Hill-Cutting Section (Dima Hasao)",
    blockageReason:
      "Multiple sinkholes and active slope slippage across 3 key highway curves. NHAI machinery deployed.",
    rainfall: "92 mm/h (Torrential)",
    soilMoisture: "86% (Critical Moisture)",
    recommendedDetour: {
      name: "Haflong – Umrangso – Lanka Relief Road",
      extraDistance: "+38.0 km",
      extraTime: "+1h 45m",
      vehicleSuitability: "Commercial Trucks & Passenger Buses Permitted",
      description:
        "Paved dual-lane detour through stable limestone geology. Monitored by Assam Rifles emergency transit posts.",
    },
    center: [92.95, 25.18],
    zoom: 12.5,
  },
  {
    id: "nh6",
    name: "Shillong – Jowai – Silchar Corridor",
    highway: "NH-6",
    state: "Meghalaya",
    origin: "Shillong Civil Hospital",
    destination: "Jowai Bypass Junction",
    distance: "64 km",
    normalDuration: "1h 50m",
    currentDuration: "2h 05m (+15m delay)",
    status: "open",
    statusText: "NORMAL TRANSIT (MONITORED CLEARANCE)",
    blockageLocation: "Umkiang Rockfall Barrier Zone",
    blockageReason:
      "Minor rockfall cleared by morning patrol team. Debris catchment nets holding securely.",
    rainfall: "34 mm/h (Moderate)",
    soilMoisture: "52% (Nominal Baseline)",
    recommendedDetour: {
      name: "No Detour Necessary (Standard Highway Open)",
      extraDistance: "0 km",
      extraTime: "0 mins",
      vehicleSuitability: "All Vehicle Categories Permitted",
      description:
        "Maintain cautious speed limit of 40 km/h due to morning fog patches near Barapani ridge.",
    },
    center: [91.89, 25.57],
    zoom: 12.5,
  },
];

export default function DriverRouteCheckPage() {
  const { openReportModal, addToast } = useApp();
  const [selectedRouteId, setSelectedRouteId] = useState<string>("nh29");
  const [vehicleType, setVehicleType] = useState<"lmv" | "hcv" | "emergency">(
    "lmv"
  );
  const [originInput, setOriginInput] = useState<string>("");
  const [destinationInput, setDestinationInput] = useState<string>("");
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);

  const activeRoute =
    ROUTE_PRESETS.find((r) => r.id === selectedRouteId) || ROUTE_PRESETS[0];

  const handleSelectPreset = (preset: RoutePreset) => {
    setSelectedRouteId(preset.id);
    setOriginInput(preset.origin);
    setDestinationInput(preset.destination);
  };

  const handleSwapLocations = () => {
    const temp = originInput || activeRoute.origin;
    setOriginInput(destinationInput || activeRoute.destination);
    setDestinationInput(temp);
  };

  const handleSubscribeAlerts = () => {
    setIsSubscribed(!isSubscribed);
    if (!isSubscribed) {
      addToast({
        title: "Subscribed to Corridor SMS Alerts",
        description: `Instant SMS broadcasts enabled for ${activeRoute.highway} (${activeRoute.state}).`,
        type: "success",
      });
    } else {
      addToast({
        title: "Corridor Alerts Paused",
        description: `Alert notifications for ${activeRoute.highway} have been paused.`,
        type: "info",
      });
    }
  };

  const handleDownloadAdvisory = () => {
    const advisoryText = `TERRA360 OFFICIAL DRIVER ROUTE ADVISORY
Generated: ${new Date().toLocaleString()}
Corridor: ${activeRoute.highway} (${activeRoute.name})
State: ${activeRoute.state}
Status: ${activeRoute.statusText}
Blockage: ${activeRoute.blockageLocation}
Hazard Summary: ${activeRoute.blockageReason}
Doppler Rainfall: ${activeRoute.rainfall}
Soil Moisture: ${activeRoute.soilMoisture}

OFFICIAL RECOMMENDED DETOUR:
Route: ${activeRoute.recommendedDetour.name}
Extra Distance: ${activeRoute.recommendedDetour.extraDistance}
Extra Time: ${activeRoute.recommendedDetour.extraTime}
Suitability: ${activeRoute.recommendedDetour.vehicleSuitability}
Guidance: ${activeRoute.recommendedDetour.description}

Emergency Contacts:
Disaster Helpline: 1070 | Police Emergency: 112 | BRO Highway Control: 1800-118-005
`;

    const blob = new Blob([advisoryText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Terra360_Route_Advisory_${activeRoute.highway}.txt`;
    link.click();
    URL.revokeObjectURL(url);

    addToast({
      title: "Route Advisory Downloaded",
      description: `Saved offline text advisory for ${activeRoute.highway}.`,
      type: "info",
    });
  };

  const isBlocked = activeRoute.status === "blocked";
  const isCaution = activeRoute.status === "caution";

  const VehicleIcon =
    vehicleType === "hcv"
      ? Truck
      : vehicleType === "emergency"
      ? Ambulance
      : Car;

  return (
    <PortalLayout
      allowedRoles={["driver"]}
      title="Driver Corridor Route-Check Portal"
      subtitle="Real-time highway risk assessments, active blockage telemetry, and verified bypass detours."
      headerActions={
        <button
          type="button"
          onClick={openReportModal}
          className="px-4 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs transition-all inline-flex items-center gap-1.5 cursor-pointer"
        >
          <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Report Debris / Slide</span>
        </button>
      }
    >
      <div className="space-y-6 w-full">
        {/* ── 1. Corridor Selection Tabs Strip ──────────────────────────── */}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 mb-2.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#173D32]/65">
              Major Northeast Highway Corridors
            </span>
            <span className="text-[11px] font-semibold text-[#173D32]/60">
              Live BRO &amp; SDMA Telemetry
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {ROUTE_PRESETS.map((preset) => {
              const isSelected = preset.id === activeRoute.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? "bg-[#173D32] text-[#F6F4EC] border-[#173D32] shadow-md ring-2 ring-[#D6A65D]"
                      : "bg-[#FAF8F2] hover:bg-white border-[#173D32]/12 text-[#173D32] shadow-2xs"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-mono font-bold text-xs">
                      {preset.highway}
                    </span>
                    <StatusBadge
                      status={preset.status}
                      size="xs"
                      pulse={preset.status === "blocked"}
                    />
                  </div>
                  <span className="text-xs font-extrabold truncate block">
                    {preset.name}
                  </span>
                  <span className="text-[11px] opacity-75 mt-1 block">
                    {preset.state} · {preset.distance}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── 2. Origin, Destination & Vehicle Selector Card ────────────── */}
        <div className="bg-[#FAF8F2] border border-[#173D32]/12 rounded-3xl p-5 sm:p-6 shadow-xs">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
            {/* Origin Field */}
            <div className="lg:col-span-4">
              <label
                htmlFor="driver-origin-input"
                className="block text-[10.5px] font-bold uppercase tracking-wider text-[#173D32]/65 mb-1.5"
              >
                Trip Origin
              </label>
              <div className="flex items-center gap-2 bg-white border border-[#173D32]/15 rounded-xl px-3.5 h-10">
                <Navigation className="w-3.5 h-3.5 text-[#16A34A] shrink-0" aria-hidden="true" />
                <input
                  id="driver-origin-input"
                  type="text"
                  value={originInput || activeRoute.origin}
                  onChange={(e) => setOriginInput(e.target.value)}
                  className="bg-transparent text-xs sm:text-sm font-semibold text-[#173D32] focus:outline-none w-full"
                  placeholder="Enter starting city/town..."
                />
              </div>
            </div>

            {/* Swap Button */}
            <div className="lg:col-span-1 flex justify-center">
              <button
                type="button"
                onClick={handleSwapLocations}
                className="w-10 h-10 rounded-full bg-white border border-[#173D32]/15 hover:bg-[#173D32] hover:text-[#F6F4EC] text-[#173D32] transition-all flex items-center justify-center shadow-2xs cursor-pointer"
                title="Swap Origin and Destination"
                aria-label="Swap Origin and Destination"
              >
                <ArrowLeftRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            {/* Destination Field */}
            <div className="lg:col-span-4">
              <label
                htmlFor="driver-dest-input"
                className="block text-[10.5px] font-bold uppercase tracking-wider text-[#173D32]/65 mb-1.5"
              >
                Trip Destination
              </label>
              <div className="flex items-center gap-2 bg-white border border-[#173D32]/15 rounded-xl px-3.5 h-10">
                <MapPin className="w-3.5 h-3.5 text-[#DC2626] shrink-0" aria-hidden="true" />
                <input
                  id="driver-dest-input"
                  type="text"
                  value={destinationInput || activeRoute.destination}
                  onChange={(e) => setDestinationInput(e.target.value)}
                  className="bg-transparent text-xs sm:text-sm font-semibold text-[#173D32] focus:outline-none w-full"
                  placeholder="Enter destination..."
                />
              </div>
            </div>

            {/* Vehicle Type Selector */}
            <div className="lg:col-span-3">
              <label
                htmlFor="driver-vehicle-select"
                className="block text-[10.5px] font-bold uppercase tracking-wider text-[#173D32]/65 mb-1.5"
              >
                Vehicle Type
              </label>
              <div className="flex items-center gap-2 bg-white border border-[#173D32]/15 rounded-xl px-3 h-10">
                <VehicleIcon className="w-4 h-4 text-[#173D32]/75 shrink-0" aria-hidden="true" />
                <select
                  id="driver-vehicle-select"
                  value={vehicleType}
                  onChange={(e) =>
                    setVehicleType(
                      e.target.value as "lmv" | "hcv" | "emergency"
                    )
                  }
                  className="w-full bg-transparent text-xs font-bold text-[#173D32] focus:outline-none cursor-pointer"
                >
                  <option value="lmv">Light Vehicle (LMV / SUV)</option>
                  <option value="hcv">Heavy Commercial (HCV / Truck)</option>
                  <option value="emergency">Emergency / Relief Convoy</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* ── 3. Corridor Clearance & Hazard Telemetry Banner ───────────── */}
        <div
          className={`rounded-3xl p-5 sm:p-6 border shadow-xs transition-all ${
            isBlocked
              ? "bg-[#FEF2F2] border-red-200 text-red-950"
              : isCaution
              ? "bg-[#FFFBEB] border-amber-200 text-amber-950"
              : "bg-[#ECFDF5] border-emerald-200 text-emerald-950"
          }`}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-current/12">
            <div className="flex items-start sm:items-center gap-3.5">
              <div
                className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                  isBlocked
                    ? "bg-red-100 text-red-700"
                    : isCaution
                    ? "bg-amber-100 text-amber-800"
                    : "bg-emerald-100 text-emerald-700"
                }`}
                aria-hidden="true"
              >
                {isBlocked ? (
                  <Ban className="w-5 h-5" />
                ) : isCaution ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : (
                  <CheckCircle2 className="w-5 h-5" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black uppercase tracking-wider">
                    {activeRoute.highway} · {activeRoute.state}
                  </span>
                  <StatusBadge
                    status={activeRoute.status}
                    label={activeRoute.statusText}
                    size="xs"
                    pulse={isBlocked}
                  />
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight mt-1">
                  {activeRoute.blockageLocation}
                </h2>
              </div>
            </div>

            {/* Transit Times */}
            <div className="flex flex-wrap sm:flex-nowrap items-stretch gap-3 w-full sm:w-auto sm:shrink-0">
              <div className="bg-white/90 rounded-2xl p-3 border border-current/12 text-center flex-1 sm:flex-initial min-w-[100px]">
                <span className="text-[10px] uppercase font-bold opacity-70 block">
                  Normal Time
                </span>
                <span className="text-sm font-bold text-[#173D32]">
                  {activeRoute.normalDuration}
                </span>
              </div>
              <div className="bg-white/90 rounded-2xl p-3 border border-current/12 text-center flex-1 sm:flex-initial min-w-[120px]">
                <span className="text-[10px] uppercase font-bold opacity-70 block">
                  Current ETA
                </span>
                <span
                  className={`text-sm font-black ${
                    isBlocked
                      ? "text-red-700"
                      : isCaution
                      ? "text-amber-700"
                      : "text-emerald-700"
                  }`}
                >
                  {activeRoute.currentDuration}
                </span>
              </div>
            </div>
          </div>

          {/* Blockage Cause & Live Sensor Readouts */}
          <div className="pt-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-7">
              <span className="text-[11px] uppercase font-bold tracking-wider opacity-75 block mb-1">
                Geological Obstruction Summary
              </span>
              <p className="text-xs sm:text-sm leading-relaxed">
                {activeRoute.blockageReason}
              </p>
            </div>

            <div className="lg:col-span-5 grid grid-cols-2 gap-2.5">
              <div className="bg-white/85 rounded-xl p-3 border border-current/10">
                <span className="text-[10px] uppercase font-bold opacity-70 inline-flex items-center gap-1">
                  <CloudRain className="w-3 h-3 text-[#1D4ED8]" aria-hidden="true" />
                  <span>Doppler Rainfall</span>
                </span>
                <span className="text-xs font-bold text-[#173D32] mt-1 block">
                  {activeRoute.rainfall}
                </span>
              </div>

              <div className="bg-white/85 rounded-xl p-3 border border-current/10">
                <span className="text-[10px] uppercase font-bold opacity-70 inline-flex items-center gap-1">
                  <Droplets className="w-3 h-3 text-[#17688A]" aria-hidden="true" />
                  <span>Soil Saturation</span>
                </span>
                <span className="text-xs font-bold text-[#173D32] mt-1 block">
                  {activeRoute.soilMoisture}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── 4. Recommended Detour & Bypass Card ──────────────────────── */}
        {(isBlocked || isCaution) && (
          <div className="bg-[#FAF8F2] border border-blue-300/80 rounded-3xl p-5 sm:p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 pb-3 border-b border-[#173D32]/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" aria-hidden="true" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800 block">
                    Official Bypass Clearance
                  </span>
                  <h3 className="text-base sm:text-lg font-extrabold text-[#173D32]">
                    {activeRoute.recommendedDetour.name}
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
                  Distance: {activeRoute.recommendedDetour.extraDistance}
                </span>
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
                  Transit: {activeRoute.recommendedDetour.extraTime}
                </span>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-[#173D32]/85 leading-relaxed mb-3">
              {activeRoute.recommendedDetour.description}
            </p>

            <div className="p-3 bg-blue-50/75 border border-blue-200/70 rounded-xl text-xs font-semibold text-blue-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-blue-700 shrink-0" aria-hidden="true" />
              <span>
                <strong>Vehicle Suitability:</strong>{" "}
                {activeRoute.recommendedDetour.vehicleSuitability}
              </span>
            </div>
          </div>
        )}

        {/* ── 5. 3D Corridor Mountain Elevation & Detour Map Preview ────── */}
        <PortalSectionCard
          title="3D Spatial Elevation & Hazard Preview"
          subtitle={`${activeRoute.name} · Northeast Terrain Model`}
          badge={
            <span className="text-[11px] font-bold bg-[#DCE8D4]/70 text-[#173D32] px-2.5 py-0.5 rounded-full">
              Interactive 3D Engine
            </span>
          }
        >
          <div className="relative w-full h-[420px] sm:h-[500px] rounded-2xl overflow-hidden border border-[#173D32]/15 bg-[#EEF4EB] shadow-inner">
            <RiskMap
              key={activeRoute.id}
              center={activeRoute.center}
              zoom={activeRoute.zoom}
              className="w-full h-full"
            />
          </div>
        </PortalSectionCard>

        {/* ── 6. Driver Emergency Actions Toolkit ───────────────────────── */}
        <PortalSectionCard
          title="Driver Emergency Toolkit & Alerts"
          icon={<Zap className="w-4 h-4" aria-hidden="true" />}
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={openReportModal}
              className="h-11 px-4 rounded-full bg-red-600 hover:bg-red-700 text-white font-bold text-xs inline-flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
            >
              <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Report Rockfall / Debris</span>
            </button>

            <button
              type="button"
              onClick={handleSubscribeAlerts}
              className={`h-11 px-4 rounded-full font-bold text-xs inline-flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer ${
                isSubscribed
                  ? "bg-emerald-700 hover:bg-emerald-800 text-white"
                  : "bg-[#173D32] hover:bg-[#1a4437] text-[#F6F4EC]"
              }`}
            >
              {isSubscribed ? (
                <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
              ) : (
                <Bell className="w-3.5 h-3.5" aria-hidden="true" />
              )}
              <span>
                {isSubscribed
                  ? "SMS Alerts Active (Unsubscribe)"
                  : "Subscribe to Highway SMS Alerts"}
              </span>
            </button>

            <button
              type="button"
              onClick={handleDownloadAdvisory}
              className="h-11 px-4 rounded-full bg-white hover:bg-[#FAF8F2] border border-[#173D32]/20 text-[#173D32] font-bold text-xs inline-flex items-center justify-center gap-2 transition-all shadow-2xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Download Offline Route Advisory</span>
            </button>
          </div>
        </PortalSectionCard>
      </div>
    </PortalLayout>
  );
}
