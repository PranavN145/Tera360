"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Compass,
  Download,
  ExternalLink,
  MapPin,
  PhoneCall,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import PortalLayout from "@/components/portal/PortalLayout";
import PortalMetricGrid from "@/components/portal/PortalMetricGrid";
import PortalFilterBar from "@/components/portal/PortalFilterBar";
import PortalSectionCard from "@/components/portal/PortalSectionCard";
import { PortalKpiCard } from "@/components/portal";
import StatusBadge from "@/components/ui/StatusBadge";
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

  const citizenVillageName = user?.village?.villageName;
  const citizenDistrict = user?.village?.district || "District";
  const citizenState = user?.village?.state || "Nagaland";

  const [selectedStateFilter, setSelectedStateFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
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

  const [alerts, setAlerts] = useState<PublicAlertItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const [activeShelterId, setActiveShelterId] = useState<string | null>(null);

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
        description: "Serving verified shelter records from local offline cache.",
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

  const designatedShelter = useMemo(() => {
    return getShelterForVillage(citizenVillageName);
  }, [citizenVillageName]);

  const allShelters = useMemo(() => getAllVerifiedShelters(), []);

  const filteredShelters = useMemo(() => {
    const base = getSheltersByState(selectedStateFilter);
    const q = searchQuery.toLowerCase().trim();
    if (!q) return base;
    return base.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.district.toLowerCase().includes(q) ||
        s.state.toLowerCase().includes(q) ||
        s.address.toLowerCase().includes(q)
    );
  }, [selectedStateFilter, searchQuery]);

  const activeShelter = useMemo(() => {
    if (activeShelterId) {
      const found = allShelters.find((s) => s.id === activeShelterId);
      if (found) return found;
    }
    return designatedShelter || filteredShelters[0] || allShelters[0];
  }, [activeShelterId, designatedShelter, filteredShelters, allShelters]);

  const saveOfflineCache = useCallback(
    (sheltersList: VerifiedShelterItem[]) => {
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
              phone:
                designatedShelter?.contactPerson?.phone ||
                designatedShelter?.helpline ||
                "+91 98621 11204",
              role: designatedShelter?.contactPerson?.designation || "Local Shelter Caretaker",
            },
            { name: "SDMA Emergency Control Room", phone: "1070", role: "State Disaster Authority" },
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
    },
    [citizenVillageName, citizenDistrict, citizenState, designatedShelter]
  );

  const handleManualSync = useCallback(async () => {
    setIsLoading(true);
    setDataError(null);
    try {
      const alertRes = await publicApi.getAlerts({ state: citizenState, limit: 5 });
      setAlerts(alertRes.alerts);
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
  }, [citizenState, allShelters, saveOfflineCache, addToast]);

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        const alertRes = await publicApi.getAlerts({ state: citizenState, limit: 5 });
        if (mounted) {
          setAlerts(alertRes.alerts);
          saveOfflineCache(allShelters);
          setDataError(null);
        }
      } catch (err: unknown) {
        if (mounted) {
          const msg =
            err instanceof Error ? err.message : "Operating from offline shelter cache.";
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
  }, [citizenState, allShelters, saveOfflineCache]);

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
      description: `Saved emergency shelter pass for ${activeShelter.name}.`,
      type: "info",
    });
  };

  const formattedSyncTime = useMemo(() => {
    if (!lastSyncTime) return "Not synced yet";
    return new Date(lastSyncTime).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [lastSyncTime]);

  const totalCapacity = allShelters.reduce((sum, s) => sum + s.capacity, 0);

  return (
    <PortalLayout
      allowedRoles={["citizen", "driver", "admin"]}
      title="Safe Places & Evacuation Shelters"
      subtitle="Geotechnically vetted emergency relief shelters, designated staging points, and offline disaster passes."
      headerActions={
        <div className="flex flex-wrap items-center gap-2">
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
      <div className="space-y-6 w-full">
        {/* KPI Row */}
        <PortalMetricGrid columns={4}>
          <PortalKpiCard
            variant="summary"
            id="citizen-shelters-kpi-total"
            title="Verified Refuges"
            value={allShelters.length}
            unit="Shelters"
            detail="Surveyed civil defense & high-ground halls"
            accent="green"
            badge="Vetted"
            badgeTone="green"
            icon={Building2}
          />
          <PortalKpiCard
            variant="summary"
            id="citizen-shelters-kpi-capacity"
            title="Total Relief Capacity"
            value={totalCapacity.toLocaleString()}
            unit="Persons"
            detail="Combined emergency staging capacity"
            accent="blue"
            badge="Ready"
            badgeTone="blue"
            icon={Users}
          />
          <PortalKpiCard
            variant="summary"
            id="citizen-shelters-kpi-cache"
            title="Offline Readiness"
            value={isOnline ? "Online" : "Cached"}
            unit={formattedSyncTime}
            detail={
              isOnline
                ? "Local grab-bag shelter cache synchronized"
                : "Serving cached shelter routes offline"
            }
            accent={isOnline ? "green" : "amber"}
            badge={isOnline ? "Synced" : "Offline"}
            badgeTone={isOnline ? "green" : "amber"}
            icon={isOnline ? Wifi : WifiOff}
          />
          <PortalKpiCard
            variant="summary"
            id="citizen-shelters-kpi-alerts"
            title={`${citizenState} Advisories`}
            value={alerts.length}
            unit="Active"
            detail="Approach corridor bulletins near shelters"
            accent={alerts.length > 0 ? "amber" : "green"}
            badge={alerts.length > 0 ? "Check Routes" : "Clear"}
            badgeTone={alerts.length > 0 ? "amber" : "green"}
            isLoading={isLoading}
            icon={AlertTriangle}
          />
        </PortalMetricGrid>

        {/* Offline Sync & Download Controls Banner */}
        <PortalSectionCard className="p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 font-bold text-[#173D32]">
                <span
                  className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                    isOnline ? "bg-emerald-600" : "bg-amber-500 animate-pulse"
                  }`}
                />
                <span>
                  {isOnline
                    ? "Online Live Telemetry & Offline Cache Synced"
                    : "Offline Mode Active (Serving Cached Shelters)"}
                </span>
                <span className="text-[#173D32]/50 font-normal">· Synced {formattedSyncTime}</span>
              </div>
              <p className="text-[11px] text-[#173D32]/70">
                Download a plain-text shelter pass or re-sync local cache for cellular blackout resilience.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleManualSync}
                disabled={isLoading}
                className="px-3.5 py-1.5 rounded-full bg-white hover:bg-[#F6F4EC] border border-[#173D32]/15 text-[#173D32] font-bold text-xs transition-colors inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`}
                  aria-hidden="true"
                />
                <span>{isLoading ? "Syncing..." : "Re-sync Cache"}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadOfflineCard}
                className="px-3.5 py-1.5 rounded-full bg-[#173D32] hover:bg-[#1a4437] text-[#F6F4EC] font-bold text-xs transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Download Shelter Pass (.txt)</span>
              </button>
            </div>
          </div>

          {(isCacheStale || dataError) && (
            <div className="mt-3 pt-3 border-t border-[#173D32]/10 flex items-center justify-between gap-2 text-xs text-amber-900">
              <span className="inline-flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0" aria-hidden="true" />
                <span>
                  {dataError
                    ? `Advisory notice: ${dataError} (Showing cached local records)`
                    : "Cached shelter records are over 24 hours old. Re-sync when online."}
                </span>
              </span>
            </div>
          )}
        </PortalSectionCard>

        {/* Primary Designated Village Shelter */}
        {designatedShelter && (
          <PortalSectionCard
            title={designatedShelter.name}
            subtitle={`Primary designated shelter for ${citizenVillageName} Residents · ${designatedShelter.address}`}
            icon={<ShieldCheck className="w-4 h-4 text-emerald-700" aria-hidden="true" />}
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status="open" label={designatedShelter.status} size="xs" />
                <a
                  href={`tel:${designatedShelter.contactPerson?.phone || designatedShelter.helpline}`}
                  className="px-3.5 py-1.5 rounded-full bg-[#173D32] hover:bg-[#1a4437] text-[#F6F4EC] font-bold text-xs transition-colors inline-flex items-center gap-1.5"
                >
                  <PhoneCall className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{designatedShelter.contactPerson?.phone || designatedShelter.helpline}</span>
                </a>
              </div>
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs mb-4">
              <div className="p-3.5 rounded-2xl bg-white border border-[#173D32]/10">
                <span className="text-[10px] font-bold uppercase text-[#173D32]/60 block mb-0.5">
                  Surveyed Distance
                </span>
                <span className="text-base font-extrabold text-[#173D32] block">
                  {designatedShelter.distanceKm != null
                    ? `${designatedShelter.distanceKm} km`
                    : "On-site survey"}
                </span>
                <span className="text-[10px] text-[#173D32]/65">
                  {designatedShelter.distanceKm != null
                    ? `~${Math.round(designatedShelter.distanceKm * 14)} mins uphill walk`
                    : "High-ground trail"}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-white border border-[#173D32]/10">
                <span className="text-[10px] font-bold uppercase text-[#173D32]/60 block mb-0.5">
                  Capacity
                </span>
                <span className="text-base font-extrabold text-[#173D32] block">
                  {designatedShelter.capacity} Persons
                </span>
                <span className="text-[10px] text-[#173D32]/65">Verified bedrock stability</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-white border border-[#173D32]/10">
                <span className="text-[10px] font-bold uppercase text-[#173D32]/60 block mb-0.5">
                  Representative
                </span>
                <span className="text-sm font-extrabold text-[#173D32] block truncate">
                  {designatedShelter.contactPerson?.name || "Elder on Duty"}
                </span>
                <span className="text-[10px] text-[#173D32]/65 block truncate">
                  {designatedShelter.contactPerson?.designation || "Staging In-Charge"}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-white border border-[#173D32]/10">
                <span className="text-[10px] font-bold uppercase text-[#173D32]/60 block mb-0.5">
                  Coordinates
                </span>
                <span className="text-sm font-mono font-bold text-[#173D32] block">
                  {designatedShelter.coordinates
                    ? `${designatedShelter.coordinates[1]}°N, ${designatedShelter.coordinates[0]}°E`
                    : "Registered"}
                </span>
                <span className="text-[10px] text-[#173D32]/65">High-elevation ridgeline</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 mb-4">
              {designatedShelter.amenities.map((amenity) => (
                <span
                  key={amenity}
                  className="px-2.5 py-1 rounded-full bg-[#F6F4EC] border border-[#173D32]/12 text-[11px] font-semibold text-[#173D32]"
                >
                  {amenity}
                </span>
              ))}
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/75 border border-emerald-200 text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-[#173D32] uppercase tracking-wider text-[11px]">
                <Compass className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
                <span>Evacuation Directions</span>
              </div>
              <p className="text-[#173D32]/90">
                <strong>Footpath Route:</strong> {designatedShelter.walkingDirections}
              </p>
              <p className="text-[#173D32]/80 text-[11px]">
                <strong>Vehicular Access:</strong> {designatedShelter.drivingDirections}
              </p>
            </div>
          </PortalSectionCard>
        )}

        {/* Filter Bar + Shelter Catalog Grid */}
        <PortalFilterBar
          className="px-3 py-2.5 sm:px-4 sm:py-3"
          left={
            <div className="flex flex-wrap items-center gap-1.5">
              {["All", "Assam", "Nagaland", "Sikkim", "Meghalaya"].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setSelectedStateFilter(st)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    selectedStateFilter === st
                      ? "bg-[#173D32] text-[#F6F4EC] shadow-xs"
                      : "bg-white text-[#173D32]/75 border border-[#173D32]/12 hover:bg-[#DCE8D4]/40 hover:text-[#173D32]"
                  }`}
                >
                  {st === "All" ? "All States" : st}
                </button>
              ))}
            </div>
          }
          right={
            <div className="relative w-full sm:w-72">
              <Search
                className="w-3.5 h-3.5 text-[#173D32]/50 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                id="citizen-shelters-search"
                name="citizen-shelters-search"
                type="text"
                aria-label="Search shelters by name, district, or state"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search shelters, district, or state..."
                className="w-full h-9 pl-8 pr-8 rounded-full bg-white border border-[#173D32]/15 text-xs text-[#173D32] placeholder:text-[#173D32]/45 focus:outline-none focus:ring-1 focus:ring-[#173D32]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear shelter search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#173D32]/55 hover:text-[#173D32] cursor-pointer p-0.5"
                >
                  <X className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              )}
            </div>
          }
        />

        {/* Shelters Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredShelters.map((shelter) => {
            const isSelected = activeShelter.id === shelter.id;
            const isPrimary = designatedShelter?.id === shelter.id;

            return (
              <div
                key={shelter.id}
                className={`relative rounded-2xl bg-[#FAF8F2] border shadow-xs p-5 overflow-hidden flex flex-col justify-between transition-colors ${
                  isSelected
                    ? "border-[#173D32] ring-1 ring-[#173D32]/25"
                    : "border-[#173D32]/12 hover:bg-[#FCFBF8]"
                }`}
              >
                <div className="absolute top-0 bottom-0 left-0 w-1 bg-emerald-600" />
                <div className="pl-2">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#173D32]/65">
                          {shelter.district}, {shelter.state}
                        </span>
                        {isPrimary && (
                          <span className="px-2 py-0.5 rounded-full bg-[#DCE8D4] text-[#173D32] text-[10px] font-bold uppercase">
                            Primary
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-extrabold text-[#173D32]">
                        {shelter.name}
                      </h3>
                    </div>
                    <StatusBadge status="open" label={shelter.status} size="xs" />
                  </div>

                  <p className="text-xs text-[#173D32]/75 flex items-center gap-1.5 mb-3">
                    <MapPin className="w-3.5 h-3.5 text-[#D6A65D] shrink-0" aria-hidden="true" />
                    <span>{shelter.address}</span>
                  </p>

                  <div className="p-3 rounded-xl bg-white border border-[#173D32]/10 text-xs mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#173D32]/55 block">
                        Capacity
                      </span>
                      <span className="font-bold text-[#173D32]">
                        {shelter.capacity} Persons
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-[#173D32]/55 block">
                        Distance
                      </span>
                      <span className="font-bold text-[#173D32]">
                        {shelter.distanceKm ? `${shelter.distanceKm} km` : "Surveyed"}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {shelter.amenities.slice(0, 3).map((amenity) => (
                      <span
                        key={amenity}
                        className="px-2.5 py-0.5 rounded-full bg-[#DCE8D4]/55 text-[#173D32] text-[11px] font-semibold"
                      >
                        {amenity}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pl-2 pt-3 border-t border-[#173D32]/10 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setActiveShelterId(shelter.id)}
                    className={`px-3.5 py-1.5 rounded-full font-bold transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-[#173D32] text-[#F6F4EC]"
                        : "bg-[#173D32]/10 text-[#173D32] hover:bg-[#173D32]/18"
                    }`}
                  >
                    {isSelected ? "Inspecting on Map" : "Inspect on Map"}
                  </button>

                  <a
                    href={`tel:${shelter.contactPerson?.phone || shelter.helpline}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold transition-colors"
                  >
                    <PhoneCall className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{shelter.contactPerson?.phone || shelter.helpline}</span>
                  </a>
                </div>
              </div>
            );
          })}
        </div>

        {/* Interactive Evacuation Terrain Map */}
        <PortalSectionCard
          title="Evacuation Terrain & Shelter Map"
          subtitle={`Currently inspecting: ${activeShelter.name} (${activeShelter.district}, ${activeShelter.state})`}
          icon={<MapPin className="w-4 h-4 text-[#173D32]" aria-hidden="true" />}
          actions={
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                `${activeShelter.name}, ${activeShelter.district}, ${activeShelter.state}`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-1.5 rounded-full bg-[#173D32] text-[#F6F4EC] text-xs font-bold hover:bg-[#1a4437] transition-colors inline-flex items-center gap-1.5"
            >
              <span>External Maps</span>
              <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
            </a>
          }
        >
          <div className="h-[300px] sm:h-[400px] w-full rounded-2xl overflow-hidden border border-[#173D32]/15 relative shadow-xs">
            <RiskMap
              variant="mini"
              className="w-full h-full"
              selectedState={activeShelter.state}
              center={activeShelter.coordinates || [94.02, 25.72]}
            />
          </div>
          <p className="mt-3 text-[11px] text-[#173D32]/70 leading-relaxed">
            Follow signposted uphill village evacuation paths and district civil defense notices during active rainfall alerts.
          </p>
        </PortalSectionCard>
      </div>
    </PortalLayout>
  );
}
