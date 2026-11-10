"use client";

import { useState, useRef, useMemo } from "react";
import Image from "next/image";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Construction,
  Mountain,
  Waves,
  Zap,
  type LucideIcon,
} from "lucide-react";
import Header from "@/components/layout/Header";
import { useApp } from "@/context/AppContext";
import { publicApi, ApiClientError } from "@/lib/api";
import { HazardReportOutput } from "@/types/public";

const NE_STATES = [
  "Assam",
  "Arunachal Pradesh",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Sikkim",
  "Tripura",
];

const HAZARD_TYPES: { id: string; label: string; Icon: LucideIcon }[] = [
  { id: "active-slide", label: "Active Debris Slide", Icon: AlertTriangle },
  { id: "slope-cracks", label: "Tension Cracks on Slope", Icon: Zap },
  { id: "road-subsidence", label: "Road Sinking / Subsidence", Icon: Construction },
  { id: "rockfall", label: "Rockfall / Falling Boulders", Icon: Mountain },
  { id: "muddy-water", label: "Sudden Muddy Runoff / Creep", Icon: Waves },
];

export default function ReportPage() {
  const { addToast, user } = useApp();

  const [state, setState] = useState("Nagaland");
  const [corridor, setCorridor] = useState("");
  const [hazardType, setHazardType] = useState("active-slide");
  const [urgency, setUrgency] = useState<"Critical" | "Warning" | "Watch">("Critical");
  const [description, setDescription] = useState("");
  const [reporterNameOverride, setReporterNameOverride] = useState<string | null>(null);
  const reporterName = reporterNameOverride ?? (user?.name || "");
  const [phone, setPhone] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Submission & validation states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedReport, setSubmittedReport] = useState<HazardReportOutput | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  // CAPTCHA token structure (extensible for Turnstile widget / dev testing)
  const defaultCaptchaToken = useMemo(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      return params.get("captchaToken") || process.env.NEXT_PUBLIC_DEV_CAPTCHA_TOKEN || "";
    }
    return "";
  }, []);
  const [captchaToken] = useState<string>(defaultCaptchaToken);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoSelect = (file: File) => {
    if (!file.type.startsWith("image/")) {
      addToast({
        title: "Invalid File Format",
        description: "Please select an image file (PNG, JPG, JPEG, WEBP).",
        type: "warning",
      });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      addToast({
        title: "File Too Large",
        description: "Photo size must be less than 10MB.",
        type: "warning",
      });
      return;
    }

    setPhotoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handlePhotoSelect(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setFieldErrors({});

    // Client-side required field validation
    const errors: Record<string, string[]> = {};
    if (!corridor.trim() || corridor.trim().length < 2) {
      errors.corridor = ["Please specify the highway corridor or landmark (at least 2 characters)."];
    }
    if (!description.trim() || description.trim().length < 5) {
      errors.description = ["Please describe the observed danger (at least 5 characters)."];
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setErrorMessage("Please complete all required fields correctly.");
      return;
    }

    const selectedTypeObj = HAZARD_TYPES.find((h) => h.id === hazardType);
    const hazardTypeLabel = selectedTypeObj ? selectedTypeObj.label : hazardType;

    setIsSubmitting(true);
    try {
      const response = await publicApi.submitHazardReport({
        state,
        location: corridor.trim(),
        hazardType: hazardTypeLabel,
        severity: urgency,
        description: description.trim(),
        reporterName: reporterName.trim() || undefined,
        reporterPhone: phone.trim() || undefined,
        photoUrl: undefined, // Cloud upload is not configured yet; never send local paths
        captchaToken: captchaToken || undefined,
      });

      setSubmittedReport(response);
      addToast({
        title: "Report Dispatched",
        description: `Incident successfully filed with ID ${response.reportId}.`,
        type: "success",
      });
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        if (err.status === 429 || err.code === "TOO_MANY_REQUESTS") {
          setErrorMessage(
            "Rate Limit Exceeded: You have submitted too many hazard reports recently. Please wait 15 minutes before submitting again."
          );
        } else if (err.fields?.captchaToken || err.code?.includes("CAPTCHA")) {
          setErrorMessage(
            "Security Verification Notice: CAPTCHA verification token is missing or invalid. Automated bot protection is enforced by the server."
          );
          setFieldErrors((prev) => ({
            ...prev,
            captcha: [err.fields?.captchaToken?.[0] || "CAPTCHA verification is required."],
          }));
        } else if (err.fields) {
          setFieldErrors(err.fields);
          const firstErr = Object.values(err.fields)[0]?.[0];
          setErrorMessage(firstErr || err.message || "Validation failed on submitted fields.");
        } else {
          setErrorMessage(err.message || "Failed to submit hazard report. Please try again.");
        }
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("An unexpected network error occurred. Please check your connection.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setSubmittedReport(null);
    setErrorMessage(null);
    setFieldErrors({});
    setCorridor("");
    setDescription("");
    handleRemovePhoto();
  };

  return (
    <div className="relative w-full min-h-screen bg-[#F6F4EC] flex flex-col">
      <Header />

      <main className="flex-1 max-w-[1000px] w-full mx-auto px-4 sm:px-6 lg:px-10 py-10 sm:py-14">
        {/* Header */}
        <div className="mb-10 text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#DCE8D4]/60 text-xs font-bold text-[#173D32] uppercase mb-3">
            <span className="w-2 h-2 rounded-full bg-[#D6A65D]" />
            Citizen & Field Observation Portal
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#173D32] tracking-tight">
            Report a Landslide Incident
          </h1>
          <p className="mt-2.5 text-base sm:text-lg text-[#173D32]/80 font-normal">
            Every report submitted helps early responders, BRO rescue divisions, and local communities take immediate protective action.
          </p>
        </div>

        {submittedReport ? (
          <div className="bg-[#FAF8F2] border border-[#173D32]/15 rounded-[28px] p-8 sm:p-12 text-center max-w-xl mx-auto shadow-sm">
            <div className="w-16 h-16 rounded-full bg-[#DCE8D4] text-[#173D32] flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8" strokeWidth={2.5} aria-hidden="true" />
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#DCE8D4]/60 text-xs font-bold text-[#173D32] uppercase mb-2">
              Status: Broadcasted to State Control Cell
            </div>
            <h2 className="text-2xl font-bold text-[#173D32]">Observation Submitted</h2>
            <p className="text-sm text-[#173D32]/75 mt-2">
              Our GIS analysis engine has flagged this stretch and registered your report in the active database.
            </p>

            <div className="mt-6 p-4 rounded-2xl bg-[#F6F4EC] border border-[#173D32]/12">
              <span className="text-xs uppercase tracking-wider text-[#173D32]/60 block font-semibold">
                Tracking Reference Number
              </span>
              <span className="text-2xl font-mono font-bold text-[#173D32] tracking-wider">
                {submittedReport.reportId}
              </span>
              <span className="text-xs text-[#173D32]/70 mt-1 block">
                {submittedReport.location} ({submittedReport.state})
              </span>
              {photoFile && (
                <span className="text-xs text-[#173D32]/70 font-medium mt-1.5 flex items-center justify-center gap-1">
                  Note: Photo storage is pending cloud configuration; text report saved.
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleReset}
              className="mt-8 h-12 px-8 rounded-full bg-[#173D32] text-[#F6F4EC] text-sm font-bold hover:bg-[#1f4e40] transition-colors cursor-pointer"
            >
              Submit Another Observation
            </button>
          </div>
        ) : (
          <div className="bg-[#FAF8F2] border border-[#173D32]/15 rounded-[28px] p-6 sm:p-10 shadow-sm">
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              {/* Error Banner */}
              {errorMessage && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs sm:text-sm leading-relaxed flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
                  <div className="flex-1">
                    <p className="font-semibold">{errorMessage}</p>
                    {fieldErrors.captcha && (
                      <p className="mt-1 text-xs text-amber-800/80">
                        Bot mitigation is active on the server. Full Cloudflare Turnstile verification integration will follow in the upcoming milestone.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Row: State & Urgency */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="report-state" className="block text-xs font-bold text-[#173D32] uppercase tracking-wide mb-2">
                    State / Territory *
                  </label>
                  <select
                    id="report-state"
                    name="state"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full h-12 px-4 rounded-xl bg-[#F6F4EC] border border-[#173D32]/20 text-sm font-semibold text-[#173D32] focus:outline-none focus:ring-2 focus:ring-[#173D32] disabled:opacity-60"
                  >
                    {NE_STATES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="report-urgency" className="block text-xs font-bold text-[#173D32] uppercase tracking-wide mb-2">
                    Urgency Classification *
                  </label>
                  <select
                    id="report-urgency"
                    name="urgency"
                    value={urgency}
                    onChange={(e) => setUrgency(e.target.value as "Critical" | "Warning" | "Watch")}
                    disabled={isSubmitting}
                    className="w-full h-12 px-4 rounded-xl bg-[#F6F4EC] border border-[#173D32]/20 text-sm font-semibold text-[#173D32] focus:outline-none focus:ring-2 focus:ring-[#173D32] disabled:opacity-60"
                  >
                    <option value="Critical">Critical (Immediate Road Block / Large Slide)</option>
                    <option value="Warning">Warning (Active Mudflow / Cracking Slope)</option>
                    <option value="Watch">Watch (Minor Rockfall / Rising Water)</option>
                  </select>
                </div>
              </div>

              {/* Exact Location */}
              <div>
                <label htmlFor="report-corridor" className="block text-xs font-bold text-[#173D32] uppercase tracking-wide mb-2">
                  Corridor, Kilometer Marker or Village *
                </label>
                <input
                  id="report-corridor"
                  name="corridor"
                  type="text"
                  placeholder="e.g. NH-29 near Chumukedima / Seti Jhora Bridge / Haflong Hill Cut"
                  value={corridor}
                  onChange={(e) => {
                    setCorridor(e.target.value);
                    if (fieldErrors.corridor) {
                      setFieldErrors((prev) => {
                        const copy = { ...prev };
                        delete copy.corridor;
                        return copy;
                      });
                    }
                  }}
                  disabled={isSubmitting}
                  required
                  className={`w-full h-12 px-4 rounded-xl bg-[#F6F4EC] border text-sm text-[#173D32] placeholder:text-[#173D32]/40 focus:outline-none focus:ring-2 focus:ring-[#173D32] disabled:opacity-60 ${
                    fieldErrors.corridor ? "border-red-500 ring-1 ring-red-500" : "border-[#173D32]/20"
                  }`}
                />
                {fieldErrors.corridor && (
                  <p className="text-xs text-red-600 mt-1 font-medium">{fieldErrors.corridor[0]}</p>
                )}
              </div>

              {/* Hazard Category */}
              <div>
                <label className="block text-xs font-bold text-[#173D32] uppercase tracking-wide mb-2">
                  Primary Hazard Type *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {HAZARD_TYPES.map((h) => (
                    <button
                      key={h.id}
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => setHazardType(h.id)}
                      className={`flex items-center gap-2.5 px-3.5 py-3 rounded-xl text-xs font-semibold text-left transition-all border cursor-pointer disabled:opacity-60 ${
                        hazardType === h.id
                          ? "bg-[#173D32] text-[#F6F4EC] border-[#173D32]"
                          : "bg-[#F6F4EC] text-[#173D32]/80 border-[#173D32]/15 hover:border-[#173D32]/40"
                      }`}
                    >
                      <h.Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                      <span className="truncate">{h.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Detailed Description */}
              <div>
                <label htmlFor="report-description" className="block text-xs font-bold text-[#173D32] uppercase tracking-wide mb-2">
                  Observations & Road Clearance Status * (min 5 chars)
                </label>
                <textarea
                  id="report-description"
                  name="description"
                  rows={4}
                  placeholder="Describe slope movement, depth of mud, whether vehicles can pass, rainfall intensity, and visible danger to dwellings..."
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    if (fieldErrors.description) {
                      setFieldErrors((prev) => {
                        const copy = { ...prev };
                        delete copy.description;
                        return copy;
                      });
                    }
                  }}
                  disabled={isSubmitting}
                  required
                  className={`w-full p-4 rounded-xl bg-[#F6F4EC] border text-sm text-[#173D32] placeholder:text-[#173D32]/40 focus:outline-none focus:ring-2 focus:ring-[#173D32] resize-none disabled:opacity-60 ${
                    fieldErrors.description ? "border-red-500 ring-1 ring-red-500" : "border-[#173D32]/20"
                  }`}
                />
                {fieldErrors.description && (
                  <p className="text-xs text-red-600 mt-1 font-medium">{fieldErrors.description[0]}</p>
                )}
              </div>

              {/* Photo Upload Area (Local Preview, Cloud Upload Notice) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-[#173D32] uppercase tracking-wide">
                    Attach Photo / Visual Evidence (Optional)
                  </label>
                  <span className="text-[11px] font-semibold text-amber-800 bg-amber-100/80 px-2.5 py-0.5 rounded">
                    Cloud Storage Pending
                  </span>
                </div>

                <p className="text-xs text-[#173D32]/65 mb-2">
                  Direct cloud upload is currently being configured. Files selected below are previewed locally but not transmitted to storage.
                </p>

                {photoPreview ? (
                  <div className="relative rounded-2xl p-3 sm:p-4 bg-[#F6F4EC] border border-[#173D32]/20 flex items-center gap-4">
                    <div className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0 border border-[#173D32]/15 bg-black/5">
                      <Image
                        src={photoPreview}
                        alt="Hazard observation"
                        fill
                        unoptimized
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[#173D32] truncate">
                          {photoFile?.name}
                        </span>
                        <span className="shrink-0 px-2.5 py-0.5 rounded-full bg-[#DCE8D4] text-[11px] font-bold text-[#173D32]">
                          Local Preview
                        </span>
                      </div>
                      <span className="text-xs text-[#173D32]/60 block mt-1">
                        {photoFile ? `${(photoFile.size / (1024 * 1024)).toFixed(2)} MB` : ""}
                      </span>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isSubmitting}
                        className="text-xs font-semibold text-[#173D32] underline hover:text-[#1a4437] mt-1 inline-block cursor-pointer disabled:opacity-50"
                      >
                        Change Photo
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      disabled={isSubmitting}
                      className="p-2 rounded-xl text-red-600 hover:bg-red-50 transition-colors shrink-0 cursor-pointer disabled:opacity-50"
                      title="Remove Photo"
                      aria-label="Remove Photo"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                    <input
                      id="report-photo"
                      name="photo"
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handlePhotoSelect(e.target.files[0]);
                        }
                      }}
                    />
                  </div>
                ) : (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                      isDragging
                        ? "border-[#173D32] bg-[#DCE8D4]/60 scale-[1.01]"
                        : "border-[#173D32]/25 hover:border-[#173D32]/50 bg-[#F6F4EC]/60 hover:bg-[#F6F4EC]"
                    }`}
                  >
                    <input
                      id="report-photo"
                      name="photo"
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handlePhotoSelect(e.target.files[0]);
                        }
                      }}
                    />
                    <div className="w-12 h-12 rounded-full bg-[#DCE8D4] text-[#173D32] flex items-center justify-center mb-3 shadow-xs">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <p className="text-sm font-bold text-[#173D32]">
                      <span className="underline decoration-[#D6A65D] decoration-2">Upload a site photo</span> or drag & drop here
                    </p>
                    <p className="text-xs text-[#173D32]/60 mt-1">
                      PNG, JPG, or WEBP up to 10MB (previewed locally)
                    </p>
                  </div>
                )}
              </div>

              {/* Reporter Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="report-name" className="block text-xs font-bold text-[#173D32] uppercase tracking-wide mb-2">
                    Reporter Name (Optional)
                  </label>
                  <input
                    id="report-name"
                    name="reporterName"
                    type="text"
                    placeholder="e.g. T. Jamir"
                    value={reporterName}
                    onChange={(e) => setReporterNameOverride(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full h-11 px-4 rounded-xl bg-[#F6F4EC] border border-[#173D32]/20 text-sm text-[#173D32] focus:outline-none focus:ring-2 focus:ring-[#173D32] disabled:opacity-60"
                  />
                </div>

                <div>
                  <label htmlFor="report-phone" className="block text-xs font-bold text-[#173D32] uppercase tracking-wide mb-2">
                    Contact Phone (Optional)
                  </label>
                  <input
                    id="report-phone"
                    name="phone"
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full h-11 px-4 rounded-xl bg-[#F6F4EC] border border-[#173D32]/20 text-sm text-[#173D32] focus:outline-none focus:ring-2 focus:ring-[#173D32] disabled:opacity-60"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-4 border-t border-[#173D32]/10 flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-12 px-9 rounded-full bg-[#173D32] hover:bg-[#1f4e40] text-[#F6F4EC] text-sm font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      <span>Submitting Report...</span>
                    </>
                  ) : (
                    <>
                      <span>Transmit Observation</span>
                      <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
