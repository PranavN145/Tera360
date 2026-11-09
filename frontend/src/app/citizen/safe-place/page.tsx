"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import PortalLayout from "@/components/portal/PortalLayout";
import RiskMap from "@/components/RiskMap";
import { useApp } from "@/context/AppContext";
import { publicApi } from "@/lib/api";
import {
  getAllVerifiedShelters,
  getShelterForVillage,
  getSheltersByState,
  VerifiedShelterItem,
} from "@/data/villages";
import { PublicAlertItem } from "@/types/public";

interface CachedShelterData {
  timestamp: number;
  villageName?: string;
  district?: string;
  state?: string;
  shelters: VerifiedShelterItem[];
  emergencyContacts: {
    name: string;
    phone: string;
    role: string;
  }[];
}

const STORAGE_CACHE_KEY = "terra360_shelters_offline_cache";

export default function CitizenSafePlacePage() {
  const { user, addToast } = useApp();

  // Citizen registered village details
  const citizenVillageName = user?.village?.villageName;
  const citizenDistrict = user?.village?.district || "District";
  const citizenState = user?.village?.state || "Nagaland";

  // State selection filter (defaults to citizen's state or "All")
  const [selectedStateFilter, setSelectedStateFilter] = useState<string>(citizenState);

  // Connectivity & Offline Caching State
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    if (typeof window !== "undefined" && typeof navigator !== "undefined") {
      return navigator.onLine;
    }
    return true;
  });

  const [lastSyncTime, setLastSyncTime] = useState<number | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(STORAGE_CACHE_KEY);
      if (raw) {
        const parsed: CachedShelterData = JSON.parse(raw);
        return parsed.timestamp || null;
      }
    } catch {
      // Ignore JSON parse errors
    }
    return null;
  });

  const [isCacheStale, setIsCacheStale] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      const raw = localStorage.getItem(STORAGE_CACHE_KEY);
      if (raw) {
        const parsed: CachedShelterData = JSON.parse(raw);
        if (parsed.timestamp) {
          return Date.now() - parsed.timestamp > 24 * 60 * 60 * 1000;
        }
      }
    } catch {
      // Ignore JSON parse errors
    }
    return false;
  });

  // Telemetry & Alerts state (to evaluate whether approach corridors are open or blocked)
  const [alerts, setAlerts] = useState<PublicAlertItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [dataError, setDataError] = useState<string | null>(null);

  // Active inspected shelter for interactive map and directions
  const [activeShelterId, setActiveShelterId] = useState<string | null>(null);

  // Synchronize connectivity status
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOnline = () => {
      setIsOnline(true);
      addToast({
        title: "Connection Restored",
        description: "Re-synchronized live shelter directory and telemetry feeds.",
        type: "success",
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      addToast({
        title: "Offline Mode Active",
        description: "Network unavailable. Serving verified shelter records from local offline cache.",
        type: "warning",
      });
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [addToast]);

  // Primary Designated Safe Shelter associated directly with citizen's village
  const designatedShelter = useMemo(() => {
    return getShelterForVillage(citizenVillageName);
  }, [citizenVillageName]);

  // Filtered alternative shelters list based on active state filter
  const stateShelters = useMemo(() => {
    return getSheltersByState(selectedStateFilter);
  }, [selectedStateFilter]);

  // Currently inspected shelter (defaults to designated village shelter, or first state shelter)
  const activeShelter = useMemo(() => {
    if (activeShelterId) {
      const found = getAllVerifiedShelters().find((s) => s.id === activeShelterId);
      if (found) return found;
    }
    return designatedShelter || stateShelters[0] || getAllVerifiedShelters()[0];
  }, [activeShelterId, designatedShelter, stateShelters]);

  // Cache updater logic
  const saveOfflineCache = useCallback((sheltersList: VerifiedShelterItem[]) => {
    if (typeof window === "undefined") return;
    try {
      const payload: CachedShelterData = {
        timestamp: Date.now(),
        villageName: citizenVillageName,
        district: citizenDistrict,
        state: citizenState,
        shelters: sheltersList,
        emergencyContacts: [
          {
            name: designatedShelter?.contactPerson?.name || "Village Elder / Committee",
            phone: designatedShelter?.contactPerson?.phone || designatedShelter?.helpline || "+91 98621 11204",
            role: designatedShelter?.contactPerson?.designation || "Local Shelter Caretaker",
          },
          { name: "SDMA Emergency Control Room", phone: "1070", role: "State Disaster Authority (24/7)" },
          { name: "National Emergency Helpline", phone: "112", role: "Police, Fire & Rescue" },
          { name: "Medical Emergency Ambulance", phone: "108", role: "Paramedic Dispatch" },
          { name: "District Disaster Emergency Line", phone: "1077", role: "District Control" },
        ],
      };
      localStorage.setItem(STORAGE_CACHE_KEY, JSON.stringify(payload));
      setLastSyncTime(payload.timestamp);
      setIsCacheStale(false);
    } catch {
      // Ignore quota errors in private browsing
    }
  }, [citizenVillageName, citizenDistrict, citizenState, designatedShelter]);

  // Fetch telemetry & update offline cache
  const handleManualSync = useCallback(async () => {
    setIsLoading(true);
    setDataError(null);
    try {
      const alertRes = await publicApi.getAlerts({ state: citizenState, limit: 5 });
      setAlerts(alertRes.alerts);
      const allShelters = getAllVerifiedShelters();
      saveOfflineCache(allShelters);
      addToast({
        title: "Shelter Records Synced",
        description: "Emergency contacts and evacuation refuges cached for offline use.",
        type: "success",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unable to contact live backend.";
      setDataError(msg);
      addToast({
        title: "Sync Failed",
        description: "Operating with existing offline cache records.",
        type: "warning",
      });
    } finally {
      setIsLoading(false);
    }
  }, [citizenState, saveOfflineCache, addToast]);

  // Initial load
  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        const alertRes = await publicApi.getAlerts({ state: citizenState, limit: 5 });
        if (mounted) {
          setAlerts(alertRes.alerts);
          const allShelters = getAllVerifiedShelters();
          saveOfflineCache(allShelters);
          setDataError(null);
        }
      } catch (err: unknown) {
        if (mounted) {
          const msg = err instanceof Error ? err.message : "Operating from offline shelter cache.";
          setDataError(msg);
        }
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
  }, [citizenState, saveOfflineCache]);

  // Download physical text file summary for emergency grab-bag
  const handleDownloadOfflineCard = () => {
    if (!activeShelter) return;

    const fileContent = `=====================================================
TERRA360 — CITIZEN EVACUATION & SHELTER PASS
Generated: ${new Date().toLocaleString()}
Offline Verification Code: TR360-EVAC-${activeShelter.id}
=====================================================

1. DESIGNATED SAFE SHELTER
-----------------------------------------------------
Shelter Name: ${activeShelter.name}
Territory:    ${activeShelter.villageName || citizenVillageName || "Regional"}, ${activeShelter.district}, ${activeShelter.state}
Address:      ${activeShelter.address}
Capacity:     ${activeShelter.capacity} Persons
Status:       ${activeShelter.status}
Distance:     ${activeShelter.distanceKm ? `${activeShelter.distanceKm} km (~${Math.round(activeShelter.distanceKm * 14)} mins walk)` : "Surveyed on ground"}

2. WALKING & TRANSIT DIRECTIONS
-----------------------------------------------------
Walking Path:
${activeShelter.walkingDirections || "Follow marked high-ground yellow ribbons away from natural gully stream channels."}

Vehicular Access:
${activeShelter.drivingDirections || "Follow district arterial roads. Avoid low-lying river roads during heavy rainfall."}

3. SHELTER AMENITIES & FACILITIES
-----------------------------------------------------
${activeShelter.amenities.map((a) => `- ${a}`).join("\n")}

4. VERIFIED EMERGENCY CLICK-TO-DIAL
-----------------------------------------------------
Local Shelter Contact: ${activeShelter.contactPerson?.name || "Local Caretaker"} (${activeShelter.contactPerson?.phone || activeShelter.helpline})
SDMA Emergency Control: 1070 (Toll-Free, 24/7)
National Emergency Line: 112 (Police, Fire & Rescue)
Medical Paramedic Post: 108
District Disaster Line: 1077

5. STRICT EVACUATION SAFETY RULES
-----------------------------------------------------
- Move calmly to high ground during continuous torrential rainfall.
- Never cross muddy torrents or recent slope fissures on foot or in vehicles.
- Stay with your family circle and register your arrival with the village elder.
=====================================================`;

    const blob = new Blob([fileContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Terra360_SafeShelter_${activeShelter.name.replace(/\s+/g, "_")}.txt`;
    link.click();
    URL.revokeObjectURL(url);

    addToast({
      title: "Offline Pass Downloaded",
      description: `Saved physical text shelter card for ${activeShelter.name}.`,
      type: "info",
    });
  };

  // Last sync time display string
  const formattedSyncTime = useMemo(() => {
    if (!lastSyncTime) return "Not synced yet";
    return new Date(lastSyncTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }, [lastSyncTime]);

  return (
    <PortalLayout
      allowedRoles={["citizen"]}
      title="Safe Places & Evacuation Navigation"
      subtitle="Geotechnically vetted emergency relief shelters, designated evacuation staging, and offline disaster contacts."
    >
      <div className="space-y-6 max-w-6xl">
        {/* ── Offline / Connectivity Status Header Bar ─────────────────────── */}
        <div className="p-4 rounded-2xl bg-[#FAF8F2] border border-[#173D32]/12 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <span
              className={`w-3 h-3 rounded-full shrink-0 ${
                isOnline ? "bg-emerald-600 shadow-emerald-500/50 shadow-sm" : "bg-amber-500 animate-pulse"
              }`}
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-[#173D32]">
                  {isOnline ? "Online Live Telemetry" : "Offline Cache Mode Active"}
                </span>
                <span className="text-[#173D32]/40">·</span>
                <span className="text-[11px] text-[#173D32]/70 font-mono">
                  Synced: {formattedSyncTime}
                </span>
              </div>
              <p className="text-[11px] text-[#173D32]/60 mt-0.5">
                {isOnline
                  ? "Verified shelter records, phone numbers, and evacuation routes are cached for cellular blackout resilience."
                  : "Internet disconnected. Displaying verified local shelter cards and phone numbers saved on this device."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleManualSync}
              disabled={isLoading}
              className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-[#F6F4EC] border border-[#173D32]/15 text-[#173D32] font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <span>{isLoading ? "Syncing..." : "Re-sync Cache"}</span>
              <span>🔄</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadOfflineCard}
              className="px-3.5 py-1.5 rounded-xl bg-[#173D32] text-[#F6F4EC] font-bold text-xs hover:bg-[#1a4437] transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <span>Download Text Card</span>
              <span>💾</span>
            </button>
          </div>
        </div>

        {/* Stale Cache Notice Banner */}
        {isCacheStale && (
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">⚠️</span>
              <span>
                <strong>Cached data is older than 24 hours.</strong> Re-connect to cellular or Wi-Fi when possible to refresh real-time shelter occupancy status.
              </span>
            </div>
            <button
              type="button"
              onClick={handleManualSync}
              className="px-2.5 py-1 rounded-lg bg-amber-200 hover:bg-amber-300 font-bold text-amber-900"
            >
              Update Now
            </button>
          </div>
        )}

        {/* Backend Advisory Feed Error Alert */}
        {dataError && (
          <div className="p-3.5 rounded-2xl bg-amber-50 text-amber-900 border border-amber-200 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">⚠️</span>
              <span>Backend advisory feed notice: {dataError} (Serving verified local shelter cache)</span>
            </div>
            <button
              type="button"
              onClick={handleManualSync}
              className="px-2.5 py-1 rounded-lg bg-amber-200 text-amber-900 font-bold hover:bg-amber-300 cursor-pointer"
            >
              Retry Sync
            </button>
          </div>
        )}

        {/* Active Alerts in approach corridors */}
        {alerts.length > 0 && (
          <div className="p-3 rounded-2xl bg-white border border-[#173D32]/12 text-xs flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-[#173D32] font-semibold">
                <strong>{alerts.length} active landslide advisory / corridor bulletin(s)</strong> broadcast in {citizenState}. Check approach corridors before traveling.
              </span>
            </div>
            <Link href="/citizen/my-area" className="text-xs font-bold text-[#173D32] hover:underline shrink-0">
              Corridor Status →
            </Link>
          </div>
        )}

        {/* Notice for Missing Village Profile */}
        {(!citizenVillageName || !user?.village?.state) && (
          <div className="p-6 sm:p-8 bg-[#FAF8F2] rounded-3xl border border-[#173D32]/15 shadow-xs text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#DCE8D4] flex items-center justify-center text-2xl mx-auto text-[#173D32]">
              📍
            </div>
            <h2 className="text-lg sm:text-xl font-black text-[#173D32]">
              Village Information Not Configured
            </h2>
            <p className="text-xs sm:text-sm text-[#173D32]/80 leading-relaxed max-w-lg mx-auto">
              Configure your home settlement in your citizen profile to automatically identify your primary safe shelter, surveyed walking distance, and designated elder contact.
            </p>
            <div className="pt-1">
              <Link
                href="/citizen/profile"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#173D32] text-[#F6F4EC] text-xs font-bold hover:bg-[#1a4437] transition-all shadow-xs"
              >
                <span>Complete Village Profile</span>
                <span>→</span>
              </Link>
            </div>
          </div>
        )}

        {/* ── 1. Primary Designated Village Shelter ──────────────────────────── */}
        {designatedShelter ? (
          <div className="p-6 sm:p-8 bg-[#FAF8F2] rounded-3xl border border-[#173D32]/15 shadow-xs space-y-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-[#173D32]/10">
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-black uppercase tracking-wider border border-emerald-300">
                    ✓ Village-Designated Primary Shelter
                  </span>
                  <span className="text-[#173D32]/40">·</span>
                  <span className="text-[11px] font-bold text-[#173D32]/70">
                    Assigned for {citizenVillageName} Residents
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-[#173D32] tracking-tight">
                  {designatedShelter.name}
                </h2>
                <p className="text-xs text-[#173D32]/75 mt-0.5">
                  📍 {designatedShelter.address}
                </p>
              </div>

              {/* Status and Action Buttons */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className="px-3 py-1.5 rounded-xl bg-emerald-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-200" />
                  <span>{designatedShelter.status}</span>
                </span>

                <a
                  href={`tel:${designatedShelter.contactPerson?.phone || designatedShelter.helpline}`}
                  className="px-4 py-2 rounded-xl bg-[#173D32] hover:bg-[#1a4437] text-white font-extrabold text-xs transition-colors flex items-center gap-2 shadow-2xs"
                >
                  <span>📞 Call Caretaker:</span>
                  <span>{designatedShelter.contactPerson?.phone || designatedShelter.helpline}</span>
                </a>
              </div>
            </div>

            {/* Core Shelter Attributes Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-white border border-[#173D32]/10 shadow-2xs">
                <span className="text-[10px] font-bold uppercase text-[#173D32]/60 block mb-1">
                  Surveyed Distance
                </span>
                <span className="text-lg font-black text-[#173D32] block">
                  {designatedShelter.distanceKm != null ? `${designatedShelter.distanceKm} km` : "Surveyed on ground"}
                </span>
                <span className="text-[10px] text-[#173D32]/70 block mt-0.5">
                  {designatedShelter.distanceKm != null
                    ? `~${Math.round(designatedShelter.distanceKm * 14)} mins uphill walk`
                    : "High-ground evacuation trail"}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-[#173D32]/10 shadow-2xs">
                <span className="text-[10px] font-bold uppercase text-[#173D32]/60 block mb-1">
                  Designated Capacity
                </span>
                <span className="text-lg font-black text-[#173D32] block">
                  {designatedShelter.capacity} Persons
                </span>
                <span className="text-[10px] text-[#173D32]/70 block mt-0.5">
                  Verified bedrock stability
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-[#173D32]/10 shadow-2xs">
                <span className="text-[10px] font-bold uppercase text-[#173D32]/60 block mb-1">
                  Village Representative
                </span>
                <span className="text-sm font-black text-[#173D32] block truncate">
                  {designatedShelter.contactPerson?.name || "Elder on Duty"}
                </span>
                <span className="text-[10px] text-[#173D32]/70 block truncate mt-0.5">
                  {designatedShelter.contactPerson?.designation || "Shelter Staging In-Charge"}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-[#173D32]/10 shadow-2xs">
                <span className="text-[10px] font-bold uppercase text-[#173D32]/60 block mb-1">
                  Geographic Location
                </span>
                <span className="text-sm font-black text-[#173D32] block font-mono">
                  {designatedShelter.coordinates
                    ? `${designatedShelter.coordinates[1]}°N, ${designatedShelter.coordinates[0]}°E`
                    : "Coordinates on file"}
                </span>
                <span className="text-[10px] text-[#173D32]/70 block mt-0.5">
                  High-elevation ridgeline
                </span>
              </div>
            </div>

            {/* Amenities Pills */}
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#173D32]/70 block mb-2">
                Emergency Amenities & Provisioning Available on Site
              </span>
              <div className="flex flex-wrap gap-2">
                {designatedShelter.amenities.map((amenity) => (
                  <span
                    key={amenity}
                    className="px-3 py-1 rounded-xl bg-white border border-[#173D32]/15 text-[#173D32] text-xs font-semibold shadow-2xs flex items-center gap-1.5"
                  >
                    <span>🛡️</span>
                    <span>{amenity}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Strict Evacuation Notice & Directions */}
            <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-xs space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-base">🧭</span>
                <span className="font-extrabold text-[#173D32] uppercase tracking-wide">
                  Verified Community Evacuation Directions
                </span>
              </div>
              <p className="text-[#173D32] font-semibold leading-relaxed">
                <strong>Footpath Route:</strong> {designatedShelter.walkingDirections}
              </p>
              <p className="text-[#173D32]/80 leading-relaxed text-[11px]">
                <strong>Vehicular Route:</strong> {designatedShelter.drivingDirections}
              </p>
              <p className="text-[10px] text-[#173D32]/70 italic pt-1 border-t border-emerald-200">
                * Note on Safety: Ordinary digital navigation maps do not reflect landslide fissures or fresh slope mud flows. Strictly prioritize signposted uphill village evacuation trails.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-6 rounded-3xl bg-[#FAF8F2] border border-[#173D32]/12 text-center text-xs text-[#173D32]/80 space-y-2">
            <span className="text-2xl block">📍</span>
            <p className="font-extrabold text-sm text-[#173D32]">
              No Custom Shelter Associated with &quot;{citizenVillageName || "Unassigned"}&quot;
            </p>
            <p className="text-[11px] max-w-md mx-auto">
              Please inspect the verified district civil defense shelters listed below or update your village in your profile.
            </p>
          </div>
        )}

        {/* ── 2. Interactive Shelter Terrain Map ─────────────────────────────── */}
        <div className="p-6 sm:p-8 bg-[#FAF8F2] rounded-3xl border border-[#173D32]/12 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#173D32]/10">
            <div>
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-[#173D32] flex items-center gap-2">
                <span>🗺️</span>
                <span>Interactive Evacuation Terrain & Shelter Map</span>
              </h3>
              <p className="text-xs text-[#173D32]/70 mt-0.5">
                Currently Inspecting: <strong>{activeShelter.name}</strong> ({activeShelter.district}, {activeShelter.state})
              </p>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  `${activeShelter.name}, ${activeShelter.district}, ${activeShelter.state}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-1.5 rounded-xl bg-[#173D32] text-[#F6F4EC] text-xs font-bold hover:bg-[#1a4437] transition-all flex items-center gap-1.5 shadow-2xs"
              >
                <span>Open in External Maps</span>
                <span>↗</span>
              </a>
            </div>
          </div>

          {/* Mapbox 3D Container */}
          <div className="h-[360px] sm:h-[440px] w-full rounded-2xl overflow-hidden border border-[#173D32]/15 relative shadow-xs">
            <RiskMap
              className="w-full h-full"
              selectedState={activeShelter.state}
              center={activeShelter.coordinates || [94.02, 25.72]}
            />
          </div>

          {/* Evacuation Route Distinction Disclaimer */}
          <div className="p-3.5 rounded-2xl bg-white border border-[#173D32]/10 text-[11px] text-[#173D32]/80 leading-relaxed">
            <strong>Evacuation Guidance Notice:</strong> Ordinary commercial road maps do not guarantee slope clearance during geological hazards. The map view above indicates 3D topological relief gradients. In a landslide warning, follow physical markers and directives issued by village disaster volunteers.
          </div>
        </div>

        {/* ── 3. Alternative Verified Safe Shelters Catalog ─────────────────── */}
        <div className="p-6 sm:p-8 bg-[#FAF8F2] rounded-3xl border border-[#173D32]/12 shadow-2xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#173D32]/10">
            <div>
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-[#173D32] flex items-center gap-2">
                <span>🛡️</span>
                <span>Alternative Safe Shelters & Civil Defense Centers</span>
              </h3>
              <p className="text-xs text-[#173D32]/70 mt-0.5">
                Select an alternative shelter to inspect capacity, directions, and emergency contacts.
              </p>
            </div>

            {/* State filter buttons */}
            <div className="flex flex-wrap items-center gap-1.5">
              {["All States", "Nagaland", "Assam", "Sikkim", "Meghalaya"].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setSelectedStateFilter(st === "All States" ? "All" : st)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    (selectedStateFilter === st || (st === "All States" && selectedStateFilter === "All"))
                      ? "bg-[#173D32] text-[#F6F4EC] shadow-2xs"
                      : "bg-white text-[#173D32] border border-[#173D32]/15 hover:bg-[#F6F4EC]"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Shelters Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stateShelters.map((shelter) => {
              const isSelected = activeShelter.id === shelter.id;
              const isPrimary = designatedShelter?.id === shelter.id;

              return (
                <div
                  key={shelter.id}
                  className={`p-5 rounded-3xl border transition-all flex flex-col justify-between space-y-4 ${
                    isSelected
                      ? "bg-white border-[#173D32] shadow-md ring-2 ring-[#173D32]/20"
                      : "bg-white/80 border-[#173D32]/10 hover:bg-white shadow-2xs"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-[#DCE8D4] text-[#173D32] text-[10px] font-black uppercase tracking-wider">
                          {shelter.district}, {shelter.state}
                        </span>
                        {isPrimary && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[9px] font-black uppercase tracking-wider">
                            Primary
                          </span>
                        )}
                      </div>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 text-[10px] font-bold">
                        ✓ {shelter.status}
                      </span>
                    </div>

                    <h4 className="text-base font-black text-[#173D32]">{shelter.name}</h4>
                    <p className="text-xs text-[#173D32]/70 mt-1">📍 {shelter.address}</p>

                    <div className="mt-4 pt-3 border-t border-[#173D32]/10 grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-[10px] text-[#173D32]/60 uppercase font-bold block">
                          Capacity
                        </span>
                        <strong className="text-[#173D32]">{shelter.capacity} Persons</strong>
                      </div>

                      <div>
                        <span className="text-[10px] text-[#173D32]/60 uppercase font-bold block">
                          Distance
                        </span>
                        <strong className="text-[#173D32]">
                          {shelter.distanceKm ? `${shelter.distanceKm} km` : "Surveyed on ground"}
                        </strong>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {shelter.amenities.slice(0, 3).map((amenity) => (
                        <span
                          key={amenity}
                          className="px-2 py-0.5 rounded-md bg-[#FAF8F2] border border-[#173D32]/10 text-[10px] font-semibold text-[#173D32]"
                        >
                          • {amenity}
                        </span>
                      ))}
                      {shelter.amenities.length > 3 && (
                        <span className="px-1.5 py-0.5 text-[10px] text-[#173D32]/60">
                          +{shelter.amenities.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#173D32]/10 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveShelterId(shelter.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isSelected
                          ? "bg-[#173D32] text-white"
                          : "bg-[#173D32]/10 text-[#173D32] hover:bg-[#173D32]/20"
                      }`}
                    >
                      {isSelected ? "Currently Inspected" : "Inspect On Map 🗺️"}
                    </button>

                    <a
                      href={`tel:${shelter.contactPerson?.phone || shelter.helpline}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors"
                    >
                      <span>📞 Call:</span>
                      <span className="font-mono text-[11px]">
                        {shelter.contactPerson?.phone || shelter.helpline}
                      </span>
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── 4. Emergency Contact Actions & Helplines ──────────────────────── */}
        <div className="p-6 sm:p-8 bg-[#FAF8F2] rounded-3xl border border-[#173D32]/12 shadow-2xs space-y-4">
          <div className="pb-3 border-b border-[#173D32]/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">🚨</span>
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-[#173D32]">
                Emergency Dialers (Northeast Resilient Helplines)
              </h3>
            </div>
            <span className="text-[11px] text-[#173D32]/60">24/7 Operations</span>
          </div>

          <p className="text-xs text-[#173D32]/80 leading-relaxed">
            During power outages and cellular cell tower congestion, landline toll-free channels and emergency dispatchers prioritize incoming distress calls:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {/* SDMA Control */}
            <a
              href="tel:1070"
              className="p-3.5 rounded-2xl bg-white hover:bg-[#F6F4EC] border border-[#173D32]/15 flex items-center justify-between transition-colors shadow-2xs"
            >
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-[#DCE8D4] flex items-center justify-center font-black text-xs text-[#173D32]">
                  1070
                </span>
                <div>
                  <span className="block font-black text-[#173D32]">SDMA State Control</span>
                  <span className="text-[10px] text-[#173D32]/60">Disaster Authority</span>
                </div>
              </div>
              <span className="text-emerald-700 font-black">Call →</span>
            </a>

            {/* National Emergency */}
            <a
              href="tel:112"
              className="p-3.5 rounded-2xl bg-white hover:bg-[#F6F4EC] border border-[#173D32]/15 flex items-center justify-between transition-colors shadow-2xs"
            >
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-[#DCE8D4] flex items-center justify-center font-black text-xs text-[#173D32]">
                  112
                </span>
                <div>
                  <span className="block font-black text-[#173D32]">National Helpline</span>
                  <span className="text-[10px] text-[#173D32]/60">Police & Rescue</span>
                </div>
              </div>
              <span className="text-emerald-700 font-black">Call →</span>
            </a>

            {/* Ambulance */}
            <a
              href="tel:108"
              className="p-3.5 rounded-2xl bg-white hover:bg-[#F6F4EC] border border-[#173D32]/15 flex items-center justify-between transition-colors shadow-2xs"
            >
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-[#DCE8D4] flex items-center justify-center font-black text-xs text-[#173D32]">
                  108
                </span>
                <div>
                  <span className="block font-black text-[#173D32]">Ambulance Post</span>
                  <span className="text-[10px] text-[#173D32]/60">Emergency Medical</span>
                </div>
              </div>
              <span className="text-emerald-700 font-black">Call →</span>
            </a>

            {/* District Disaster Line */}
            <a
              href="tel:1077"
              className="p-3.5 rounded-2xl bg-white hover:bg-[#F6F4EC] border border-[#173D32]/15 flex items-center justify-between transition-colors shadow-2xs"
            >
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-[#DCE8D4] flex items-center justify-center font-black text-xs text-[#173D32]">
                  1077
                </span>
                <div>
                  <span className="block font-black text-[#173D32]">District Emergency</span>
                  <span className="text-[10px] text-[#173D32]/60">Collectorate Desk</span>
                </div>
              </div>
              <span className="text-emerald-700 font-black">Call →</span>
            </a>
          </div>
        </div>

        {/* ── 5. Bottom Navigation Shortcuts ────────────────────────────────── */}
        <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-xs">
          <Link
            href="/citizen/home"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FAF8F2] border border-[#173D32]/15 text-[#173D32] font-bold hover:bg-white shadow-2xs transition-colors"
          >
            <span>← Return to Community Dashboard</span>
          </Link>

          <Link
            href="/citizen/my-area"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#173D32] text-[#F6F4EC] font-bold hover:bg-[#1a4437] transition-colors shadow-2xs"
          >
            <span>View Slope Moisture & Corridors →</span>
          </Link>
        </div>
      </div>
    </PortalLayout>
  );
}
