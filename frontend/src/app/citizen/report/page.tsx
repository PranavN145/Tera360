"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Camera,
  CheckCircle2,
  ClipboardList,
  Crosshair,
  MapPin,
  PhoneCall,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  X,
} from "lucide-react";
import PortalLayout from "@/components/portal/PortalLayout";
import PortalSectionCard from "@/components/portal/PortalSectionCard";
import PortalSplitLayout from "@/components/portal/PortalSplitLayout";
import StatusBadge from "@/components/ui/StatusBadge";
import { useApp } from "@/context/AppContext";
import { publicApi, reportsApi } from "@/lib/api";
import { HazardReportOutput } from "@/types/public";
import { DEMO_VILLAGES } from "@/data/villages";

const HAZARD_CATEGORIES = [
  "Landslide",
  "Road blockage",
  "Road cracks",
  "Flooding",
  "Slope instability",
  "Retaining wall damage",
  "Other emergencies",
];

const NORTHEAST_STATES = [
  "Nagaland",
  "Assam",
  "Sikkim",
  "Meghalaya",
  "Arunachal Pradesh",
  "Manipur",
  "Mizoram",
  "Tripura",
];

interface UploadedPhoto {
  id: string;
  file: File;
  previewUrl: string;
  name: string;
  sizeKb: number;
}

export default function CitizenReportPage() {
  const { user, addToast } = useApp();

  const [activeTab, setActiveTab] = useState<"form" | "history">("form");

  const [incidentTitle, setIncidentTitle] = useState("");
  const [hazardCategory, setHazardCategory] = useState(HAZARD_CATEGORIES[0]);
  const [severity, setSeverity] = useState<"Warning" | "Critical" | "Watch">("Warning");
  const [state, setState] = useState(user?.village?.state || NORTHEAST_STATES[0]);
  const [district, setDistrict] = useState(user?.village?.district || "");
  const [villageName, setVillageName] = useState(user?.village?.villageName || "");
  const [locationMilestone, setLocationMilestone] = useState("");
  const [description, setDescription] = useState("");
  const [observedAt, setObservedAt] = useState(() => new Date().toISOString().slice(0, 16));

  const [reporterName, setReporterName] = useState(user?.name || "");
  const [reporterPhone, setReporterPhone] = useState(user?.phone || "");

  const [coords, setCoords] = useState<{ lat: number | null; lng: number | null }>({
    lat: null,
    lng: null,
  });
  const [isLocating, setIsLocating] = useState(false);
  const [gpsNotice, setGpsNotice] = useState<string | null>(null);

  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedTicketId, setSubmittedTicketId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [myReports, setMyReports] = useState<HazardReportOutput[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(true);
  const [reportsError, setReportsError] = useState<string | null>(null);

  const fetchMyReports = useCallback(async () => {
    setIsLoadingReports(true);
    setReportsError(null);
    try {
      const data = await reportsApi.getMyReports();
      setMyReports(data);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Unable to retrieve your submitted reports.";
      setReportsError(msg);
    } finally {
      setIsLoadingReports(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        const data = await reportsApi.getMyReports();
        if (mounted) {
          setMyReports(data);
          setReportsError(null);
        }
      } catch (err: unknown) {
        if (mounted) {
          const msg = err instanceof Error ? err.message : "Unable to load reports.";
          setReportsError(msg);
        }
      } finally {
        if (mounted) {
          setIsLoadingReports(false);
        }
      }
    }

    void loadData();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      photos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    };
  }, [photos]);

  const handleDetectGPS = () => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setGpsNotice(
        "Geolocation is not supported by your browser. Please enter coordinates manually."
      );
      return;
    }

    setIsLocating(true);
    setGpsNotice(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        setCoords({ lat, lng });
        setGpsNotice(`GPS Signal Acquired (±${Math.round(pos.coords.accuracy)}m accuracy)`);
        addToast({
          title: "GPS Located",
          description: `Coordinates locked: ${lat}°N, ${lng}°E`,
          type: "success",
        });
      },
      (err) => {
        setIsLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGpsNotice(
            "Location permission was denied. You may input coordinates manually or continue with manual landmark."
          );
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setGpsNotice(
            "Satellite GPS positioning unavailable. Continuing with manual landmark."
          );
        } else {
          setGpsNotice("Location request timed out. Continuing with manual landmark.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  };

  const handleClearGPS = () => {
    setCoords({ lat: null, lng: null });
    setGpsNotice(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhotoError(null);
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (photos.length + files.length > 3) {
      setPhotoError("Maximum 3 photographs allowed per hazard report.");
      return;
    }

    const newPhotos: UploadedPhoto[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        setPhotoError(
          `Invalid file format '${file.name}'. Only JPEG, PNG, or WebP images are permitted.`
        );
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        setPhotoError(`File '${file.name}' exceeds the 5 MB size limit.`);
        continue;
      }

      const previewUrl = URL.createObjectURL(file);
      newPhotos.push({
        id: `${file.name}-${Date.now()}-${Math.random()}`,
        file,
        previewUrl,
        name: file.name,
        sizeKb: Math.round(file.size / 1024),
      });
    }

    setPhotos((prev) => [...prev, ...newPhotos]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemovePhoto = (id: string) => {
    setPhotos((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setFormError(null);

    if (!state.trim()) {
      setFormError("Please select a Northeast state.");
      return;
    }
    if (!locationMilestone.trim()) {
      setFormError("Please provide a milestone, road stretch, or landmark.");
      return;
    }
    if (description.trim().length < 5) {
      setFormError("Description must be at least 5 characters explaining observed conditions.");
      return;
    }

    setIsSubmitting(true);

    try {
      const locationParts = [
        villageName.trim() ? `${villageName.trim()} Village` : "",
        district.trim() ? `${district.trim()} District` : "",
        locationMilestone.trim(),
      ].filter(Boolean);
      const combinedLocation = locationParts.join(", ");

      const descriptionParts = [
        incidentTitle.trim() ? `[Incident: ${incidentTitle.trim()}]` : "",
        observedAt ? `[Observed: ${new Date(observedAt).toLocaleString()}]` : "",
        description.trim(),
      ].filter(Boolean);
      const combinedDescription = descriptionParts.join("\n\n");

      const coordinatesPayload =
        coords.lat !== null && coords.lng !== null
          ? {
              type: "Point" as const,
              coordinates: [coords.lng, coords.lat] as [number, number],
            }
          : undefined;

      const response = await publicApi.submitHazardReport({
        state,
        location: combinedLocation,
        hazardType: hazardCategory,
        severity,
        description: combinedDescription,
        reporterName: reporterName.trim() || undefined,
        reporterPhone: reporterPhone.trim() || undefined,
        coordinates: coordinatesPayload,
        captchaToken:
          process.env.NEXT_PUBLIC_DEV_CAPTCHA_TOKEN || "1x0000000000000000000000000000000AA",
      });

      setSubmittedTicketId(response.reportId);

      addToast({
        title: "Hazard Report Dispatched",
        description: `Logged under reference ${response.reportId}. District disaster officers notified.`,
        type: "success",
      });

      setIncidentTitle("");
      setLocationMilestone("");
      setDescription("");
      setCoords({ lat: null, lng: null });
      setGpsNotice(null);
      setPhotos([]);

      void fetchMyReports();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to dispatch hazard report to server.";
      setFormError(msg);
      addToast({
        title: "Submission Error",
        description: msg,
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const suggestedVillages = useMemo(() => {
    return DEMO_VILLAGES.filter((v) => v.state.toLowerCase() === state.toLowerCase());
  }, [state]);

  return (
    <PortalLayout
      allowedRoles={["citizen", "driver", "admin"]}
      title="Report Local Landslide Danger"
      subtitle="Transmit ground-truth hazard observations, road subsidence, and slope fissures to District Disaster Officers."
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
        {/* Top Mode Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#173D32]/10 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("form")}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                activeTab === "form"
                  ? "bg-[#173D32] text-[#F6F4EC] shadow-xs"
                  : "bg-[#FAF8F2] text-[#173D32]/80 border border-[#173D32]/15 hover:text-[#173D32]"
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Submit Incident Report</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("history");
                void fetchMyReports();
              }}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                activeTab === "history"
                  ? "bg-[#173D32] text-[#F6F4EC] shadow-xs"
                  : "bg-[#FAF8F2] text-[#173D32]/80 border border-[#173D32]/15 hover:text-[#173D32]"
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5" aria-hidden="true" />
              <span>My Submitted Reports ({myReports.length})</span>
            </button>
          </div>

          <span className="text-[11px] font-semibold text-[#173D32]/65">
            Official SDMA Dispatch Pipeline
          </span>
        </div>

        <PortalSplitLayout
          leftSpan={7}
          left={
            activeTab === "form" ? (
              <PortalSectionCard
                title="Submit Ground Hazard Observation"
                subtitle="Directly routed to regional emergency cells and highway patrol"
                icon={<AlertTriangle className="w-4 h-4 text-[#B45E09]" aria-hidden="true" />}
              >
                {submittedTicketId ? (
                  <div className="py-8 px-4 text-center space-y-5">
                    <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-7 h-7" aria-hidden="true" />
                    </div>
                    <div>
                      <h3 className="text-xl font-extrabold text-[#173D32]">
                        Hazard Report Dispatched Successfully
                      </h3>
                      <p className="text-xs text-[#173D32]/75 mt-1 max-w-md mx-auto leading-relaxed">
                        Your ground observation has been logged into the state emergency response desk.
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-white border border-[#173D32]/12 max-w-sm mx-auto text-left">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#173D32]/60 block">
                        Assigned Ticket Reference
                      </span>
                      <span className="text-lg font-mono font-bold text-[#173D32] block mt-0.5">
                        {submittedTicketId}
                      </span>
                      <span className="text-[11px] text-emerald-700 font-semibold block mt-1">
                        Status: SUBMITTED · Pending Field Verification
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => setSubmittedTicketId(null)}
                        className="px-5 py-2.5 rounded-full bg-white border border-[#173D32]/15 text-[#173D32] font-bold text-xs hover:bg-[#F6F4EC] cursor-pointer"
                      >
                        Submit Another Incident
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSubmittedTicketId(null);
                          setActiveTab("history");
                          void fetchMyReports();
                        }}
                        className="px-5 py-2.5 rounded-full bg-[#173D32] text-[#F6F4EC] font-bold text-xs hover:bg-[#1a4437] cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <span>View in My Reports</span>
                        <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    {formError && (
                      <div className="p-3.5 rounded-2xl bg-red-50 text-red-900 border border-red-200 text-xs flex items-center gap-2.5">
                        <AlertTriangle className="w-4 h-4 text-red-700 shrink-0" aria-hidden="true" />
                        <span className="font-semibold">{formError}</span>
                      </div>
                    )}

                    {/* 1. Incident Summary & Hazard Category */}
                    <div className="space-y-4">
                      <div>
                        <label
                          htmlFor="citizen-report-title"
                          className="block text-xs font-bold text-[#173D32] uppercase tracking-wider mb-1.5"
                        >
                          Incident Summary / Title
                        </label>
                        <input
                          id="citizen-report-title"
                          name="incidentTitle"
                          type="text"
                          value={incidentTitle}
                          onChange={(e) => setIncidentTitle(e.target.value)}
                          placeholder="e.g. Major rockfall blocking NH-29 uphill carriageway"
                          className="w-full h-11 px-4 rounded-xl bg-white border border-[#173D32]/15 text-xs sm:text-sm text-[#173D32] focus:outline-none focus:ring-2 focus:ring-[#173D32]"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label
                            htmlFor="citizen-report-category"
                            className="block text-xs font-bold text-[#173D32] uppercase tracking-wider mb-1.5"
                          >
                            Hazard Category *
                          </label>
                          <select
                            id="citizen-report-category"
                            name="hazardCategory"
                            value={hazardCategory}
                            onChange={(e) => setHazardCategory(e.target.value)}
                            className="w-full h-11 px-4 rounded-xl bg-white border border-[#173D32]/15 text-xs sm:text-sm font-semibold text-[#173D32] focus:outline-none focus:ring-2 focus:ring-[#173D32]"
                            required
                          >
                            {HAZARD_CATEGORIES.map((cat) => (
                              <option key={cat} value={cat}>
                                {cat}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label
                            htmlFor="citizen-report-severity"
                            className="block text-xs font-bold text-[#173D32] uppercase tracking-wider mb-1.5"
                          >
                            Assessed Urgency *
                          </label>
                          <select
                            id="citizen-report-severity"
                            name="severity"
                            value={severity}
                            onChange={(e) =>
                              setSeverity(e.target.value as "Warning" | "Critical" | "Watch")
                            }
                            className="w-full h-11 px-4 rounded-xl bg-white border border-[#173D32]/15 text-xs sm:text-sm font-semibold text-[#173D32] focus:outline-none focus:ring-2 focus:ring-[#173D32]"
                            required
                          >
                            <option value="Warning">Warning — Threatens passage / unstable slope</option>
                            <option value="Critical">Critical — Immediate danger or active slide</option>
                            <option value="Watch">Watch — Early cracks or minor seepage</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* 2. Settlement & Location */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                      <div>
                        <label
                          htmlFor="citizen-report-state"
                          className="block text-xs font-bold text-[#173D32] uppercase tracking-wider mb-1.5"
                        >
                          State / Territory *
                        </label>
                        <select
                          id="citizen-report-state"
                          name="state"
                          value={state}
                          onChange={(e) => setState(e.target.value)}
                          className="w-full h-11 px-3.5 rounded-xl bg-white border border-[#173D32]/15 text-xs sm:text-sm font-semibold text-[#173D32] focus:outline-none focus:ring-2 focus:ring-[#173D32]"
                          required
                        >
                          {NORTHEAST_STATES.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label
                          htmlFor="citizen-report-district"
                          className="block text-xs font-bold text-[#173D32] uppercase tracking-wider mb-1.5"
                        >
                          District
                        </label>
                        <input
                          id="citizen-report-district"
                          name="district"
                          type="text"
                          value={district}
                          onChange={(e) => setDistrict(e.target.value)}
                          placeholder="e.g. Kohima"
                          className="w-full h-11 px-3.5 rounded-xl bg-white border border-[#173D32]/15 text-xs sm:text-sm text-[#173D32] focus:outline-none focus:ring-2 focus:ring-[#173D32]"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="citizen-report-village"
                          className="block text-xs font-bold text-[#173D32] uppercase tracking-wider mb-1.5"
                        >
                          Village / Settlement
                        </label>
                        <input
                          id="citizen-report-village"
                          name="villageName"
                          type="text"
                          value={villageName}
                          onChange={(e) => setVillageName(e.target.value)}
                          placeholder="e.g. Phesama"
                          list="citizen-village-suggestions"
                          className="w-full h-11 px-3.5 rounded-xl bg-white border border-[#173D32]/15 text-xs sm:text-sm text-[#173D32] focus:outline-none focus:ring-2 focus:ring-[#173D32]"
                        />
                        <datalist id="citizen-village-suggestions">
                          {suggestedVillages.map((v) => (
                            <option key={v.id} value={v.name} />
                          ))}
                        </datalist>
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="citizen-report-location"
                        className="block text-xs font-bold text-[#173D32] uppercase tracking-wider mb-1.5"
                      >
                        Specific Milestone / Highway Corridor / Landmark *
                      </label>
                      <input
                        id="citizen-report-location"
                        name="locationMilestone"
                        type="text"
                        value={locationMilestone}
                        onChange={(e) => setLocationMilestone(e.target.value)}
                        placeholder="e.g. Near KM 42 landmark on bypass, opposite Baptist Church gully"
                        className="w-full h-11 px-4 rounded-xl bg-white border border-[#173D32]/15 text-xs sm:text-sm text-[#173D32] focus:outline-none focus:ring-2 focus:ring-[#173D32]"
                        required
                      />
                    </div>

                    {/* 3. GPS Coordinates */}
                    <div className="p-4 rounded-2xl bg-white border border-[#173D32]/12 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <span className="text-xs font-bold text-[#173D32] block">
                            GPS Coordinates (Optional)
                          </span>
                          <p className="text-[11px] text-[#173D32]/70">
                            Capture device location or enter latitude and longitude manually.
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                          <button
                            type="button"
                            onClick={handleDetectGPS}
                            disabled={isLocating}
                            className="px-3.5 py-1.5 rounded-full bg-[#173D32] text-[#F6F4EC] text-xs font-bold hover:bg-[#1a4437] transition-colors inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            <Crosshair className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>{isLocating ? "Acquiring GPS..." : "Detect GPS"}</span>
                          </button>

                          {(coords.lat !== null || coords.lng !== null) && (
                            <button
                              type="button"
                              onClick={handleClearGPS}
                              className="px-3 py-1.5 rounded-full bg-[#173D32]/10 hover:bg-[#173D32]/15 text-[#173D32] text-xs font-bold cursor-pointer"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                      </div>

                      {gpsNotice && (
                        <p className="p-2.5 rounded-xl bg-[#DCE8D4]/55 text-[11px] text-[#173D32] font-medium">
                          {gpsNotice}
                        </p>
                      )}

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label
                            htmlFor="citizen-report-lat"
                            className="block text-[10px] font-bold text-[#173D32]/65 uppercase tracking-wider mb-1"
                          >
                            Latitude (°N)
                          </label>
                          <input
                            id="citizen-report-lat"
                            name="latitude"
                            type="number"
                            step="0.000001"
                            value={coords.lat !== null ? coords.lat : ""}
                            onChange={(e) =>
                              setCoords((prev) => ({
                                ...prev,
                                lat: e.target.value ? parseFloat(e.target.value) : null,
                              }))
                            }
                            placeholder="25.642150"
                            className="w-full h-10 px-3 rounded-xl bg-[#FAF8F2] border border-[#173D32]/12 text-xs text-[#173D32] font-mono"
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="citizen-report-lng"
                            className="block text-[10px] font-bold text-[#173D32]/65 uppercase tracking-wider mb-1"
                          >
                            Longitude (°E)
                          </label>
                          <input
                            id="citizen-report-lng"
                            name="longitude"
                            type="number"
                            step="0.000001"
                            value={coords.lng !== null ? coords.lng : ""}
                            onChange={(e) =>
                              setCoords((prev) => ({
                                ...prev,
                                lng: e.target.value ? parseFloat(e.target.value) : null,
                              }))
                            }
                            placeholder="94.112480"
                            className="w-full h-10 px-3 rounded-xl bg-[#FAF8F2] border border-[#173D32]/12 text-xs text-[#173D32] font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    {/* 4. Photo Evidence */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-[#173D32] uppercase tracking-wider">
                          Photo Evidence (Max 3 Images)
                        </span>
                        <span className="text-[11px] text-[#173D32]/65">JPEG, PNG, WebP &lt; 5MB</span>
                      </div>

                      {photoError && (
                        <div className="p-3 rounded-xl bg-red-50 text-red-900 border border-red-200 text-xs">
                          {photoError}
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-3">
                        <input
                          type="file"
                          ref={fileInputRef}
                          accept="image/jpeg,image/png,image/webp"
                          multiple
                          onChange={handleFileChange}
                          className="hidden"
                          id="citizen-hazard-photo-input"
                        />
                        <label
                          htmlFor="citizen-hazard-photo-input"
                          className="px-4 py-2 rounded-full bg-white hover:bg-[#F6F4EC] border border-[#173D32]/20 text-xs font-bold text-[#173D32] transition-colors cursor-pointer inline-flex items-center gap-1.5"
                        >
                          <Camera className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Attach Photos ({photos.length}/3)</span>
                        </label>
                        <span className="text-[11px] text-[#173D32]/65">
                          Previewed locally in browser until cloud bucket storage is enabled.
                        </span>
                      </div>

                      {photos.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                          {photos.map((photo) => (
                            <div
                              key={photo.id}
                              className="p-2.5 rounded-2xl bg-white border border-[#173D32]/12 space-y-2"
                            >
                              <div className="h-24 w-full rounded-xl overflow-hidden bg-[#F6F4EC] border border-[#173D32]/10">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={photo.previewUrl}
                                  alt={photo.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-[#173D32]">
                                <span className="font-semibold truncate min-w-0 flex-1">
                                  {photo.name}
                                </span>
                                <span className="text-[#173D32]/60 shrink-0">{photo.sizeKb} KB</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemovePhoto(photo.id)}
                                className="w-full py-1 rounded-full bg-red-50 hover:bg-red-100 text-red-700 font-bold text-[10px] inline-flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <X className="w-3 h-3" aria-hidden="true" />
                                <span>Remove</span>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 5. Observation Timing, Contact & Narrative */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label
                          htmlFor="citizen-report-observed-at"
                          className="block text-xs font-bold text-[#173D32] uppercase tracking-wider mb-1.5"
                        >
                          Observed At *
                        </label>
                        <input
                          id="citizen-report-observed-at"
                          name="observedAt"
                          type="datetime-local"
                          value={observedAt}
                          onChange={(e) => setObservedAt(e.target.value)}
                          className="w-full h-11 px-3 rounded-xl bg-white border border-[#173D32]/15 text-xs text-[#173D32]"
                          required
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="citizen-report-name"
                          className="block text-xs font-bold text-[#173D32] uppercase tracking-wider mb-1.5"
                        >
                          Reporter Name
                        </label>
                        <input
                          id="citizen-report-name"
                          name="reporterName"
                          type="text"
                          value={reporterName}
                          onChange={(e) => setReporterName(e.target.value)}
                          placeholder="Your Name"
                          className="w-full h-11 px-3.5 rounded-xl bg-white border border-[#173D32]/15 text-xs text-[#173D32]"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="citizen-report-phone"
                          className="block text-xs font-bold text-[#173D32] uppercase tracking-wider mb-1.5"
                        >
                          Contact Phone
                        </label>
                        <input
                          id="citizen-report-phone"
                          name="reporterPhone"
                          type="tel"
                          value={reporterPhone}
                          onChange={(e) => setReporterPhone(e.target.value)}
                          placeholder="+91 98765 43210"
                          className="w-full h-11 px-3.5 rounded-xl bg-white border border-[#173D32]/15 text-xs text-[#173D32]"
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="citizen-report-description"
                        className="block text-xs font-bold text-[#173D32] uppercase tracking-wider mb-1.5"
                      >
                        Detailed Observations &amp; Road Status *
                      </label>
                      <textarea
                        id="citizen-report-description"
                        name="description"
                        rows={4}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Describe slope cracks, mud depth, blocked lanes, or proximate dwellings..."
                        className="w-full p-3.5 rounded-xl bg-white border border-[#173D32]/15 text-xs sm:text-sm text-[#173D32] focus:outline-none focus:ring-2 focus:ring-[#173D32] resize-none"
                        required
                      />
                    </div>

                    <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <span className="text-[11px] text-[#173D32]/70">
                        Routed directly to State Disaster Management Authority (SDMA).
                      </span>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-6 py-2.5 rounded-full bg-[#173D32] hover:bg-[#1a4437] text-[#F6F4EC] text-xs font-bold transition-colors shadow-xs inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {isSubmitting ? (
                          <span>Transmitting Incident...</span>
                        ) : (
                          <>
                            <span>Dispatch Hazard Report</span>
                            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </PortalSectionCard>
            ) : (
              <PortalSectionCard
                title="My Submitted Hazard Reports"
                subtitle={`History dispatched from ${user?.email || "your citizen account"}`}
                icon={<ClipboardList className="w-4 h-4 text-[#173D32]" aria-hidden="true" />}
                actions={
                  <button
                    type="button"
                    onClick={fetchMyReports}
                    disabled={isLoadingReports}
                    className="px-3.5 py-1.5 rounded-full bg-white hover:bg-[#F6F4EC] border border-[#173D32]/15 text-xs font-bold text-[#173D32] inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${isLoadingReports ? "animate-spin" : ""}`}
                      aria-hidden="true"
                    />
                    <span>{isLoadingReports ? "Syncing..." : "Refresh"}</span>
                  </button>
                }
              >
                {reportsError && (
                  <div className="mb-4 p-3.5 rounded-2xl bg-amber-50 text-amber-900 border border-amber-200 text-xs flex items-center justify-between">
                    <span>{reportsError}</span>
                    <button
                      type="button"
                      onClick={fetchMyReports}
                      className="px-3 py-1 rounded-full bg-amber-200 font-bold text-amber-950 cursor-pointer"
                    >
                      Retry
                    </button>
                  </div>
                )}

                {isLoadingReports ? (
                  <p className="py-10 text-center text-xs text-[#173D32]/65 animate-pulse">
                    Loading your submitted hazard records...
                  </p>
                ) : myReports.length === 0 ? (
                  <div className="py-10 text-center border border-dashed border-[#173D32]/20 rounded-2xl bg-white/60 space-y-3 px-4">
                    <ShieldCheck className="w-8 h-8 text-[#173D32]/60 mx-auto" aria-hidden="true" />
                    <div>
                      <h4 className="text-sm font-bold text-[#173D32]">
                        No Hazard Reports Logged Yet
                      </h4>
                      <p className="text-xs text-[#173D32]/70 max-w-md mx-auto mt-1">
                        Reports submitted from your citizen account will appear here with verification status updates.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab("form")}
                      className="px-4 py-2 rounded-full bg-[#173D32] text-[#F6F4EC] text-xs font-bold hover:bg-[#1a4437] cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <span>Submit First Report</span>
                      <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {myReports.map((report) => (
                      <div
                        key={report.reportId}
                        className="p-4 rounded-2xl bg-white border border-[#173D32]/12 shadow-2xs space-y-2 text-xs"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#173D32]/10">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2.5 py-0.5 rounded-full font-mono text-[11px] font-bold bg-[#F6F4EC] border border-[#173D32]/15 text-[#173D32]">
                              {report.reportId}
                            </span>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#173D32] text-[#F6F4EC]">
                              {report.hazardType}
                            </span>
                            <StatusBadge status={report.status} size="xs" />
                          </div>
                          <span className="text-[11px] text-[#173D32]/60">
                            {new Date(report.createdAt).toLocaleString()}
                          </span>
                        </div>

                        <p className="font-bold text-[#173D32] flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-[#D6A65D] shrink-0" aria-hidden="true" />
                          <span>
                            {report.location} ({report.state})
                          </span>
                        </p>
                        <p className="text-[#173D32]/85 leading-relaxed whitespace-pre-line">
                          {report.description}
                        </p>

                        {report.coordinates && (
                          <div className="p-2 rounded-xl bg-[#FAF8F2] border border-[#173D32]/10 text-[10px] font-mono text-[#173D32]/75 flex flex-wrap items-center justify-between gap-1.5">
                            <span>WGS-84 Coordinates</span>
                            <span>
                              {report.coordinates.coordinates[1]}°N, {report.coordinates.coordinates[0]}°E
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </PortalSectionCard>
            )
          }
          right={
            <div className="space-y-5">
              <PortalSectionCard
                title="Early Warning Signs to Report"
                subtitle="Key indicators of slope instability"
                icon={<ShieldAlert className="w-4 h-4 text-[#B45E09]" aria-hidden="true" />}
              >
                <ul className="space-y-2.5 text-xs text-[#173D32]/80">
                  <li className="p-3 rounded-xl bg-white border border-[#173D32]/10">
                    <strong className="text-[#173D32] block mb-0.5">
                      Fresh Tension Cracks
                    </strong>
                    Widening fissures on hillside pavement, retaining walls, or courtyards.
                  </li>
                  <li className="p-3 rounded-xl bg-white border border-[#173D32]/10">
                    <strong className="text-[#173D32] block mb-0.5">
                      Tilting Poles or Trees
                    </strong>
                    New leaning utility poles, fences, or bent trunks downslope.
                  </li>
                  <li className="p-3 rounded-xl bg-white border border-[#173D32]/10">
                    <strong className="text-[#173D32] block mb-0.5">
                      Sudden Muddy Seepage
                    </strong>
                    Abrupt discolored spring discharge or blocked roadside culverts.
                  </li>
                </ul>
              </PortalSectionCard>

              <div className="p-5 rounded-2xl bg-[#173D32] text-[#F6F4EC] shadow-xs space-y-3">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#D6A65D]">
                  <PhoneCall className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Immediate Danger?</span>
                </span>
                <p className="text-xs text-[#F6F4EC]/85 leading-relaxed">
                  If debris is actively entering dwellings or a highway carriageway, evacuate upslope first and dial toll-free emergency dispatch.
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <a
                    href="tel:1077"
                    className="px-3.5 py-2 rounded-full bg-[#D6A65D] text-[#173D32] text-xs font-extrabold hover:bg-[#c8964e] transition-colors"
                  >
                    SDMA Helpline 1077
                  </a>
                  <a
                    href="tel:112"
                    className="px-3.5 py-2 rounded-full bg-white/12 text-white border border-white/20 text-xs font-bold hover:bg-white/20 transition-colors"
                  >
                    Emergency 112
                  </a>
                </div>
              </div>
            </div>
          }
        />
      </div>
    </PortalLayout>
  );
}
