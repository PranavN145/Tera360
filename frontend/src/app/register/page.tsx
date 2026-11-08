"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import { ApiClientError } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useApp();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"citizen" | "driver">("citizen");
  const [phone, setPhone] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [registeredSuccessMessage, setRegisteredSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setIsLoading(true);
    setErrorMessage(null);
    setFieldErrors({});

    try {
      const response = await register({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        role,
        phone: phone.trim() || undefined,
        language: "en",
      });

      setRegisteredSuccessMessage(
        response.message || "Account created successfully. Please check your email to verify your address."
      );
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setErrorMessage(err.message);
        if (err.fields) {
          setFieldErrors(err.fields);
        }
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Registration failed. Please check your inputs and try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4 sm:p-6 bg-[#FAF8F2]">
      <div className="w-full max-w-md bg-[#F6F4EC] border border-[#173D32]/15 rounded-3xl p-6 sm:p-8 shadow-xl text-[#173D32]">
        {/* Brand / Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#DCE8D4]/70 text-[11px] font-bold text-[#173D32] mb-2 uppercase tracking-wider">
            Terra360 Platform
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#173D32]">
            Create Account
          </h1>
          <p className="text-xs sm:text-sm text-[#173D32]/70 mt-1">
            Register for real-time corridor alerts and community telemetry
          </p>
        </div>

        {/* Success View (Email verification notice) */}
        {registeredSuccessMessage ? (
          <div className="p-6 bg-[#FAF8F2] border border-emerald-300 rounded-2xl text-center animate-in fade-in">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-3 text-2xl font-bold">
              ✓
            </div>
            <h2 className="text-lg font-bold text-[#173D32] mb-2">
              Registration Successful!
            </h2>
            <p className="text-xs sm:text-sm text-[#173D32]/80 mb-4 leading-relaxed">
              {registeredSuccessMessage}
            </p>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs mb-5 text-left">
              <strong>Email Verification Pending:</strong> A verification link has been sent to <strong>{email}</strong>. Once verified, you can sign in with full clearance.
            </div>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <Link
                href="/login"
                className="flex-1 py-2.5 rounded-full bg-[#173D32] hover:bg-[#1a4437] text-[#F6F4EC] text-xs font-bold text-center transition-colors"
              >
                Proceed to Sign In
              </Link>
              <Link
                href="/"
                className="flex-1 py-2.5 rounded-full border border-[#173D32]/30 text-[#173D32] text-xs font-semibold text-center hover:bg-[#173D32]/5 transition-colors"
              >
                Return to Home
              </Link>
            </div>
          </div>
        ) : (
          /* Registration Form */
          <>
            {/* Global Error Banner */}
            {errorMessage && (
              <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs sm:text-sm text-red-700 flex items-start gap-2.5 animate-in fade-in duration-200">
                <span className="font-bold text-red-800 text-base leading-none">!</span>
                <div className="flex-1">{errorMessage}</div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
              {/* Full Name */}
              <div>
                <label
                  htmlFor="reg-name"
                  className="block text-xs font-bold text-[#173D32] uppercase tracking-wide mb-1"
                >
                  Full Name
                </label>
                <input
                  id="reg-name"
                  type="text"
                  placeholder="e.g. Ramesh Kalita"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={isLoading}
                  className="w-full h-10 px-3.5 rounded-xl bg-[#FAF8F2] border border-[#173D32]/20 text-sm text-[#173D32] placeholder:text-[#173D32]/40 focus:outline-none focus:ring-2 focus:ring-[#173D32] disabled:opacity-60"
                />
                {fieldErrors.name && (
                  <p className="text-[11px] text-red-600 mt-1">{fieldErrors.name.join(", ")}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label
                  htmlFor="reg-email"
                  className="block text-xs font-bold text-[#173D32] uppercase tracking-wide mb-1"
                >
                  Email Address
                </label>
                <input
                  id="reg-email"
                  type="email"
                  autoComplete="email"
                  placeholder="e.g. ramesh@example.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  className="w-full h-10 px-3.5 rounded-xl bg-[#FAF8F2] border border-[#173D32]/20 text-sm text-[#173D32] placeholder:text-[#173D32]/40 focus:outline-none focus:ring-2 focus:ring-[#173D32] disabled:opacity-60"
                />
                {fieldErrors.email && (
                  <p className="text-[11px] text-red-600 mt-1">{fieldErrors.email.join(", ")}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="reg-password"
                  className="block text-xs font-bold text-[#173D32] uppercase tracking-wide mb-1"
                >
                  Password (min 8 chars)
                </label>
                <input
                  id="reg-password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  disabled={isLoading}
                  className="w-full h-10 px-3.5 rounded-xl bg-[#FAF8F2] border border-[#173D32]/20 text-sm text-[#173D32] focus:outline-none focus:ring-2 focus:ring-[#173D32] disabled:opacity-60"
                />
                {fieldErrors.password && (
                  <p className="text-[11px] text-red-600 mt-1">{fieldErrors.password.join(", ")}</p>
                )}
              </div>

              {/* Role: Strictly Citizen and Driver per PRD §11 */}
              <div>
                <label
                  htmlFor="reg-role"
                  className="block text-xs font-bold text-[#173D32] uppercase tracking-wide mb-1"
                >
                  Self-Registration Role
                </label>
                <select
                  id="reg-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as "citizen" | "driver")}
                  disabled={isLoading}
                  className="w-full h-10 px-3.5 rounded-xl bg-[#FAF8F2] border border-[#173D32]/20 text-sm font-semibold text-[#173D32] focus:outline-none focus:ring-2 focus:ring-[#173D32] disabled:opacity-60 cursor-pointer"
                >
                  <option value="citizen">Citizen / Resident / Traveler</option>
                  <option value="driver">Commercial Driver / Logistics Operator</option>
                </select>
                {fieldErrors.role && (
                  <p className="text-[11px] text-red-600 mt-1">{fieldErrors.role.join(", ")}</p>
                )}
                <p className="text-[11px] text-[#173D32]/60 mt-1">
                  * Staff accounts (Officer, Field Officer, Admin) are provisioned through secure invitation only.
                </p>
              </div>

              {/* Optional Phone Number */}
              <div>
                <label
                  htmlFor="reg-phone"
                  className="block text-xs font-bold text-[#173D32] uppercase tracking-wide mb-1"
                >
                  Phone Number <span className="font-normal lowercase text-[#173D32]/60">(optional)</span>
                </label>
                <input
                  id="reg-phone"
                  type="tel"
                  placeholder="e.g. +91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={isLoading}
                  className="w-full h-10 px-3.5 rounded-xl bg-[#FAF8F2] border border-[#173D32]/20 text-sm text-[#173D32] placeholder:text-[#173D32]/40 focus:outline-none focus:ring-2 focus:ring-[#173D32] disabled:opacity-60"
                />
                {fieldErrors.phone && (
                  <p className="text-[11px] text-red-600 mt-1">{fieldErrors.phone.join(", ")}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 mt-2 rounded-full bg-[#173D32] hover:bg-[#1f4e40] text-[#F6F4EC] text-sm font-bold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-[#F6F4EC]/30 border-t-[#F6F4EC] rounded-full animate-spin" />
                    <span>Creating Account...</span>
                  </>
                ) : (
                  "Register Account"
                )}
              </button>
            </form>

            <div className="mt-5 pt-4 border-t border-[#173D32]/10 text-center text-xs text-[#173D32]/70">
              Already registered?{" "}
              <Link
                href="/login"
                className="font-bold text-[#173D32] hover:underline"
              >
                Sign In
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

