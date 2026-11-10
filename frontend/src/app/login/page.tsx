"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import { getRolePortalPath, ApiClientError } from "@/lib/api";
import {
  User as UserIcon,
  ShieldAlert,
  Radio,
  Zap,
  BarChart3,
  Truck,
  Info,
  AlertCircle,
  ArrowRight,
  Loader2,
} from "lucide-react";

type RoleOption = "citizen" | "field-officer" | "disaster-command";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect");
  const roleParam = searchParams.get("role");
  const noticeParam = searchParams.get("notice");

  const { login, user } = useApp();

  const isOfficerRequested =
    roleParam === "field-officer" ||
    roleParam === "field_officer" ||
    redirectParam?.startsWith("/officer") ||
    redirectParam?.startsWith("/field");

  const isCommandRequested =
    roleParam === "disaster-command" ||
    roleParam === "officer" ||
    redirectParam?.includes("/dashboard");

  const [selectedRole, setSelectedRole] = useState<RoleOption>(
    isOfficerRequested ? "field-officer" : isCommandRequested ? "disaster-command" : "citizen"
  );

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  // If already logged in, redirect to appropriate portal
  React.useEffect(() => {
    if (user) {
      if (user.role === "field_officer" || (user.role as string) === "field-officer") {
        const destination = redirectParam || "/field";
        router.replace(destination);
      } else if (user.role === "officer") {
        const destination = redirectParam || "/officer/dashboard";
        router.replace(destination);
      } else {
        const destination = redirectParam || getRolePortalPath(user.role);
        router.replace(destination);
      }
    }
  }, [user, redirectParam, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setIsLoading(true);
    setErrorMessage(null);
    setErrorCode(null);

    const enteredIdentifier = identifier.trim();

    const resolveLoginEmail = (enteredId: string, role: RoleOption): string => {
      const trimmed = enteredId.trim();
      if (role === "field-officer") {
        if (!trimmed || trimmed === "OFF-2026-094" || trimmed.toLowerCase().includes("patil") || trimmed.toLowerCase() === "field") {
          return "field@terra360.in";
        }
      } else if (role === "disaster-command") {
        if (!trimmed || trimmed.toLowerCase().includes("sharma") || trimmed.toLowerCase() === "officer") {
          return "officer@terra360.in";
        }
      } else if (role === "citizen") {
        if (!trimmed) return "citizen@terra360.in";
      }
      return trimmed;
    };

    try {
      let roleHeader = "citizen";
      let destination = redirectParam;

      if (selectedRole === "field-officer") {
        roleHeader = "field-officer";
        destination = redirectParam || "/field";
      } else if (selectedRole === "disaster-command") {
        roleHeader = "officer";
        destination = redirectParam || "/officer/dashboard";
      }

      const loginEmail = resolveLoginEmail(enteredIdentifier, selectedRole);

      const loggedInUser = await login({
        email: loginEmail,
        password,
        role: roleHeader,
      });

      if (!destination) {
        if (selectedRole === "field-officer" || loggedInUser.role === "field_officer" || (loggedInUser.role as string) === "field-officer") {
          destination = "/field";
        } else {
          destination = getRolePortalPath(loggedInUser.role);
        }
      }

      router.push(destination);
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setErrorMessage(err.message);
        setErrorCode(err.code);
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("An unexpected authentication error occurred. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoOfficerLogin = async () => {
    setSelectedRole("field-officer");
    setIdentifier("field@terra360.in");
    setPassword("Password123!");
    setIsLoading(true);
    setErrorMessage(null);

    try {
      await login({
        email: "field@terra360.in",
        password: "Password123!",
        role: "field-officer",
      });
      router.push(redirectParam || "/field");
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Demo officer login failed. Backend service is starting up.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async (demoEmail: string, roleType: RoleOption) => {
    setSelectedRole(roleType);
    setIdentifier(demoEmail);
    setPassword("Password123!");
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const loggedInUser = await login({
        email: demoEmail,
        password: "Password123!",
        role: roleType === "field-officer" ? "field-officer" : roleType === "disaster-command" ? "officer" : "citizen",
      });

      const destination =
        redirectParam ||
        (roleType === "field-officer" || loggedInUser.role === "field_officer" || (loggedInUser.role as string) === "field-officer"
          ? "/field"
          : getRolePortalPath(loggedInUser.role));

      router.push(destination);
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Demo login failed. Ensure the backend server is reachable.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4 sm:p-6 bg-[#FAF8F2]">
      <div className="w-full max-w-lg bg-[#F8F4EC] border border-[#173D32]/15 rounded-3xl p-6 sm:p-8 shadow-sm text-[#173D32]">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#DCE8D4]/70 text-[11px] font-bold text-[#173D32] mb-2 uppercase tracking-wider">
            Terra360 Platform
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#173D32]">
            Sign In
          </h1>
          <p className="text-xs sm:text-sm text-[#173D32]/70 mt-1">
            Access real-time landslide telemetry, sector operations, and role portals
          </p>
        </div>

        {/* Informational Notice */}
        {noticeParam && (
          <div className="mb-5 p-3.5 rounded-2xl bg-[#D6A65D]/15 border border-[#D6A65D]/40 text-xs text-[#173D32] flex items-start gap-2.5">
            <Info className="w-4 h-4 text-[#D6A65D] shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">
              <span className="font-bold block mb-0.5">Field Officer Clearance Required</span>
              The requested view (<code className="font-mono bg-white/60 px-1 py-0.5 rounded text-[11px]">{redirectParam || "/field"}</code>) requires an active Field Officer dispatch session. Please authenticate below.
            </div>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div
            className={`mb-5 p-3.5 rounded-2xl border text-xs flex items-start gap-2.5 ${
              errorCode === "ACCOUNT_LOCKED"
                ? "bg-amber-50 border-amber-300 text-amber-900"
                : "bg-red-50 border-red-200 text-red-700"
            }`}
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">
              {errorCode === "ACCOUNT_LOCKED" && (
                <div className="font-bold text-amber-950 mb-0.5">Account Temporarily Locked</div>
              )}
              {errorMessage}
            </div>
          </div>
        )}

        {/* 3-Way Role Selector */}
        <div className="mb-6">
          <label className="block text-[11px] font-bold text-[#173D32]/70 uppercase tracking-wider mb-2 text-center">
            Select Your Role
          </label>
          <div className="grid grid-cols-3 gap-1.5 p-1.5 rounded-2xl bg-[#DCE8D4]/40 border border-[#173D32]/15">
            <button
              type="button"
              onClick={() => {
                setSelectedRole("citizen");
                setErrorMessage(null);
              }}
              className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer ${
                selectedRole === "citizen"
                  ? "bg-[#173D32] text-[#F8F4EC] shadow-sm"
                  : "text-[#173D32]/70 hover:text-[#173D32] hover:bg-white/40"
              }`}
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span className="truncate">Citizen / User</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedRole("field-officer");
                setErrorMessage(null);
              }}
              className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer ${
                selectedRole === "field-officer"
                  ? "bg-[#173D32] text-[#F8F4EC] shadow-sm ring-1 ring-[#D6A65D]/60"
                  : "text-[#173D32]/70 hover:text-[#173D32] hover:bg-white/40"
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span className="truncate">Field Direct View</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedRole("disaster-command");
                setErrorMessage(null);
              }}
              className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer ${
                selectedRole === "disaster-command"
                  ? "bg-[#173D32] text-[#F8F4EC] shadow-sm"
                  : "text-[#173D32]/70 hover:text-[#173D32] hover:bg-white/40"
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span className="truncate">Disaster Command</span>
            </button>
          </div>
        </div>

        {/* Demo Account Quick Access Card */}
        {selectedRole === "field-officer" ? (
          <div className="mb-6 p-4 rounded-2xl bg-[#FAF8F2] border border-[#173D32]/15">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#173D32]/70">
                Evaluation Access
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#D6A65D]/20 text-[#173D32] border border-[#D6A65D]/40">
                Sector 4 Verified
              </span>
            </div>
            <button
              type="button"
              disabled={isLoading}
              onClick={handleDemoOfficerLogin}
              className="w-full text-left p-3 rounded-xl bg-[#173D32] text-[#F8F4EC] hover:bg-[#1f4e40] border border-[#D6A65D]/30 transition-all cursor-pointer disabled:opacity-60"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs sm:text-sm text-[#F8F4EC] flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-[#D6A65D]" />
                  <span>Demo Field Officer (Officer K. Patil)</span>
                </span>
                <span className="text-[10px] bg-[#D6A65D] text-[#173D32] font-extrabold px-2 py-0.5 rounded uppercase">
                  Instant
                </span>
              </div>
              <p className="text-[11px] text-[#DCE8D4] mt-1 leading-relaxed">
                ID <strong className="font-mono text-[#D6A65D]">OFF-2026-094</strong> • Sector 4 - Hill Highway Corridors • Direct View
              </p>
            </button>
          </div>
        ) : selectedRole === "disaster-command" ? (
          <div className="mb-6 p-3.5 rounded-2xl bg-[#FAF8F2] border border-[#173D32]/15">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#173D32]/70 text-center mb-2">
              Disaster Headquarters Demo Profile
            </div>
            <button
              type="button"
              disabled={isLoading}
              onClick={() => handleDemoLogin("officer@terra360.in", "disaster-command")}
              className="w-full px-3 py-2 rounded-xl bg-[#F8F4EC] hover:bg-[#DCE8D1] border border-[#173D32]/20 text-[#173D32] transition-colors text-left flex items-center justify-between text-xs font-semibold cursor-pointer disabled:opacity-50"
            >
              <span className="flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-[#173D32]/70" />
                <span>Vikram Sharma (Central Command)</span>
              </span>
              <span className="text-[10px] opacity-70 font-mono">officer@terra360.in</span>
            </button>
          </div>
        ) : (
          <div className="mb-6 p-3 rounded-2xl bg-[#FAF8F2] border border-[#173D32]/15">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#173D32]/70 text-center mb-2">
              Citizen & Driver Demo Profiles
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
              <button
                type="button"
                disabled={isLoading}
                onClick={() => handleDemoLogin("citizen@terra360.in", "citizen")}
                className="px-2.5 py-2 rounded-xl bg-[#F8F4EC] hover:bg-[#DCE8D1] border border-[#173D32]/15 text-[#173D32] transition-colors text-left flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <UserIcon className="w-3.5 h-3.5 text-[#173D32]/70" />
                <span>Citizen</span>
              </button>
              <button
                type="button"
                disabled={isLoading}
                onClick={() => handleDemoLogin("driver@terra360.in", "citizen")}
                className="px-2.5 py-2 rounded-xl bg-[#F8F4EC] hover:bg-[#DCE8D1] border border-[#173D32]/15 text-[#173D32] transition-colors text-left flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <Truck className="w-3.5 h-3.5 text-[#173D32]/70" />
                <span>Driver</span>
              </button>
            </div>
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label
              htmlFor="identifier-input"
              className="block text-xs font-bold text-[#173D32] uppercase tracking-wide mb-1.5"
            >
              {selectedRole === "field-officer"
                ? "Officer ID / Email / Phone"
                : selectedRole === "disaster-command"
                ? "Command Officer Email"
                : "Email Address"}
            </label>
            <input
              id="identifier-input"
              type={selectedRole === "field-officer" ? "text" : "email"}
              autoComplete="username"
              placeholder={
                selectedRole === "field-officer"
                  ? "e.g. OFF-2026-094, officer.patil@terra360.in or phone"
                  : selectedRole === "disaster-command"
                  ? "e.g. officer@terra360.in"
                  : "e.g. citizen@terra360.in"
              }
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              disabled={isLoading}
              className="w-full h-11 px-4 rounded-xl bg-[#FAF8F2] border border-[#173D32]/20 text-sm text-[#173D32] placeholder:text-[#173D32]/40 focus:outline-none focus:ring-1 focus:ring-[#173D32] disabled:opacity-60 font-sans"
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
                className="text-xs font-medium text-[#173D32]/70 hover:text-[#173D32] hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <input
              id="password-input"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              className="w-full h-11 px-4 rounded-xl bg-[#FAF8F2] border border-[#173D32]/20 text-sm text-[#173D32] focus:outline-none focus:ring-1 focus:ring-[#173D32] disabled:opacity-60"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 mt-2 rounded-xl bg-[#173D32] hover:bg-[#1f4e40] text-[#F8F4EC] text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#F8F4EC]" />
                <span>Authenticating...</span>
              </>
            ) : selectedRole === "field-officer" ? (
              <>
                <span>Sign In to Field Direct View</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            ) : selectedRole === "disaster-command" ? (
              <>
                <span>Sign In to Disaster Command</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                <span>Sign In as Citizen</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-[#173D32]/10 text-center text-xs text-[#173D32]/70">
          Do not have an account?{" "}
          <Link
            href="/register"
            className="font-bold text-[#173D32] hover:underline"
          >
            Create an account
          </Link>
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
          <div className="w-6 h-6 border-2 border-[#173D32]/20 border-t-[#173D32] rounded-full animate-spin" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
