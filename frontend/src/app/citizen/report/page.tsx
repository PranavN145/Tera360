"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import PortalLayout from "@/components/portal/PortalLayout";
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

  // Active view tab: "form" for submitting, "history" for viewing submitted reports
  const [activeTab, setActiveTab] = useState<"form" | "history">("form");

  // Form Fields
  const [incidentTitle, setIncidentTitle] = useState("");
  const [hazardCategory, setHazardCategory] = useState(HAZARD_CATEGORIES[0]);
  const [severity, setSeverity] = useState<"Warning" | "Critical" | "Watch">("Warning");
  const [state, setState] = useState(user?.village?.state || NORTHEAST_STATES[0]);
  const [district, setDistrict] = useState(user?.village?.district || "");
  const [villageName, setVillageName] = useState(user?.village?.villageName || "");
  const [locationMilestone, setLocationMilestone] = useState("");
  const [description, setDescription] = useState("");
  const [observedAt, setObservedAt] = useState(() => new Date().toISOString().slice(0, 16));

  // Contact pre-fill from authenticated citizen profile
  const [reporterName, setReporterName] = useState(user?.name || "");
  const [reporterPhone, setReporterPhone] = useState(user?.phone || "");

  // GPS Geolocation state
  const [coords, setCoords] = useState<{ lat: number | null; lng: number | null }>({
    lat: null,
    lng: null,
  });
  const [isLocating, setIsLocating] = useState(false);
  const [gpsNotice, setGpsNotice] = useState<string | null>(null);

  // Photo uploads (client-side preview, validation, limits)
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Submission Progress & Results
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedTicketId, setSubmittedTicketId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // "My Submitted Reports" Live Data State
  const [myReports, setMyReports] = useState<HazardReportOutput[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(true);
  const [reportsError, setReportsError] = useState<string | null>(null);

  // Load authenticated citizen reports from backend
  const fetchMyReports = useCallback(async () => {
    setIsLoadingReports(true);
    setReportsError(null);
    try {
      const data = await reportsApi.getMyReports();
      setMyReports(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unable to retrieve your submitted reports.";
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

  // Browser Geolocation Assistance
  const handleDetectGPS = () => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setGpsNotice("Geolocation is not supported by your browser. Please enter coordinates manually.");
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
          setGpsNotice("Location permission was denied. You may input coordinates manually or skip GPS.");
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setGpsNotice("Satellite GPS positioning unavailable. Continuing with manual landmark.");
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

  // Photo file picker handler
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

      // Validate MIME type
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        setPhotoError(`Invalid file format '${file.name}'. Only JPEG, PNG, or WebP images are permitted.`);
        continue;
      }

      // Validate file size (max 5 MB)
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

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      photos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    };
  }, [photos]);

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setFormError(null);

    // Front-end Validation
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
      // Build location string with village and district context
      const locationParts = [
        villageName.trim() ? `${villageName.trim()} Village` : "",
        district.trim() ? `${district.trim()} District` : "",
        locationMilestone.trim(),
      ].filter(Boolean);
      const combinedLocation = locationParts.join(", ");

      // Build structured narrative description
      const descriptionParts = [
        incidentTitle.trim() ? `[Incident: ${incidentTitle.trim()}]` : "",
        observedAt ? `[Observed: ${new Date(observedAt).toLocaleString()}]` : "",
        description.trim(),
      ].filter(Boolean);
      const combinedDescription = descriptionParts.join("\n\n");

      // Build coordinates if acquired
      const coordinatesPayload =
        coords.lat !== null && coords.lng !== null
          ? {
              type: "Point" as const,
              coordinates: [coords.lng, coords.lat] as [number, number],
            }
          : undefined;

      // Submit via real backend endpoint
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

      // Reset form fields
      setIncidentTitle("");
      setLocationMilestone("");
      setDescription("");
      setCoords({ lat: null, lng: null });
      setGpsNotice(null);
      setPhotos([]);

      // Refresh my reports in background
      void fetchMyReports();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to dispatch hazard report to server.";
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

  // Village autofill suggestion from centralized dataset
  const suggestedVillages = useMemo(() => {
    return DEMO_VILLAGES.filter(
      (v) => v.state.toLowerCase() === state.toLowerCase()
    );
  }, [state]);

  return (
    <PortalLayout
      allowedRoles={["citizen"]}
      title="Citizen Hazard & Landslide Reporting"
      subtitle="Transmit ground-truth landslide observations, road subsidence, and slope fissures directly to District Disaster Officers."
    >
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* ── Navigation Tabs ──────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-3 border-b border-[#173D32]/12 pb-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("form")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === "form"
                  ? "bg-[#173D32] text-[#F6F4EC] shadow-2xs"
                  : "bg-white text-[#173D32] border border-[#173D32]/15 hover:bg-[#F6F4EC]"
              }`}
            >
              <span>⚠️</span>
              <span>Submit Incident Report</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("history");
                void fetchMyReports();
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === "history"
                  ? "bg-[#173D32] text-[#F6F4EC] shadow-2xs"
                  : "bg-white text-[#173D32] border border-[#173D32]/15 hover:bg-[#F6F4EC]"
              }`}
            >
              <span>📋</span>
              <span>My Submitted Reports ({myReports.length})</span>
            </button>
          </div>

          <span className="text-[11px] text-[#173D32]/60 hidden sm:inline-block">
            Official SDMA Dispatch Pipeline
          </span>
        </div>

        {/* ── TAB 1: Incident Reporting Form ───────────────────────────────── */}
        {activeTab === "form" && (
          <div className="space-y-6">
            {submittedTicketId ? (
              <div className="p-8 sm:p-10 bg-[#FAF8F2] rounded-3xl border border-[#173D32]/15 shadow-xs text-center space-y-5">
                <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-800 text-3xl flex items-center justify-center mx-auto shadow-2xs">
                  ✓
                </div>
                <h2 className="text-2xl font-black text-[#173D32]">
                  Hazard Report Dispatched Successfully
                </h2>
                <p className="text-xs sm:text-sm text-[#173D32]/80 max-w-lg mx-auto leading-relaxed">
                  Your ground observation has been logged into the state emergency response desk. Geotechnical officers and highway patrols have received your alert.
                </p>

                <div className="p-5 rounded-2xl bg-white border border-[#173D32]/12 inline-block shadow-2xs text-left max-w-sm w-full space-y-1">
                  <span className="text-[10px] text-[#173D32]/60 uppercase tracking-widest block font-bold">
                    Official Assigned Ticket Reference
                  </span>
                  <span className="text-xl font-mono font-black text-[#173D32] block">
                    {submittedTicketId}
                  </span>
                  <span className="text-[10px] text-emerald-700 font-bold block pt-1">
                    Status: SUBMITTED · Pending Field Verification
                  </span>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setSubmittedTicketId(null)}
                    className="px-5 py-2.5 rounded-xl bg-white border border-[#173D32]/15 text-[#173D32] font-bold text-xs hover:bg-[#F6F4EC] transition-colors"
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
                    className="px-5 py-2.5 rounded-xl bg-[#173D32] text-[#F6F4EC] font-bold text-xs hover:bg-[#1a4437] transition-colors shadow-2xs"
                  >
                    View in My Reports →
                  </button>
                </div>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="p-6 sm:p-8 bg-[#FAF8F2] rounded-3xl border border-[#173D32]/12 shadow-xs space-y-6"
              >
                {/* Form Error Banner */}
                {formError && (
                  <div className="p-4 rounded-2xl bg-red-50 text-red-900 border border-red-200 text-xs flex items-center gap-3">
                    <span className="text-base">⚠️</span>
                    <span className="font-semibold">{formError}</span>
                  </div>
                )}

                {/* Section 1: Incident Classification */}
                <div className="space-y-4">
                  <div className="pb-2 border-b border-[#173D32]/10 flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-wider text-[#173D32] flex items-center gap-2">
                      <span>1.</span>
                      <span>Hazard Classification & Severity</span>
                    </h3>
                    <span className="text-[10px] text-red-700 font-bold">* Required fields</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#173D32] uppercase tracking-wider mb-1.5">
                      Incident Summary / Title *
                    </label>
                    <input
                      type="text"
                      value={incidentTitle}
                      onChange={(e) => setIncidentTitle(e.target.value)}
                      placeholder="e.g. Major rockfall blocking NH-29 uphill carriageway"
                      className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#173D32]/15 text-xs text-[#173D32] focus:outline-2 focus:outline-[#D6A65D]"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#173D32] uppercase tracking-wider mb-1.5">
                        Hazard Category *
                      </label>
                      <select
                        value={hazardCategory}
                        onChange={(e) => setHazardCategory(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#173D32]/15 text-xs text-[#173D32] focus:outline-2 focus:outline-[#D6A65D]"
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
                      <label className="block text-xs font-bold text-[#173D32] uppercase tracking-wider mb-1.5">
                        Assessed Urgency / Severity *
                      </label>
                      <select
                        value={severity}
                        onChange={(e) => setSeverity(e.target.value as "Warning" | "Critical" | "Watch")}
                        className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#173D32]/15 text-xs text-[#173D32] focus:outline-2 focus:outline-[#D6A65D]"
                        required
                      >
                        <option value="Warning">Warning — Threatens passage / unstable slope</option>
                        <option value="Critical">Critical — Immediate danger to life or active slide</option>
                        <option value="Watch">Watch — Early tension cracks or minor seepage</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Section 2: Geographic Settlement Location */}
                <div className="space-y-4 pt-2">
                  <div className="pb-2 border-b border-[#173D32]/10 flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-wider text-[#173D32] flex items-center gap-2">
                      <span>2.</span>
                      <span>Settlement & Landmark Location</span>
                    </h3>
                    <span className="text-[10px] text-[#173D32]/60">Auto-filled from Citizen Profile</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#173D32] uppercase tracking-wider mb-1.5">
                        State / Territory *
                      </label>
                      <select
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#173D32]/15 text-xs text-[#173D32] focus:outline-2 focus:outline-[#D6A65D]"
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
                      <label className="block text-xs font-bold text-[#173D32] uppercase tracking-wider mb-1.5">
                        District
                      </label>
                      <input
                        type="text"
                        value={district}
                        onChange={(e) => setDistrict(e.target.value)}
                        placeholder="e.g. Kohima / Dima Hasao"
                        className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#173D32]/15 text-xs text-[#173D32] focus:outline-2 focus:outline-[#D6A65D]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#173D32] uppercase tracking-wider mb-1.5">
                        Village / Settlement
                      </label>
                      <input
                        type="text"
                        value={villageName}
                        onChange={(e) => setVillageName(e.target.value)}
                        placeholder="e.g. Phesama"
                        list="village-suggestions"
                        className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#173D32]/15 text-xs text-[#173D32] focus:outline-2 focus:outline-[#D6A65D]"
                      />
                      <datalist id="village-suggestions">
                        {suggestedVillages.map((v) => (
                          <option key={v.id} value={v.name} />
                        ))}
                      </datalist>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#173D32] uppercase tracking-wider mb-1.5">
                      Specific Location / Milestone / Road Stretch *
                    </label>
                    <input
                      type="text"
                      value={locationMilestone}
                      onChange={(e) => setLocationMilestone(e.target.value)}
                      placeholder="e.g. Near KM 42 landmark on bypass, opposite Baptist Church gully"
                      className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#173D32]/15 text-xs text-[#173D32] focus:outline-2 focus:outline-[#D6A65D]"
                      required
                    />
                  </div>
                </div>

                {/* Section 3: GPS Geolocation Assistance */}
                <div className="space-y-3 pt-2">
                  <div className="pb-2 border-b border-[#173D32]/10 flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-wider text-[#173D32] flex items-center gap-2">
                      <span>3.</span>
                      <span>GPS Coordinates (Optional Assistance)</span>
                    </h3>
                    <span className="text-[10px] text-[#173D32]/60">Requires browser permission</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-white border border-[#173D32]/12 shadow-2xs space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <span className="text-xs font-bold text-[#173D32] block">
                          Pinpoint Device Satellite Location
                        </span>
                        <p className="text-[11px] text-[#173D32]/70 mt-0.5">
                          Tap below to extract precise WGS-84 coordinates from your phone or laptop GPS sensor.
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={handleDetectGPS}
                          disabled={isLocating}
                          className="px-3.5 py-1.5 rounded-xl bg-[#173D32] text-[#F6F4EC] text-xs font-bold hover:bg-[#1a4437] transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-2xs"
                        >
                          <span>{isLocating ? "Acquiring GPS..." : "Detect GPS 📍"}</span>
                        </button>

                        {(coords.lat !== null || coords.lng !== null) && (
                          <button
                            type="button"
                            onClick={handleClearGPS}
                            className="px-2.5 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold transition-colors cursor-pointer"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </div>

                    {gpsNotice && (
                      <div className="p-2.5 rounded-xl bg-[#DCE8D4]/60 border border-[#173D32]/15 text-[11px] text-[#173D32] font-medium flex items-center gap-2">
                        <span>🛰️</span>
                        <span>{gpsNotice}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-[10px] font-bold text-[#173D32]/60 uppercase tracking-wider mb-1">
                          Latitude (°N)
                        </label>
                        <input
                          type="number"
                          step="0.000001"
                          value={coords.lat !== null ? coords.lat : ""}
                          onChange={(e) =>
                            setCoords((prev) => ({
                              ...prev,
                              lat: e.target.value ? parseFloat(e.target.value) : null,
                            }))
                          }
                          placeholder="e.g. 25.642150"
                          className="w-full px-3 py-2 rounded-xl bg-[#FAF8F2] border border-[#173D32]/12 text-xs text-[#173D32] font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-[#173D32]/60 uppercase tracking-wider mb-1">
                          Longitude (°E)
                        </label>
                        <input
                          type="number"
                          step="0.000001"
                          value={coords.lng !== null ? coords.lng : ""}
                          onChange={(e) =>
                            setCoords((prev) => ({
                              ...prev,
                              lng: e.target.value ? parseFloat(e.target.value) : null,
                            }))
                          }
                          placeholder="e.g. 94.112480"
                          className="w-full px-3 py-2 rounded-xl bg-[#FAF8F2] border border-[#173D32]/12 text-xs text-[#173D32] font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 4: Photo Evidence & Upload Policy */}
                <div className="space-y-3 pt-2">
                  <div className="pb-2 border-b border-[#173D32]/10 flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-wider text-[#173D32] flex items-center gap-2">
                      <span>4.</span>
                      <span>Photo Evidence (Max 3 Images)</span>
                    </h3>
                    <span className="text-[10px] text-[#173D32]/60">JPEG, PNG, WebP &lt; 5MB</span>
                  </div>

                  {photoError && (
                    <div className="p-3 rounded-xl bg-red-50 text-red-900 border border-red-200 text-xs">
                      {photoError}
                    </div>
                  )}

                  {/* Photo picker & previews */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/jpeg,image/png,image/webp"
                        multiple
                        onChange={handleFileChange}
                        className="hidden"
                        id="hazard-photo-input"
                      />
                      <label
                        htmlFor="hazard-photo-input"
                        className="px-4 py-2 rounded-xl bg-white hover:bg-[#F6F4EC] border border-[#173D32]/20 text-xs font-bold text-[#173D32] transition-colors cursor-pointer flex items-center gap-2 shadow-2xs"
                      >
                        <span>📷 Attach Photos ({photos.length}/3)</span>
                      </label>
                      <span className="text-[11px] text-[#173D32]/60">
                        Visual inspection of slope cracks or debris flow
                      </span>
                    </div>

                    {/* Image Previews Grid */}
                    {photos.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                        {photos.map((photo) => (
                          <div
                            key={photo.id}
                            className="p-2.5 rounded-2xl bg-white border border-[#173D32]/15 shadow-2xs space-y-2 relative group"
                          >
                            <div className="h-28 w-full rounded-xl overflow-hidden bg-stone-100 border border-[#173D32]/10 relative">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={photo.previewUrl}
                                alt={photo.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-[#173D32]">
                              <span className="font-semibold truncate max-w-[120px]">{photo.name}</span>
                              <span className="text-[#173D32]/60">{photo.sizeKb} KB</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemovePhoto(photo.id)}
                              className="w-full py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 font-bold text-[10px] transition-colors cursor-pointer"
                            >
                              Remove Photo ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Server Cloud Storage Notice */}
                    <div className="p-3.5 rounded-2xl bg-white/70 border border-[#173D32]/10 text-[11px] text-[#173D32]/80 leading-relaxed">
                      <strong>Cloud Storage Policy Notice:</strong> Photographs selected above are verified and previewed securely in your browser. Live binary upload to state emergency buckets is active when approved storage credentials (`ALLOWED_PHOTO_DOMAINS`) are configured on the government server. All reports are immediately registered with incident telemetry, text evidence, and GPS coordinates.
                    </div>
                  </div>
                </div>

                {/* Section 5: Incident Narrative & Timing */}
                <div className="space-y-4 pt-2">
                  <div className="pb-2 border-b border-[#173D32]/10 flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-wider text-[#173D32] flex items-center gap-2">
                      <span>5.</span>
                      <span>Incident Narrative & Observation Time</span>
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#173D32] uppercase tracking-wider mb-1.5">
                        Date & Time Observed *
                      </label>
                      <input
                        type="datetime-local"
                        value={observedAt}
                        onChange={(e) => setObservedAt(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#173D32]/15 text-xs text-[#173D32] focus:outline-2 focus:outline-[#D6A65D]"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#173D32] uppercase tracking-wider mb-1.5">
                        Reporter Name
                      </label>
                      <input
                        type="text"
                        value={reporterName}
                        onChange={(e) => setReporterName(e.target.value)}
                        placeholder="Citizen Name"
                        className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#173D32]/15 text-xs text-[#173D32] focus:outline-2 focus:outline-[#D6A65D]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#173D32] uppercase tracking-wider mb-1.5">
                        Reporter Phone
                      </label>
                      <input
                        type="tel"
                        value={reporterPhone}
                        onChange={(e) => setReporterPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#173D32]/15 text-xs text-[#173D32] focus:outline-2 focus:outline-[#D6A65D]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#173D32] uppercase tracking-wider mb-1.5">
                      Detailed Description of Hazard & Damage *
                    </label>
                    <textarea
                      rows={4}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Detail current road conditions, approximate debris volume, crack length, water accumulation, and whether traffic is blocked or homes are in the path..."
                      className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#173D32]/15 text-xs text-[#173D32] focus:outline-2 focus:outline-[#D6A65D]"
                      required
                    />
                  </div>
                </div>

                {/* Submission Action Button */}
                <div className="pt-3 border-t border-[#173D32]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="text-[11px] text-[#173D32]/70">
                    Your report will be reviewed by District Disaster Management Authority (SDMA).
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-3 rounded-xl bg-[#173D32] hover:bg-[#1a4437] text-[#F6F4EC] font-bold text-xs transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 shadow-xs"
                  >
                    <span>{isSubmitting ? "Transmitting Incident..." : "Dispatch Hazard Report →"}</span>
                    {isSubmitting && <span className="animate-spin">⏳</span>}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* ── TAB 2: My Submitted Reports List ─────────────────────────────── */}
        {activeTab === "history" && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-[#FAF8F2] border border-[#173D32]/12 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div>
                <span className="font-extrabold text-[#173D32] block">
                  Authenticated Citizen Submission History
                </span>
                <p className="text-[11px] text-[#173D32]/70">
                  Tracking reports dispatched by your registered account ({user?.email || "Citizen"}).
                </p>
              </div>

              <button
                type="button"
                onClick={fetchMyReports}
                disabled={isLoadingReports}
                className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-[#F6F4EC] border border-[#173D32]/15 text-[#173D32] font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs self-start sm:self-auto"
              >
                <span>{isLoadingReports ? "Syncing..." : "Refresh Status"}</span>
                <span>🔄</span>
              </button>
            </div>

            {/* Error state */}
            {reportsError && (
              <div className="p-4 rounded-2xl bg-amber-50 text-amber-900 border border-amber-200 text-xs flex items-center justify-between">
                <span>{reportsError}</span>
                <button
                  type="button"
                  onClick={fetchMyReports}
                  className="px-2.5 py-1 rounded-lg bg-amber-200 font-bold text-amber-900"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Loading state */}
            {isLoadingReports ? (
              <div className="py-12 text-center text-xs text-[#173D32]/60 animate-pulse">
                Synchronizing your submitted hazard records from state disaster database...
              </div>
            ) : myReports.length === 0 ? (
              <div className="py-12 text-center p-8 bg-[#FAF8F2] rounded-3xl border border-dashed border-[#173D32]/20 space-y-3">
                <span className="text-3xl block">🛡️</span>
                <h3 className="text-base font-bold text-[#173D32]">
                  No Hazard Reports Logged Yet
                </h3>
                <p className="text-xs text-[#173D32]/70 max-w-md mx-auto leading-relaxed">
                  You have not submitted any hazard reports from this account. Ground observations submitted through the form will be archived here with live verification milestones.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab("form")}
                    className="px-4 py-2 rounded-xl bg-[#173D32] text-[#F6F4EC] text-xs font-bold hover:bg-[#1a4437] transition-all shadow-2xs"
                  >
                    Submit First Hazard Report →
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {myReports.map((report) => {
                  const statusColor =
                    report.status === "verified"
                      ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                      : report.status === "under_review"
                      ? "bg-amber-100 text-amber-900 border-amber-300"
                      : report.status === "rejected"
                      ? "bg-rose-100 text-rose-900 border-rose-300"
                      : "bg-sky-100 text-sky-900 border-sky-300";

                  return (
                    <div
                      key={report.reportId}
                      className="p-5 rounded-3xl bg-[#FAF8F2] border border-[#173D32]/12 shadow-2xs space-y-3 text-xs"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#173D32]/10">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2.5 py-0.5 rounded-full font-mono text-[11px] font-black bg-white border border-[#173D32]/15 text-[#173D32]">
                            {report.reportId}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#173D32] text-white">
                            {report.hazardType}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${statusColor}`}>
                            {report.status.replace("_", " ")}
                          </span>
                        </div>

                        <span className="text-[11px] text-[#173D32]/60">
                          Dispatched: {new Date(report.createdAt).toLocaleDateString([], {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-[#173D32]">
                          <span>📍</span>
                          <span>{report.location} ({report.state})</span>
                        </div>
                        <p className="text-[#173D32]/85 leading-relaxed text-[11px] pt-1">
                          {report.description}
                        </p>
                      </div>

                      {report.coordinates && (
                        <div className="p-2 rounded-xl bg-white border border-[#173D32]/10 text-[10px] font-mono text-[#173D32]/70 flex items-center justify-between">
                          <span>WGS-84 Coordinates:</span>
                          <span>
                            {report.coordinates.coordinates[1]}°N, {report.coordinates.coordinates[0]}°E
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
