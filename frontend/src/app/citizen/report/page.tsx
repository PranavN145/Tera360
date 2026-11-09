"use client";

import React, { useState } from "react";
import PortalLayout from "@/components/portal/PortalLayout";
import { publicApi } from "@/lib/api";

const HAZARD_TYPES = [
  "Active Debris Slide",
  "Rockfall / Falling Boulders",
  "Slope Tension Cracks",
  "Mudflow / Silt Runoff",
  "Culvert Blockage / Flooding",
  "Road Subsidence / Edge Collapse",
];

const STATES = [
  "Assam",
  "Nagaland",
  "Sikkim",
  "Meghalaya",
  "Arunachal Pradesh",
  "Manipur",
  "Mizoram",
  "Tripura",
];

export default function CitizenReportPage() {
  const [hazardType, setHazardType] = useState(HAZARD_TYPES[0]);
  const [state, setState] = useState(STATES[0]);
  const [locationText, setLocationText] = useState("");
  const [description, setDescription] = useState("");
  const [reporterName, setReporterName] = useState("");
  const [reporterPhone, setReporterPhone] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successTicket, setSuccessTicket] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessTicket(null);

    try {
      const res = await publicApi.submitHazardReport({
        state,
        location: locationText,
        hazardType,
        description,
        reporterName: reporterName.trim() || undefined,
        reporterPhone: reporterPhone.trim() || undefined,
      });

      setSuccessTicket(res.reportId);
      // Reset form fields
      setLocationText("");
      setDescription("");
      setReporterName("");
      setReporterPhone("");
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to submit hazard report");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PortalLayout
      allowedRoles={["citizen"]}
      title="Report a Landslide Hazard"
      subtitle="Alert disaster authorities and fellow community members about active ground hazards or slope cracks."
    >
      <div className="max-w-2xl mx-auto space-y-6">
        {successTicket ? (
          <div className="p-8 bg-[#FAF8F2] rounded-3xl border border-[#173D32]/12 shadow-sm text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-800 text-3xl flex items-center justify-center mx-auto mb-4">
              ✓
            </div>
            <h2 className="text-xl font-black text-[#173D32]">
              Hazard Report Submitted Successfully
            </h2>
            <p className="text-xs text-[#173D32]/75 mt-2">
              Your report has been dispatched to district disaster management officers.
            </p>
            <div className="my-6 p-4 rounded-2xl bg-white border border-[#173D32]/10 inline-block">
              <span className="text-[11px] text-[#173D32]/60 uppercase tracking-wider block font-bold">
                Assigned Ticket Reference
              </span>
              <span className="text-lg font-mono font-black text-[#173D32]">
                {successTicket}
              </span>
            </div>
            <div>
              <button
                type="button"
                onClick={() => setSuccessTicket(null)}
                className="px-5 py-2.5 rounded-xl bg-[#173D32] text-[#F6F4EC] text-xs font-bold hover:bg-[#1f4e40] transition-colors"
              >
                Submit Another Report
              </button>
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="p-6 sm:p-8 bg-[#FAF8F2] rounded-3xl border border-[#173D32]/12 shadow-xs space-y-5"
          >
            {errorMessage && (
              <div className="p-4 rounded-xl bg-red-50 text-red-800 text-xs border border-red-200">
                {errorMessage}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-[#173D32] uppercase tracking-wider mb-1.5">
                Observed Hazard Type *
              </label>
              <select
                value={hazardType}
                onChange={(e) => setHazardType(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#173D32]/15 text-xs text-[#173D32] focus:outline-2 focus:outline-[#D6A65D]"
                required
              >
                {HAZARD_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  {STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#173D32] uppercase tracking-wider mb-1.5">
                  Location / Milestone *
                </label>
                <input
                  type="text"
                  value={locationText}
                  onChange={(e) => setLocationText(e.target.value)}
                  placeholder="e.g. Near KM 42, Jatinga bypass"
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#173D32]/15 text-xs text-[#173D32] focus:outline-2 focus:outline-[#D6A65D]"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#173D32] uppercase tracking-wider mb-1.5">
                Description of Hazard & Damage *
              </label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe current road conditions, debris volume, crack size, and whether traffic is blocked..."
                className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#173D32]/15 text-xs text-[#173D32] focus:outline-2 focus:outline-[#D6A65D]"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#173D32]/10">
              <div>
                <label className="block text-xs font-bold text-[#173D32] uppercase tracking-wider mb-1.5">
                  Your Name (Optional)
                </label>
                <input
                  type="text"
                  value={reporterName}
                  onChange={(e) => setReporterName(e.target.value)}
                  placeholder="Anonymous or Full Name"
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#173D32]/15 text-xs text-[#173D32] focus:outline-2 focus:outline-[#D6A65D]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#173D32] uppercase tracking-wider mb-1.5">
                  Phone (Optional)
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

            <div className="pt-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-xl bg-[#173D32] text-[#F6F4EC] text-xs font-bold hover:bg-[#1f4e40] transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? "Transmitting Incident..." : "Submit Hazard Report →"}
              </button>
            </div>
          </form>
        )}
      </div>
    </PortalLayout>
  );
}
