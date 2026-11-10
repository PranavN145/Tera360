"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  PhoneCall,
  Send,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import PortalLayout from "@/components/portal/PortalLayout";
import PortalSplitLayout from "@/components/portal/PortalSplitLayout";
import PortalSectionCard from "@/components/portal/PortalSectionCard";
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
      setLocationText("");
      setDescription("");
      setReporterName("");
      setReporterPhone("");
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to submit hazard report"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PortalLayout
      allowedRoles={["citizen"]}
      title="Report a Landslide Hazard"
      subtitle="Alert disaster authorities and fellow community members about active ground hazards or slope cracks."
      headerActions={
        <div className="flex items-center gap-2">
          <Link
            href="/citizen/safe-place"
            className="px-3.5 py-1.5 rounded-full bg-[#173D32]/10 hover:bg-[#173D32]/15 text-[#173D32] text-xs font-bold transition-all inline-flex items-center gap-1.5"
          >
            <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Safe Places</span>
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
      <PortalSplitLayout
        leftSpan={7}
        stickyRight={true}
        left={
          successTicket ? (
            <div className="p-8 bg-[#FAF8F2] rounded-3xl border border-[#173D32]/12 shadow-xs text-center">
              <div className="w-16 h-16 rounded-2xl bg-[#DCFCE7] text-[#166534] flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8" aria-hidden="true" />
              </div>
              <h2 className="text-xl font-extrabold text-[#173D32]">
                Hazard Report Submitted Successfully
              </h2>
              <p className="text-xs text-[#173D32]/75 mt-2 max-w-md mx-auto">
                Your observation has been dispatched to district disaster
                management officers for rapid verification.
              </p>
              <div className="my-6 p-4 rounded-2xl bg-white border border-[#173D32]/12 inline-block">
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
                  className="px-5 py-2.5 rounded-full bg-[#173D32] text-[#F6F4EC] text-xs font-bold hover:bg-[#1a4437] transition-colors cursor-pointer"
                >
                  Submit Another Report
                </button>
              </div>
            </div>
          ) : (
            <PortalSectionCard
              title="Ground Hazard Submission Form"
              subtitle="Provide location details and observed slope conditions"
              icon={<AlertTriangle className="w-4 h-4" aria-hidden="true" />}
            >
              <form onSubmit={handleSubmit} className="space-y-4">
                {errorMessage && (
                  <div className="p-3.5 rounded-2xl bg-red-50 text-red-900 text-xs border border-red-200 flex items-center gap-2 font-semibold">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" aria-hidden="true" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <div>
                  <label
                    htmlFor="citizen-hazard-type"
                    className="block text-[11px] font-bold text-[#173D32]/75 uppercase tracking-wider mb-1.5"
                  >
                    Observed Hazard Type *
                  </label>
                  <select
                    id="citizen-hazard-type"
                    value={hazardType}
                    onChange={(e) => setHazardType(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-xl bg-white border border-[#173D32]/15 text-xs font-semibold text-[#173D32] focus:outline-none focus:ring-1 focus:ring-[#173D32]"
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
                    <label
                      htmlFor="citizen-hazard-state"
                      className="block text-[11px] font-bold text-[#173D32]/75 uppercase tracking-wider mb-1.5"
                    >
                      State / Territory *
                    </label>
                    <select
                      id="citizen-hazard-state"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="w-full h-10 px-3.5 rounded-xl bg-white border border-[#173D32]/15 text-xs font-semibold text-[#173D32] focus:outline-none focus:ring-1 focus:ring-[#173D32]"
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
                    <label
                      htmlFor="citizen-hazard-location"
                      className="block text-[11px] font-bold text-[#173D32]/75 uppercase tracking-wider mb-1.5"
                    >
                      Location / Milestone *
                    </label>
                    <input
                      id="citizen-hazard-location"
                      type="text"
                      value={locationText}
                      onChange={(e) => setLocationText(e.target.value)}
                      placeholder="e.g. Near KM 42, Jatinga bypass"
                      className="w-full h-10 px-3.5 rounded-xl bg-white border border-[#173D32]/15 text-xs text-[#173D32] placeholder:text-[#173D32]/45 focus:outline-none focus:ring-1 focus:ring-[#173D32]"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="citizen-hazard-description"
                    className="block text-[11px] font-bold text-[#173D32]/75 uppercase tracking-wider mb-1.5"
                  >
                    Description of Hazard &amp; Damage *
                  </label>
                  <textarea
                    id="citizen-hazard-description"
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe current road conditions, debris volume, crack size, and whether traffic is blocked..."
                    className="w-full p-3.5 rounded-xl bg-white border border-[#173D32]/15 text-xs text-[#173D32] placeholder:text-[#173D32]/45 focus:outline-none focus:ring-1 focus:ring-[#173D32]"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-[#173D32]/10">
                  <div>
                    <label
                      htmlFor="citizen-reporter-name"
                      className="block text-[11px] font-bold text-[#173D32]/75 uppercase tracking-wider mb-1.5"
                    >
                      Your Name (Optional)
                    </label>
                    <input
                      id="citizen-reporter-name"
                      type="text"
                      value={reporterName}
                      onChange={(e) => setReporterName(e.target.value)}
                      placeholder="Anonymous or Full Name"
                      className="w-full h-10 px-3.5 rounded-xl bg-white border border-[#173D32]/15 text-xs text-[#173D32] placeholder:text-[#173D32]/45 focus:outline-none focus:ring-1 focus:ring-[#173D32]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="citizen-reporter-phone"
                      className="block text-[11px] font-bold text-[#173D32]/75 uppercase tracking-wider mb-1.5"
                    >
                      Phone (Optional)
                    </label>
                    <input
                      id="citizen-reporter-phone"
                      type="tel"
                      value={reporterPhone}
                      onChange={(e) => setReporterPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full h-10 px-3.5 rounded-xl bg-white border border-[#173D32]/15 text-xs text-[#173D32] placeholder:text-[#173D32]/45 focus:outline-none focus:ring-1 focus:ring-[#173D32]"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 rounded-full bg-[#173D32] text-[#F6F4EC] text-xs font-bold hover:bg-[#1a4437] transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center justify-center gap-2 shadow-xs"
                  >
                    <Send className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>
                      {isSubmitting
                        ? "Transmitting Incident..."
                        : "Submit Hazard Report"}
                    </span>
                  </button>
                </div>
              </form>
            </PortalSectionCard>
          )
        }
        right={
          <div className="space-y-4">
            <PortalSectionCard
              title="Early Warning Signs to Report"
              subtitle="Community safety checklist"
              icon={<ShieldAlert className="w-4 h-4" aria-hidden="true" />}
              padding="md"
            >
              <ul className="space-y-2.5 text-xs text-[#173D32]/85 leading-relaxed">
                <li className="p-3 rounded-xl bg-white border border-[#173D32]/10 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#1E7A45] shrink-0 mt-0.5" aria-hidden="true" />
                  <span>
                    New tension cracks along hill roads, retaining walls, or
                    terraced farmland.
                  </span>
                </li>
                <li className="p-3 rounded-xl bg-white border border-[#173D32]/10 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#1E7A45] shrink-0 mt-0.5" aria-hidden="true" />
                  <span>
                    Sudden change from clear stream water to thick, muddy silt
                    runoff during rain.
                  </span>
                </li>
                <li className="p-3 rounded-xl bg-white border border-[#173D32]/10 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#1E7A45] shrink-0 mt-0.5" aria-hidden="true" />
                  <span>
                    Tilting utility poles, sinking highway shoulders, or
                    intermittent rockfall.
                  </span>
                </li>
              </ul>
            </PortalSectionCard>

            <div className="p-5 rounded-3xl bg-[#173D32] text-[#F6F4EC] shadow-xs space-y-3">
              <div className="flex items-center gap-2.5">
                <PhoneCall className="w-4 h-4 text-[#D6A65D]" aria-hidden="true" />
                <span className="text-xs font-bold uppercase tracking-wider text-[#D6A65D]">
                  Immediate Danger?
                </span>
              </div>
              <p className="text-xs text-[#F6F4EC]/85 leading-relaxed">
                If slope movement or debris slide is actively threatening homes
                or travelers, evacuate uphill/away immediately and call{" "}
                <strong>1070</strong> or <strong>112</strong>.
              </p>
              <Link
                href="/citizen/safe-place"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#D6A65D] text-[#173D32] text-xs font-bold hover:bg-[#c9984e] transition-colors"
              >
                <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                <span>View Nearest Safe Shelters</span>
              </Link>
            </div>
          </div>
        }
      />
    </PortalLayout>
  );
}
