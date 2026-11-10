"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ShieldAlert,
  ShieldCheck,
  Truck,
  User,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { getRolePortalPath, ApiClientError, authApi } from "@/lib/api";

const DEMO_ACCOUNTS: {
  role: string;
  buttonLabel: string;
  title: string;
  name: string;
  email: string;
  password: string;
  badge: string;
  Icon: LucideIcon;
  borderClass: string;
}[] = [
  {
    role: "officer",
    buttonLabel: "Continue as Officer",
    title: "Operations Officer",
    name: "Vikram Sen",
    email: "officer@terra360.in",
    password: "Password123!",
    badge: "Operations & Warnings",
    Icon: BarChart3,
    borderClass: "border-emerald-300/80 bg-emerald-50/70 hover:bg-emerald-100/80 text-emerald-950",
  },
  {
    role: "field_officer",
    buttonLabel: "Continue as Field Officer",
    title: "Field Response Officer",
    name: "Lhokhoto Sema",
    email: "field@terra360.in",
    password: "Password123!",
    badge: "Sensors & Clearance",
    Icon: ShieldCheck,
    borderClass: "border-blue-300/80 bg-blue-50/70 hover:bg-blue-100/80 text-blue-950",
  },
  {
    role: "citizen",
    buttonLabel: "Continue as Citizen",
    title: "Community Resident",
    name: "Temjen Ao",
    email: "citizen@terra360.in",
    password: "Password123!",
    badge: "Community & Safe Place",
    Icon: User,
    borderClass: "border-amber-300/80 bg-amber-50/70 hover:bg-amber-100/80 text-amber-950",
  },
  {
    role: "driver",
    buttonLabel: "Continue as Driver",
    title: "Transport & Highway Driver",
    name: "Raju Sharma",
    email: "driver@terra360.in",
    password: "Password123!",
    badge: "Corridor Clearance & Detours",
    Icon: Truck,
    borderClass: "border-purple-300/80 bg-purple-50/70 hover:bg-purple-100/80 text-purple-950",
  },
  {
    role: "admin",
    buttonLabel: "Continue as Admin",
    title: "System Administrator",
    name: "System Administrator",
    email: "admin@terra360.in",
    password: "Password123!",
    badge: "Security & Governance",
    Icon: ShieldAlert,
    borderClass: "border-rose-300/80 bg-rose-50/70 hover:bg-rose-100/80 text-rose-950",
  },
];

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect");
  const emailParam = searchParams.get("email");

  const { login, user, isLoadingAuth } = useApp();

  const [email, setEmail] = useState(emailParam || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeDemoRole, setActiveDemoRole] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [demoBannerInfo, setDemoBannerInfo] = useState<string | null>(null);

  // Staff Invitation Workflow (AUD-12)
  const inviteToken = searchParams.get("inviteToken") || searchParams.get("token");
  const isInviteMode = !!inviteToken;
  const [inviteName, setInviteName] = useState("");
  const [invitePhone, setInvitePhone] = useState("");

  // Sync email param if search query updates
  useEffect(() => {
    if (emailParam) {
      const timer = setTimeout(() => {
        setEmail(emailParam);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [emailParam]);

  // Production-safe demo mode gating
  const isDemoModeEnabled =
    process.env.NEXT_PUBLIC_DEMO_MODE === "true" ||
    (process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_DEMO_MODE !== "false");

  // If already logged in, redirect directly to appropriate portal without flashing login form
  useEffect(() => {
    if (!isLoadingAuth && user) {
      const destination = redirectParam || getRolePortalPath(user.role);
      router.replace(destination);
    }
  }, [user, isLoadingAuth, redirectParam, router]);

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

    setIsLoading(true);
    setErrorMessage(null);
    setErrorCode(null);
    setDemoBannerInfo(null);

    try {
      const loggedInUser = await login({
        email: email.trim().toLowerCase(),
        password,
      });

      // For explicit demo role selection, navigate directly to that role's portal
      const destination = getRolePortalPath(loggedInUser.role);
      router.push(destination);
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setErrorMessage(err.message);
        setErrorCode(err.code);
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsLoading(false);
      setActiveDemoRole(null);
    }
  };

  const handleAcceptInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 12) {
      setErrorMessage("Staff accounts require a password of at least 12 characters (PRD §7.1).");
      setErrorCode("VALIDATION_ERROR");
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);
    setErrorCode(null);

    try {
      const data = await authApi.acceptInvite({
        token: inviteToken!,
        name: inviteName,
        password,
        phone: invitePhone || undefined,
      });
      const dest = redirectParam || getRolePortalPath(data.user.role);
      window.location.href = dest;
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setErrorMessage(err.message);
        setErrorCode(err.code);
      } else {
        setErrorMessage("Failed to accept invitation. The invitation link may have expired or is invalid.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Populate credentials for user review
  const handlePopulateDemo = (demoAccount: typeof DEMO_ACCOUNTS[0]) => {
    setEmail(demoAccount.email);
    setPassword(demoAccount.password);
    setDemoBannerInfo(`Populated credentials for ${demoAccount.title}. You may review them below or proceed with sign in.`);
    setErrorMessage(null);
  };

  // 1-Click Demo Login
  const handleDirectDemoLogin = async (demoAccount: typeof DEMO_ACCOUNTS[0]) => {
    setEmail(demoAccount.email);
    setPassword(demoAccount.password);
    setActiveDemoRole(demoAccount.role);
    setIsLoading(true);
    setErrorMessage(null);
    setDemoBannerInfo(null);

    try {
      const loggedInUser = await login({
        email: demoAccount.email,
        password: demoAccount.password,
      });

      // For explicit demo role selection, navigate directly to that role's portal
      const destination = getRolePortalPath(loggedInUser.role);
      router.push(destination);
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Demo authentication failed. Ensure backend server is running.");
      }
    } finally {
      setIsLoading(false);
      setActiveDemoRole(null);
    }
  };

  // If restoring auth session, do not flash login form before determining whether user is logged in
  if (isLoadingAuth) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center p-4 sm:p-6 bg-[#FAF8F2]">
        <div className="w-full max-w-md bg-[#F6F4EC] border border-[#173D32]/15 rounded-3xl p-8 shadow-xl text-center">
          <div className="w-10 h-10 border-3 border-[#173D32]/20 border-t-[#173D32] rounded-full animate-spin mx-auto mb-4" />
          <h2 className="text-base font-bold text-[#173D32]">Checking Session Status</h2>
          <p className="text-xs text-[#173D32]/70 mt-1">Verifying security clearance credentials...</p>
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

        {/* Main Sign-In Card */}
        <div className="bg-[#F6F4EC] border border-[#173D32]/15 rounded-3xl p-6 sm:p-8 shadow-xl text-[#173D32]">
          {/* Brand Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#DCE8D4]/70 text-[11px] font-bold text-[#173D32] mb-2 uppercase tracking-wider">
              {isInviteMode ? "Staff Onboarding" : "Terra360 Platform"}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#173D32]">
              {isInviteMode ? "Accept Staff Invitation" : "Sign In"}
            </h1>
            <p className="text-xs sm:text-sm text-[#173D32]/70 mt-1">
              {isInviteMode
                ? "Configure your staff credentials to access operational portals (minimum 12 characters)"
                : "Access real-time landslide telemetry and role portals"}
            </p>
          </div>

          {/* Error Alert */}
          {errorMessage && (
            <div
              className={`mb-5 p-3.5 rounded-xl border text-xs sm:text-sm flex items-start gap-2.5 animate-in fade-in duration-200 ${
                errorCode === "ACCOUNT_LOCKED"
                  ? "bg-amber-50 border-amber-300 text-amber-900"
                  : "bg-red-50 border-red-200 text-red-700"
              }`}
            >
              <AlertTriangle
                className={`w-4 h-4 shrink-0 mt-0.5 ${
                  errorCode === "ACCOUNT_LOCKED" ? "text-amber-700" : "text-red-700"
                }`}
                aria-hidden="true"
              />
              <div className="flex-1 leading-relaxed">
                {errorCode === "ACCOUNT_LOCKED" && (
                  <div className="font-bold text-amber-950 mb-0.5">Account Temporarily Locked</div>
                )}
                {errorMessage}
              </div>
            </div>
          )}

          {/* Demo Info Notice */}
          {demoBannerInfo && (
            <div className="mb-3 py-1 px-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-900 flex items-center gap-1.5 animate-in fade-in">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" aria-hidden="true" />
              <div className="flex-1 truncate">{demoBannerInfo}</div>
            </div>
          )}

          {/* ── Demo Login Utility Panel ── */}
          {isDemoModeEnabled && !isInviteMode && (
            <div className="mb-4 p-2.5 sm:p-3 rounded-2xl bg-[#FAF8F2] border border-[#173D32]/12">
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#173D32]/70 flex items-center gap-1">
                  <Zap className="w-3 h-3 text-[#D6A65D]" aria-hidden="true" />
                  <span>Demo Mode</span>
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#DCE8D4] text-[#173D32] font-black uppercase tracking-wider">
                  Active
                </span>
              </div>

              <div className="space-y-1.5">
                {DEMO_ACCOUNTS.map((demo) => {
                  const isCurrentRoleLoading = isLoading && activeDemoRole === demo.role;
                  const DemoIcon = demo.Icon;
                  return (
                    <div
                      key={demo.role}
                      className={`px-2.5 py-1.5 rounded-xl border transition-all ${demo.borderClass} flex items-center justify-between gap-2`}
                    >
                      <button
                        type="button"
                        onClick={() => handlePopulateDemo(demo)}
                        className="flex items-center gap-2 text-left flex-1 min-w-0 cursor-pointer group"
                        title="Click to populate credentials for review"
                      >
                        <DemoIcon className="w-4 h-4 shrink-0 text-[#173D32]" aria-hidden="true" />
                        <div className="min-w-0">
                          <div className="text-[11px] font-bold truncate flex items-center gap-1 text-[#173D32] leading-tight">
                            <span>{demo.name}</span>
                            <span className="text-[9.5px] opacity-70 font-normal">({demo.title})</span>
                          </div>
                          <div className="text-[10px] opacity-75 font-mono truncate leading-tight">{demo.email}</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => handleDirectDemoLogin(demo)}
                        className="h-6 px-2.5 rounded-lg bg-[#173D32] hover:bg-[#1a4437] text-[#F6F4EC] text-[10px] font-bold transition-all shrink-0 cursor-pointer disabled:opacity-50 flex items-center gap-1 shadow-2xs"
                        title={`Sign in immediately as ${demo.title}`}
                      >
                        {isCurrentRoleLoading ? (
                          <>
                            <div className="w-2.5 h-2.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>...</span>
                          </>
                        ) : (
                          "Sign In"
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Form Section ── */}
          {isInviteMode ? (
            <form onSubmit={handleAcceptInvite} className="flex flex-col gap-4">
              <div>
                <label
                  htmlFor="invite-name-input"
                  className="block text-xs font-bold text-[#173D32] uppercase tracking-wide mb-1.5"
                >
                  Full Name
                </label>
                <input
                  id="invite-name-input"
                  type="text"
                  placeholder="e.g. Officer Temsu Jamir"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  required
                  disabled={isLoading}
                  className="w-full h-11 px-4 rounded-xl bg-[#FAF8F2] border border-[#173D32]/20 text-sm text-[#173D32] placeholder:text-[#173D32]/40 focus:outline-none focus:ring-2 focus:ring-[#173D32] disabled:opacity-60"
                />
              </div>

              <div>
                <label
                  htmlFor="invite-phone-input"
                  className="block text-xs font-bold text-[#173D32] uppercase tracking-wide mb-1.5"
                >
                  Duty Phone Number (Optional)
                </label>
                <input
                  id="invite-phone-input"
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={invitePhone}
                  onChange={(e) => setInvitePhone(e.target.value)}
                  disabled={isLoading}
                  className="w-full h-11 px-4 rounded-xl bg-[#FAF8F2] border border-[#173D32]/20 text-sm text-[#173D32] placeholder:text-[#173D32]/40 focus:outline-none focus:ring-2 focus:ring-[#173D32] disabled:opacity-60"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="invite-password-input"
                    className="block text-xs font-bold text-[#173D32] uppercase tracking-wide"
                  >
                    Staff Password
                  </label>
                  <span className="text-[10.5px] font-semibold text-[#173D32]/70">
                    Min. 12 characters
                  </span>
                </div>

                <div className="relative">
                  <input
                    id="invite-password-input"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={12}
                    disabled={isLoading}
                    className="w-full h-11 pl-4 pr-11 rounded-xl bg-[#FAF8F2] border border-[#173D32]/20 text-sm text-[#173D32] focus:outline-none focus:ring-2 focus:ring-[#173D32] disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#173D32]/60 hover:text-[#173D32] p-1 cursor-pointer"
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
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 mt-2 rounded-full bg-[#173D32] hover:bg-[#1f4e40] text-[#F6F4EC] text-sm font-bold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-[#F6F4EC]/30 border-t-[#F6F4EC] rounded-full animate-spin" />
                    <span>Activating Staff Account...</span>
                  </>
                ) : (
                  <span>Accept Invitation & Enter Portal</span>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label
                  htmlFor="email-input"
                  className="block text-xs font-bold text-[#173D32] uppercase tracking-wide mb-1.5"
                >
                  Email Address
                </label>
                <input
                  id="email-input"
                  type="email"
                  autoComplete="email"
                  placeholder="e.g. officer@terra360.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  className="w-full h-11 px-4 rounded-xl bg-[#FAF8F2] border border-[#173D32]/20 text-sm text-[#173D32] placeholder:text-[#173D32]/40 focus:outline-none focus:ring-2 focus:ring-[#173D32] disabled:opacity-60"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="password-input"
                    className="block text-xs font-bold text-[#173D32] uppercase tracking-wide"
                  >
                    Password
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-xs font-semibold text-[#173D32]/70 hover:text-[#173D32] hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>

                <div className="relative">
                  <input
                    id="password-input"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    className="w-full h-11 pl-4 pr-11 rounded-xl bg-[#FAF8F2] border border-[#173D32]/20 text-sm text-[#173D32] focus:outline-none focus:ring-2 focus:ring-[#173D32] disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#173D32]/60 hover:text-[#173D32] p-1 cursor-pointer"
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
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 mt-2 rounded-full bg-[#173D32] hover:bg-[#1f4e40] text-[#F6F4EC] text-sm font-bold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isLoading && !activeDemoRole ? (
                  <>
                    <div className="w-4 h-4 border-2 border-[#F6F4EC]/30 border-t-[#F6F4EC] rounded-full animate-spin" />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  "Sign In"
                )}
              </button>
            </form>
          )}

          {/* Switch to Register with preserved email parameter */}
          {!isInviteMode && (
            <div className="mt-6 pt-5 border-t border-[#173D32]/10 text-center text-xs text-[#173D32]/70">
              Do not have an account?{" "}
              <Link
                href={email ? `/register?email=${encodeURIComponent(email)}` : "/register"}
                className="font-bold text-[#173D32] hover:underline"
              >
                Create an account
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[85vh] flex items-center justify-center bg-[#FAF8F2]">
          <div className="w-8 h-8 border-2 border-[#173D32]/20 border-t-[#173D32] rounded-full animate-spin" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
