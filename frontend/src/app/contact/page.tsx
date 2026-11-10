"use client";

import { useState } from "react";
import { AlertTriangle, ArrowRight, Check } from "lucide-react";
import Header from "@/components/layout/Header";
import { useApp } from "@/context/AppContext";
import { publicApi, ApiClientError } from "@/lib/api";
import { ContactOutput } from "@/types/public";

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

export default function ContactPage() {
  const { addToast } = useApp();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [state, setState] = useState("Assam");
  const [message, setMessage] = useState("");

  // Submission & validation states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedContact, setSubmittedContact] = useState<ContactOutput | null>(null);
  const [submittedMessage, setSubmittedMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const validateForm = (): boolean => {
    const errors: Record<string, string[]> = {};
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedMessage = message.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedName || trimmedName.length < 2) {
      errors.name = ["Name must be at least 2 characters."];
    } else if (trimmedName.length > 100) {
      errors.name = ["Name cannot exceed 100 characters."];
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail) {
      errors.email = ["Email address is required."];
    } else if (!emailRegex.test(trimmedEmail)) {
      errors.email = ["Please enter a valid email address (e.g. name@domain.com)."];
    } else if (trimmedEmail.length > 150) {
      errors.email = ["Email cannot exceed 150 characters."];
    }

    if (!state.trim()) {
      errors.state = ["Please select your state."];
    }

    if (!trimmedMessage || trimmedMessage.length < 5) {
      errors.message = ["Inquiry message must be at least 5 characters."];
    } else if (trimmedMessage.length > 3000) {
      errors.message = ["Message cannot exceed 3000 characters."];
    }

    if (trimmedPhone && trimmedPhone.length > 20) {
      errors.phone = ["Phone number cannot exceed 20 characters."];
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      const firstError = Object.values(errors)[0]?.[0];
      setErrorMessage(firstError || "Please correct the highlighted fields.");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setFieldErrors({});

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await publicApi.submitContact({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        state: state.trim(),
        message: message.trim(),
        phone: phone.trim() || undefined,
      });

      setSubmittedContact(response.contact);
      setSubmittedMessage(response.message);

      addToast({
        title: "Inquiry Transmitted",
        description: response.message || "Your message has been received by our operations desk.",
        type: "success",
      });
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        if (err.status === 429 || err.code === "TOO_MANY_REQUESTS") {
          setErrorMessage(
            "Rate Limit Exceeded: Too many inquiries submitted from this network. Please wait 15 minutes before submitting again."
          );
        } else if (err.fields) {
          setFieldErrors(err.fields);
          const firstErr = Object.values(err.fields)[0]?.[0];
          setErrorMessage(firstErr || err.message || "Validation failed on submitted fields.");
        } else {
          setErrorMessage(err.message || "Failed to submit inquiry. Please try again.");
        }
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Unable to connect to the server. Please check your connection and try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setSubmittedContact(null);
    setSubmittedMessage(null);
    setErrorMessage(null);
    setFieldErrors({});
    setName("");
    setEmail("");
    setPhone("");
    setMessage("");
  };

  return (
    <div className="relative w-full min-h-screen bg-[#F6F4EC] flex flex-col">
      <Header />

      <main className="flex-1 max-w-[1200px] w-full mx-auto px-4 sm:px-6 lg:px-10 pt-28 pb-16 sm:pt-32 sm:pb-20 lg:pt-36 lg:pb-24">
        <div className="max-w-3xl mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#DCE8D4]/60 text-xs font-bold text-[#173D32] uppercase mb-3">
            <span className="w-2 h-2 rounded-full bg-[#D6A65D]" />
            24/7 Operations Desk
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#173D32] tracking-tight">
            Contact & Emergency Lines
          </h1>
          <p className="mt-3 text-base sm:text-lg text-[#173D32]/80 font-normal">
            For active highway obstructions or emergency alerts, contact regional disaster cells or message our geotechnical support team.
          </p>
        </div>

        {/* Emergency Fast Lines */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          <a
            href="tel:1077"
            className="p-5 rounded-2xl bg-[#FAF8F2] border border-red-300 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
          >
            <div>
              <span className="text-xs font-bold text-red-700 uppercase tracking-wider block">
                Disaster Helpline
              </span>
              <span className="text-2xl font-black text-[#173D32] mt-1 block">1077</span>
              <p className="text-xs text-[#173D32]/70 mt-1">State Disaster Management Authority (SDMA)</p>
            </div>
            <span className="text-xs font-bold text-red-700 mt-4 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1.5">
              <span>Click to Call</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </span>
          </a>

          <a
            href="tel:1070"
            className="p-5 rounded-2xl bg-[#FAF8F2] border border-[#173D32]/15 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
          >
            <div>
              <span className="text-xs font-bold text-[#173D32]/70 uppercase tracking-wider block">
                State Emergency Cell
              </span>
              <span className="text-2xl font-black text-[#173D32] mt-1 block">1070</span>
              <p className="text-xs text-[#173D32]/70 mt-1">Northeast Inter-State Coordination</p>
            </div>
            <span className="text-xs font-bold text-[#173D32] mt-4 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1.5">
              <span>Click to Call</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </span>
          </a>

          <a
            href="tel:112"
            className="p-5 rounded-2xl bg-[#FAF8F2] border border-[#173D32]/15 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
          >
            <div>
              <span className="text-xs font-bold text-[#173D32]/70 uppercase tracking-wider block">
                National Emergency
              </span>
              <span className="text-2xl font-black text-[#173D32] mt-1 block">112</span>
              <p className="text-xs text-[#173D32]/70 mt-1">Police / Fire / Ambulance</p>
            </div>
            <span className="text-xs font-bold text-[#173D32] mt-4 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1.5">
              <span>Click to Call</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </span>
          </a>

          <div className="p-5 rounded-2xl bg-[#FAF8F2] border border-[#173D32]/15 shadow-xs flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-[#173D32]/70 uppercase tracking-wider block">
                BRO Project Sevak / Udayak
              </span>
              <span className="text-lg font-bold text-[#173D32] mt-1 block">Highway Clearance</span>
              <p className="text-xs text-[#173D32]/70 mt-1">Direct tie-in to NH-29 & NH-10 taskforces</p>
            </div>
            <span className="text-xs font-semibold text-[#173D32]/60 mt-4">24/7 Monitoring</span>
          </div>
        </div>

        {/* Contact Form & Office Info */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-[#FAF8F2] border border-[#173D32]/15 rounded-[28px] p-6 sm:p-8 shadow-xs">
            <h2 className="text-xl font-bold text-[#173D32] mb-1">Send an Inquiry or Telemetry Request</h2>
            <p className="text-xs text-[#173D32]/70 mb-6">
              Connect with our sensor deployment engineers, GIS analysts, or institutional partnerships lead.
            </p>

            {submittedContact ? (
              /* Success Confirmation Card */
              <div className="p-8 text-center bg-[#DCE8D4]/50 rounded-2xl border border-[#173D32]/15 animate-in fade-in duration-200">
                <div className="w-16 h-16 rounded-full bg-[#DCE8D4] text-[#173D32] flex items-center justify-center mx-auto mb-3 shadow-xs">
                  <Check className="w-8 h-8" strokeWidth={2.5} aria-hidden="true" />
                </div>
                <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-[#173D32]/10 text-[11px] font-bold text-[#173D32] uppercase mb-2">
                  Status: Logged to Dispatch Desk
                </div>
                <h3 className="text-xl font-bold text-[#173D32]">Inquiry Received</h3>
                <p className="text-xs sm:text-sm text-[#173D32]/80 mt-1.5 max-w-md mx-auto leading-relaxed">
                  {submittedMessage || "Your message has been received. Our operations desk will get in touch shortly."}
                </p>

                <div className="mt-5 p-4 rounded-xl bg-[#FAF8F2] border border-[#173D32]/12 text-left max-w-sm mx-auto text-xs space-y-1 text-[#173D32]/80">
                  <p><strong>Name:</strong> {submittedContact.name}</p>
                  <p><strong>Email:</strong> {submittedContact.email}</p>
                  <p><strong>State:</strong> {submittedContact.state}</p>
                  {submittedContact.phone && (
                    <p><strong>Phone:</strong> {submittedContact.phone}</p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleReset}
                  className="mt-6 px-6 py-2.5 rounded-full bg-[#173D32] text-[#F6F4EC] text-xs font-bold hover:bg-[#1f4e40] transition-colors cursor-pointer"
                >
                  Send Another Inquiry
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {/* Error Banner */}
                {errorMessage && (
                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs leading-relaxed flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
                    <p className="font-semibold flex-1">{errorMessage}</p>
                  </div>
                )}

                {/* Name */}
                <div>
                  <label htmlFor="contact-name" className="block text-xs font-bold text-[#173D32] uppercase tracking-wide mb-1">
                    Your Name *
                  </label>
                  <input
                    id="contact-name"
                    type="text"
                    required
                    placeholder="e.g. Dr. H. L. Ralte"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (fieldErrors.name) {
                        setFieldErrors((prev) => {
                          const copy = { ...prev };
                          delete copy.name;
                          return copy;
                        });
                      }
                    }}
                    disabled={isSubmitting}
                    className={`w-full h-11 px-3.5 rounded-xl bg-[#F6F4EC] border text-xs sm:text-sm text-[#173D32] focus:outline-none focus:ring-2 focus:ring-[#173D32] disabled:opacity-60 ${
                      fieldErrors.name ? "border-red-500 ring-1 ring-red-500" : "border-[#173D32]/20"
                    }`}
                  />
                  {fieldErrors.name && (
                    <p className="text-[11px] text-red-600 mt-1 font-medium">{fieldErrors.name[0]}</p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="contact-email" className="block text-xs font-bold text-[#173D32] uppercase tracking-wide mb-1">
                    Official Email *
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    required
                    placeholder="name@organization.gov.in"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (fieldErrors.email) {
                        setFieldErrors((prev) => {
                          const copy = { ...prev };
                          delete copy.email;
                          return copy;
                        });
                      }
                    }}
                    disabled={isSubmitting}
                    className={`w-full h-11 px-3.5 rounded-xl bg-[#F6F4EC] border text-xs sm:text-sm text-[#173D32] focus:outline-none focus:ring-2 focus:ring-[#173D32] disabled:opacity-60 ${
                      fieldErrors.email ? "border-red-500 ring-1 ring-red-500" : "border-[#173D32]/20"
                    }`}
                  />
                  {fieldErrors.email && (
                    <p className="text-[11px] text-red-600 mt-1 font-medium">{fieldErrors.email[0]}</p>
                  )}
                </div>

                {/* State & Phone Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label htmlFor="contact-state" className="block text-xs font-bold text-[#173D32] uppercase tracking-wide mb-1">
                      State / Region *
                    </label>
                    <select
                      id="contact-state"
                      value={state}
                      onChange={(e) => {
                        setState(e.target.value);
                        if (fieldErrors.state) {
                          setFieldErrors((prev) => {
                            const copy = { ...prev };
                            delete copy.state;
                            return copy;
                          });
                        }
                      }}
                      disabled={isSubmitting}
                      className="w-full h-11 px-3.5 rounded-xl bg-[#F6F4EC] border border-[#173D32]/20 text-xs sm:text-sm font-semibold text-[#173D32] focus:outline-none focus:ring-2 focus:ring-[#173D32] disabled:opacity-60 cursor-pointer"
                    >
                      {NE_STATES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    {fieldErrors.state && (
                      <p className="text-[11px] text-red-600 mt-1 font-medium">{fieldErrors.state[0]}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="contact-phone" className="block text-xs font-bold text-[#173D32] uppercase tracking-wide mb-1">
                      Phone Number (Optional)
                    </label>
                    <input
                      id="contact-phone"
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        if (fieldErrors.phone) {
                          setFieldErrors((prev) => {
                            const copy = { ...prev };
                            delete copy.phone;
                            return copy;
                          });
                        }
                      }}
                      disabled={isSubmitting}
                      className={`w-full h-11 px-3.5 rounded-xl bg-[#F6F4EC] border text-xs sm:text-sm text-[#173D32] focus:outline-none focus:ring-2 focus:ring-[#173D32] disabled:opacity-60 ${
                        fieldErrors.phone ? "border-red-500 ring-1 ring-red-500" : "border-[#173D32]/20"
                      }`}
                    />
                    {fieldErrors.phone && (
                      <p className="text-[11px] text-red-600 mt-1 font-medium">{fieldErrors.phone[0]}</p>
                    )}
                  </div>
                </div>

                {/* Message */}
                <div>
                  <label htmlFor="contact-message" className="block text-xs font-bold text-[#173D32] uppercase tracking-wide mb-1">
                    Inquiry Details * (min 5 chars)
                  </label>
                  <textarea
                    id="contact-message"
                    rows={4}
                    required
                    placeholder="Provide details about your query, telemetry requirement, or disaster cell coordination..."
                    value={message}
                    onChange={(e) => {
                      setMessage(e.target.value);
                      if (fieldErrors.message) {
                        setFieldErrors((prev) => {
                          const copy = { ...prev };
                          delete copy.message;
                          return copy;
                        });
                      }
                    }}
                    disabled={isSubmitting}
                    className={`w-full p-3 rounded-xl bg-[#F6F4EC] border text-xs sm:text-sm text-[#173D32] focus:outline-none focus:ring-2 focus:ring-[#173D32] resize-none disabled:opacity-60 ${
                      fieldErrors.message ? "border-red-500 ring-1 ring-red-500" : "border-[#173D32]/20"
                    }`}
                  />
                  {fieldErrors.message && (
                    <p className="text-[11px] text-red-600 mt-1 font-medium">{fieldErrors.message[0]}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-11 rounded-full bg-[#173D32] text-[#F6F4EC] font-bold text-xs uppercase tracking-wider hover:bg-[#1f4e40] transition-colors mt-2 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      <span>Transmitting Inquiry...</span>
                    </>
                  ) : (
                    <span>Submit Inquiry</span>
                  )}
                </button>
              </form>
            )}
          </div>

          <div className="flex flex-col gap-6">
            <div className="bg-[#FAF8F2] border border-[#173D32]/15 rounded-[28px] p-6 sm:p-8 shadow-xs">
              <h3 className="text-lg font-bold text-[#173D32] mb-3">Regional Operations Hub</h3>
              <p className="text-xs sm:text-sm text-[#173D32]/80 leading-relaxed">
                Terra360 Northeast Operations Cell<br />
                Guwahati Tech Park, VIP Road<br />
                Kamrup Metropolitan, Assam 781015
              </p>
              <div className="mt-4 pt-4 border-t border-[#173D32]/10 text-xs text-[#173D32]/75 space-y-1">
                <p><strong>Direct Dispatch:</strong> +91 361 297 3600</p>
                <p><strong>Data Desk:</strong> operations@terra360.in</p>
              </div>
            </div>

            <div className="bg-[#DCE8D4]/40 border border-[#173D32]/15 rounded-[28px] p-6 sm:p-8">
              <h3 className="text-sm font-bold text-[#173D32] uppercase tracking-wider mb-2">
                Emergency API & Sensor Feeds
              </h3>
              <p className="text-xs text-[#173D32]/80 leading-relaxed font-normal">
                Disaster management officers and highway engineers can request real-time webhook push feeds for InSAR deformation anomalies and Doppler rainfall thresholds.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
