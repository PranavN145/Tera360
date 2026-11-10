"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import Image from "next/image";
import {
  AlertTriangle,
  Construction,
  Mountain,
  Waves,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
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

export default function ReportModal() {
  const { isReportModalOpen, closeReportModal, addToast, user } = useApp();

  const [state, setState] = useState("Nagaland");
  const [location, setLocation] = useState("");
  const [hazardType, setHazardType] = useState("active-slide");
  const [severity, setSeverity] = useState<"Critical" | "Warning" | "Watch">("Critical");
  const [description, setDescription] = useState("");
  const [reporterName, setReporterName] = useState(user ? user.name : "");
  const [reporterPhone, setReporterPhone] = useState("");
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

  const handleRemovePhoto = useCallback(() => {
    setPhotoFile(null);
    setPhotoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const handleReset = useCallback(() => {
    setSubmittedReport(null);
    setErrorMessage(null);
    setFieldErrors({});
    setLocation("");
    setDescription("");
    handleRemovePhoto();
    closeReportModal();
  }, [closeReportModal, handleRemovePhoto]);

  // Sync reporter name if user logs in
  useEffect(() => {
    if (user && !reporterName) {
      setReporterName(user.name);
    }
  }, [user, reporterName]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isReportModalOpen) {
        handleReset();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isReportModalOpen, handleReset]);

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (isReportModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isReportModalOpen]);

  if (!isReportModalOpen) return null;

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
    if (!location.trim() || location.trim().length < 2) {
      errors.location = ["Please specify the highway corridor or landmark (at least 2 characters)."];
    }
    if (!description.trim() || description.trim().length < 5) {
      errors.description = ["Please describe the observed hazard (at least 5 characters)."];
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
        location: location.trim(),
        hazardType: hazardTypeLabel,
        severity,
        description: description.trim(),
        reporterName: reporterName.trim() || undefined,
        reporterPhone: reporterPhone.trim() || undefined,
        photoUrl: undefined, // Cloud upload is not configured yet; never send local paths
        captchaToken: captchaToken || undefined,
      });

      setSubmittedReport(response);
      addToast({
        title: "Report Dispatched Successfully",
        description: `Incident logged under ID ${response.reportId}.`,
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

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-sm overflow-hidden animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleReset();
      }}
    >
      <div className="relative w-full max-w-xl max-h-[min(90vh,760px)] bg-[#FAF8F2] border border-[#173D32]/15 rounded-[24px] sm:rounded-[28px] shadow-2xl flex flex-col text-[#173D32] overflow-hidden my-auto transition-all">
        {/* Sticky Modal Header */}
        <div className="p-5 sm:p-6 pb-3 sm:pb-4 border-b border-[#173D32]/10 shrink-0 relative bg-[#FAF8F2]">
          <button
            type="button"
            onClick={handleReset}
            className="absolute top-4 right-4 p-2 rounded-full text-[#173D32]/60 hover:text-[#173D32] hover:bg-[#173D32]/10 transition-colors focus-visible:outline-2 focus-visible:outline-[#173D32] cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>

          <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-[#DCE8D4]/70 text-[11px] font-bold text-[#173D32] uppercase mb-1.5">
            <span className="w-2 h-2 rounded-full bg-[#D6A65D] animate-pulse" />
            Citizen & Field Observation
          </div>
          <h2 id="report-modal-title" className="text-xl sm:text-2xl font-bold tracking-tight text-[#173D32]">
            Report Landslide Hazard
          </h2>
          <p className="text-xs text-[#173D32]/70 mt-0.5">
            Help emergency teams respond before roads or villages are cut off.
          </p>
        </div>

        {submittedReport ? (
          /* Submission Success State */
          <div className="p-6 sm:p-8 flex flex-col items-center text-center overflow-y-auto">
            <div className="w-16 h-16 rounded-full bg-[#DCE8D4] text-[#173D32] flex items-center justify-center text-3xl mb-3 shadow-sm">
              ✓
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#DCE8D4]/70 text-xs font-bold text-[#173D32] uppercase mb-2">
              Status: {submittedReport.status.toUpperCase()}
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-[#173D32]">Incident Reported Successfully</h3>
            <p className="mt-2 text-xs sm:text-sm text-[#173D32]/75 max-w-md">
              Thank you for contributing ground truth. Your observation has been verified and registered in the early-warning dispatch system.
            </p>

            <div className="mt-5 w-full max-w-sm p-4 rounded-2xl bg-[#F6F4EC] border border-[#173D32]/12 flex flex-col items-center gap-1">
              <span className="text-[11px] uppercase tracking-wider text-[#173D32]/60 font-semibold">Incident Reference ID</span>
              <span className="text-lg font-mono font-bold text-[#173D32] tracking-wider">{submittedReport.reportId}</span>
              <span className="text-xs text-[#173D32]/70 mt-1">
                {submittedReport.location} ({submittedReport.state})
              </span>
              {photoFile && (
                <span className="text-[11px] text-[#173D32]/60 font-medium mt-1">
                  Note: Photo storage is pending cloud setup; text observation saved.
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleReset}
              className="mt-6 h-[44px] px-8 rounded-full bg-[#173D32] text-[#F6F4EC] text-sm font-bold hover:bg-[#1f4e40] transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        ) : (
          /* Report Form */
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
            {/* Scrollable Body */}
            <div className="p-5 sm:p-6 overflow-y-auto overscroll-contain flex-1 flex flex-col gap-4">
              {/* Error Banner */}
              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs leading-relaxed flex items-start gap-2.5">
                  <span className="text-base shrink-0">⚠️</span>
                  <div className="flex-1">
                    <p className="font-semibold">{errorMessage}</p>
                    {fieldErrors.captcha && (
                      <p className="mt-1 text-[11px] text-amber-800/80">
                        Bot mitigation is active on the server. Full Cloudflare Turnstile verification integration will follow in the upcoming milestone.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* State & Severity Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#173D32] uppercase tracking-wide mb-1">
                    State *
                  </label>
                  <select
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full h-10 px-3.5 rounded-xl bg-[#F6F4EC] border border-[#173D32]/20 text-xs sm:text-sm font-semibold text-[#173D32] focus:outline-none focus:ring-2 focus:ring-[#173D32] disabled:opacity-60"
                  >
                    {NE_STATES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#173D32] uppercase tracking-wide mb-1">
                    Apparent Urgency *
                  </label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value as "Critical" | "Warning" | "Watch")}
                    disabled={isSubmitting}
                    className="w-full h-10 px-3.5 rounded-xl bg-[#F6F4EC] border border-[#173D32]/20 text-xs sm:text-sm font-semibold text-[#173D32] focus:outline-none focus:ring-2 focus:ring-[#173D32] disabled:opacity-60"
                  >
                    <option value="Critical">Critical (Immediate Slide / Block)</option>
                    <option value="Warning">Warning (Active Creep / High Risk)</option>
                    <option value="Watch">Watch (Minor Cracks / Monitoring)</option>
                  </select>
                </div>
              </div>

              {/* Location / Landmark */}
              <div>
                <label className="block text-xs font-bold text-[#173D32] uppercase tracking-wide mb-1">
                  Exact Location / Highway Corridor *
                </label>
                <input
                  type="text"
                  placeholder="e.g. NH-29 near KM 38, Chumukedima / Teesta Cliff"
                  value={location}
                  onChange={(e) => {
                    setLocation(e.target.value);
                    if (fieldErrors.location) {
                      setFieldErrors((prev) => {
                        const copy = { ...prev };
                        delete copy.location;
                        return copy;
                      });
                    }
                  }}
                  disabled={isSubmitting}
                  required
                  className={`w-full h-10 px-3.5 rounded-xl bg-[#F6F4EC] border text-xs sm:text-sm text-[#173D32] placeholder:text-[#173D32]/40 focus:outline-none focus:ring-2 focus:ring-[#173D32] disabled:opacity-60 ${
                    fieldErrors.location ? "border-red-500 ring-1 ring-red-500" : "border-[#173D32]/20"
                  }`}
                />
                {fieldErrors.location && (
                  <p className="text-[11px] text-red-600 mt-1 font-medium">{fieldErrors.location[0]}</p>
                )}
              </div>

              {/* Hazard Type Selector */}
              <div>
                <label className="block text-xs font-bold text-[#173D32] uppercase tracking-wide mb-1.5">
                  Type of Hazard Observation *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {HAZARD_TYPES.map((h) => {
                    const HazardIcon = h.Icon;
                    return (
                      <button
                        key={h.id}
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => setHazardType(h.id)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-left transition-all border cursor-pointer disabled:opacity-60 ${
                          hazardType === h.id
                            ? "bg-[#173D32] text-[#F6F4EC] border-[#173D32] shadow-xs"
                            : "bg-[#F6F4EC] text-[#173D32]/80 border-[#173D32]/15 hover:border-[#173D32]/40"
                        }`}
                      >
                        <HazardIcon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        <span className="truncate">{h.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Description Details */}
              <div>
                <label className="block text-xs font-bold text-[#173D32] uppercase tracking-wide mb-1">
                  Description / Signs Observed * (min 5 chars)
                </label>
                <textarea
                  rows={2}
                  placeholder="Describe slope movement, cracks, road clearance, rainfall intensity..."
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
                  className={`w-full p-3 rounded-xl bg-[#F6F4EC] border text-xs sm:text-sm text-[#173D32] placeholder:text-[#173D32]/40 focus:outline-none focus:ring-2 focus:ring-[#173D32] resize-none disabled:opacity-60 ${
                    fieldErrors.description ? "border-red-500 ring-1 ring-red-500" : "border-[#173D32]/20"
                  }`}
                />
                {fieldErrors.description && (
                  <p className="text-[11px] text-red-600 mt-1 font-medium">{fieldErrors.description[0]}</p>
                )}
              </div>

              {/* Photo Upload Section (Local preview, clear notice regarding cloud upload) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-[#173D32] uppercase tracking-wide">
                    Visual Evidence (Optional)
                  </label>
                  <span className="text-[10px] font-semibold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded">
                    Cloud Storage Pending
                  </span>
                </div>

                <p className="text-[11px] text-[#173D32]/65 mb-2 leading-tight">
                  Direct cloud upload is currently being configured. Files selected below are previewed locally but not transmitted to storage.
                </p>
                
                {photoPreview ? (
                  /* Attached Photo Preview */
                  <div className="relative rounded-xl p-2.5 bg-[#F6F4EC] border border-[#173D32]/20 flex items-center gap-3">
                    <div className="relative w-14 h-14 rounded-lg overflow-hidden shrink-0 border border-[#173D32]/15 bg-black/5">
                      <Image
                        src={photoPreview}
                        alt="Hazard observation preview"
                        fill
                        unoptimized
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#173D32] truncate">
                          {photoFile?.name}
                        </span>
                        <span className="shrink-0 px-2 py-0.5 rounded-full bg-[#DCE8D4] text-[10px] font-bold text-[#173D32]">
                          Local Preview
                        </span>
                      </div>
                      <span className="text-[11px] text-[#173D32]/60 block mt-0.5">
                        {photoFile ? `${(photoFile.size / (1024 * 1024)).toFixed(2)} MB` : ""}
                      </span>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isSubmitting}
                        className="text-[11px] font-semibold text-[#173D32] underline hover:text-[#1a4437] mt-0.5 cursor-pointer disabled:opacity-50"
                      >
                        Change Photo
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      disabled={isSubmitting}
                      className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors shrink-0 cursor-pointer disabled:opacity-50"
                      title="Remove Photo"
                      aria-label="Remove Photo"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                    <input
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
                  /* Photo Dropzone */
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-3 sm:p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                      isDragging
                        ? "border-[#173D32] bg-[#DCE8D4]/60 scale-[1.01]"
                        : "border-[#173D32]/25 hover:border-[#173D32]/50 bg-[#F6F4EC]/50 hover:bg-[#F6F4EC]"
                    }`}
                  >
                    <input
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
                    <div className="w-8 h-8 rounded-full bg-[#DCE8D4] text-[#173D32] flex items-center justify-center mb-1.5 shadow-xs">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <p className="text-xs font-bold text-[#173D32]">
                      <span className="underline decoration-[#D6A65D] decoration-2">Select photo for local preview</span> or drag & drop
                    </p>
                    <p className="text-[10px] text-[#173D32]/60 mt-0.5">
                      PNG, JPG, or WEBP up to 10MB
                    </p>
                  </div>
                )}
              </div>

              {/* Reporter Contact Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#173D32] uppercase tracking-wide mb-1">
                    Your Name (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. T. Jamir"
                    value={reporterName}
                    onChange={(e) => setReporterName(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full h-10 px-3.5 rounded-xl bg-[#F6F4EC] border border-[#173D32]/20 text-xs sm:text-sm text-[#173D32] focus:outline-none focus:ring-2 focus:ring-[#173D32] disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#173D32] uppercase tracking-wide mb-1">
                    Mobile Phone (Optional)
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. +91 98765 43210"
                    value={reporterPhone}
                    onChange={(e) => setReporterPhone(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full h-10 px-3.5 rounded-xl bg-[#F6F4EC] border border-[#173D32]/20 text-xs sm:text-sm text-[#173D32] focus:outline-none focus:ring-2 focus:ring-[#173D32] disabled:opacity-60"
                  />
                </div>
              </div>
            </div>

            {/* Sticky Action Footer */}
            <div className="p-4 sm:p-5 border-t border-[#173D32]/10 bg-[#FAF8F2] shrink-0 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleReset}
                disabled={isSubmitting}
                className="h-10 px-4 rounded-full text-xs sm:text-sm font-semibold text-[#173D32]/75 hover:bg-[#173D32]/5 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="h-10 px-6 rounded-full bg-[#173D32] hover:bg-[#1f4e40] text-[#F6F4EC] text-xs sm:text-sm font-bold shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
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
                  <span>Submit Observation</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
