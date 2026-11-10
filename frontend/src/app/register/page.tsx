"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Check } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { ApiClientError } from "@/lib/api";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get("email");

  const { register, user, isLoadingAuth } = useApp();

  const [name, setName] = useState("");
  const [email, setEmail] = useState(emailParam || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [role, setRole] = useState<"citizen" | "driver">("citizen");
  const [phone, setPhone] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [registeredSuccessMessage, setRegisteredSuccessMessage] = useState<string | null>(null);

  // Sync email query param if it changes
  useEffect(() => {
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [emailParam]);

  // If already authenticated, redirect to portal
  useEffect(() => {
    if (!isLoadingAuth && user) {
      router.replace(user.role === "citizen" || user.role === "driver" ? "/citizen/home" : "/officer/dashboard");
    }
  }, [user, isLoadingAuth, router]);

  // Safe back navigation: checks referrer origin; falls back to homepage "/"
  // Unauthenticated users are NEVER returned to protected routes
  const handleBack = () => {
    if (
      typeof window !== "undefined" &&
      window.history.length > 1 &&
      document.referrer &&
      document.referrer.startsWith(window.location.origin) &&
      !document.referrer.includes("/login") &&
      !document.referrer.includes("/register") &&
      !document.referrer.includes("/officer") &&
      !document.referrer.includes("/field") &&
      !document.referrer.includes("/citizen") &&
      !document.referrer.includes("/admin") &&
      !document.referrer.includes("/account")
    ) {
      router.back();
    } else {
      router.push("/");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match. Please verify your password entry.");
      return;
    }

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

  if (isLoadingAuth) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center p-4 sm:p-6 bg-[#FAF8F2]">
        <div className="w-full max-w-md bg-[#F6F4EC] border border-[#173D32]/15 rounded-3xl p-8 shadow-xl text-center">
          <div className="w-10 h-10 border-3 border-[#173D32]/20 border-t-[#173D32] rounded-full animate-spin mx-auto mb-4" />
          <h2 className="text-base font-bold text-[#173D32]">Checking Session Status</h2>
          <p className="text-xs text-[#173D32]/70 mt-1">Verifying clearance credentials...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center p-4 sm:p-6 bg-[#FAF8F2]">
      <div className="w-full max-w-md">
        {/* Safe Back Navigation Button */}
        <div className="flex items-center justify-between mb-3">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/80 hover:bg-white text-[#173D32] border border-[#173D32]/15 text-xs font-bold shadow-2xs transition-all cursor-pointer group"
            aria-label="Return to previous page or homepage"
          >
            <svg
              className="w-4 h-4 transition-transform group-hover:-translate-x-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Back to Terra360</span>
          </button>

          <Link
            href="/"
            className="text-xs font-semibold text-[#173D32]/60 hover:text-[#173D32] hover:underline"
          >
            Public Home
          </Link>
        </div>

        {/* Main Card */}
        <div className="bg-[#F6F4EC] border border-[#173D32]/15 rounded-3xl p-6 sm:p-8 shadow-xl text-[#173D32]">
          {/* Brand Header */}
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

          {/* Success View */}
          {registeredSuccessMessage ? (
            <div className="p-6 bg-[#FAF8F2] border border-emerald-300 rounded-2xl text-center animate-in fade-in">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-3">
                <Check className="w-6 h-6" strokeWidth={2.5} aria-hidden="true" />
              </div>
              <h2 className="text-lg font-bold text-[#173D32] mb-2">
                Registration Successful!
              </h2>
              <p className="text-xs sm:text-sm text-[#173D32]/80 mb-4 leading-relaxed">
                {registeredSuccessMessage}
              </p>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs mb-5 text-left">
                <strong>Email Verification Sent:</strong> A verification link has been dispatched to <strong>{email}</strong>. Once verified, you can sign in with full clearance.
              </div>
              <div className="flex flex-col sm:flex-row gap-2.5">
                <Link
                  href={email ? `/login?email=${encodeURIComponent(email)}` : "/login"}
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
            <>
              {/* Global Error Banner */}
              {errorMessage && (
                <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs sm:text-sm text-red-700 flex items-start gap-2.5 animate-in fade-in duration-200">
                  <span className="font-bold text-red-800 text-base leading-none">!</span>
                  <div className="flex-1 leading-relaxed">{errorMessage}</div>
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

                {/* Email Address */}
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
                    placeholder="e.g. citizen@example.in"
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

                {/* Password with Visibility Toggle */}
                <div>
                  <label
                    htmlFor="reg-password"
                    className="block text-xs font-bold text-[#173D32] uppercase tracking-wide mb-1"
                  >
                    Password (min 8 characters)
                  </label>
                  <div className="relative">
                    <input
                      id="reg-password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                      disabled={isLoading}
                      className="w-full h-10 pl-3.5 pr-10 rounded-xl bg-[#FAF8F2] border border-[#173D32]/20 text-sm text-[#173D32] focus:outline-none focus:ring-2 focus:ring-[#173D32] disabled:opacity-60"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#173D32]/60 hover:text-[#173D32] p-1 cursor-pointer"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  {fieldErrors.password && (
                    <p className="text-[11px] text-red-600 mt-1">{fieldErrors.password.join(", ")}</p>
                  )}
                </div>

                {/* Confirm Password with Visibility Toggle */}
                <div>
                  <label
                    htmlFor="reg-confirm-password"
                    className="block text-xs font-bold text-[#173D32] uppercase tracking-wide mb-1"
                  >
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      id="reg-confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={8}
                      disabled={isLoading}
                      className="w-full h-10 pl-3.5 pr-10 rounded-xl bg-[#FAF8F2] border border-[#173D32]/20 text-sm text-[#173D32] focus:outline-none focus:ring-2 focus:ring-[#173D32] disabled:opacity-60"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#173D32]/60 hover:text-[#173D32] p-1 cursor-pointer"
                      aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                    >
                      {showConfirmPassword ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  {password && confirmPassword && (
                    <p
                      className={`text-[11px] mt-1 font-semibold ${
                        password === confirmPassword ? "text-emerald-700" : "text-red-600"
                      }`}
                    >
                      {password === confirmPassword ? "✓ Passwords match" : "✕ Passwords do not match"}
                    </p>
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
                    * Staff roles (Officer, Field Officer, Admin) are provisioned through secure invitation clearance only.
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

              {/* Link to Login with preserved email parameter */}
              <div className="mt-5 pt-4 border-t border-[#173D32]/10 text-center text-xs text-[#173D32]/70">
                Already registered?{" "}
                <Link
                  href={email ? `/login?email=${encodeURIComponent(email)}` : "/login"}
                  className="font-bold text-[#173D32] hover:underline"
                >
                  Sign In
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[85vh] flex items-center justify-center bg-[#FAF8F2]">
          <div className="w-8 h-8 border-2 border-[#173D32]/20 border-t-[#173D32] rounded-full animate-spin" />
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
