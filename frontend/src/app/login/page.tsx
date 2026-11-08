"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import { getRolePortalPath, ApiClientError } from "@/lib/api";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect");

  const { login, user } = useApp();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  // If already logged in, redirect to appropriate portal
  React.useEffect(() => {
    if (user) {
      const destination = redirectParam || getRolePortalPath(user.role);
      router.replace(destination);
    }
  }, [user, redirectParam, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setIsLoading(true);
    setErrorMessage(null);
    setErrorCode(null);

    try {
      const loggedInUser = await login({
        email: email.trim().toLowerCase(),
        password,
      });

      const destination = redirectParam || getRolePortalPath(loggedInUser.role);
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
    }
  };

  const handleDemoLogin = async (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("Password123!");
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const loggedInUser = await login({
        email: demoEmail,
        password: "Password123!",
      });

      const destination = redirectParam || getRolePortalPath(loggedInUser.role);
      router.push(destination);
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Demo login failed. Make sure the backend server is running.");
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
            Sign In
          </h1>
          <p className="text-xs sm:text-sm text-[#173D32]/70 mt-1">
            Access real-time landslide telemetry and role portals
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
            <span
              className={`font-bold text-base leading-none ${
                errorCode === "ACCOUNT_LOCKED" ? "text-amber-700" : "text-red-800"
              }`}
            >
              !
            </span>
            <div className="flex-1 leading-relaxed">
              {errorCode === "ACCOUNT_LOCKED" && (
                <div className="font-bold text-amber-950 mb-0.5">Account Temporarily Locked</div>
              )}
              {errorMessage}
            </div>
          </div>
        )}

        {/* Quick Demo Logins Bar */}
        <div className="mb-6 p-3 rounded-2xl bg-[#FAF8F2] border border-[#173D32]/10">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#173D32]/60 text-center mb-2">
            One-Click Demo Profiles (Seed Accounts)
          </div>
          <div className="grid grid-cols-2 gap-1.5 text-xs font-semibold">
            <button
              type="button"
              disabled={isLoading}
              onClick={() => handleDemoLogin("citizen@terra360.in")}
              className="px-2.5 py-1.5 rounded-lg bg-[#F6F4EC] hover:bg-[#DCE8D4] border border-[#173D32]/15 text-[#173D32] transition-colors text-left flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <span>👤</span> Citizen
            </button>
            <button
              type="button"
              disabled={isLoading}
              onClick={() => handleDemoLogin("driver@terra360.in")}
              className="px-2.5 py-1.5 rounded-lg bg-[#F6F4EC] hover:bg-[#DCE8D4] border border-[#173D32]/15 text-[#173D32] transition-colors text-left flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <span>🚛</span> Driver
            </button>
            <button
              type="button"
              disabled={isLoading}
              onClick={() => handleDemoLogin("officer@terra360.in")}
              className="px-2.5 py-1.5 rounded-lg bg-[#F6F4EC] hover:bg-[#DCE8D4] border border-[#173D32]/15 text-[#173D32] transition-colors text-left flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <span>📊</span> Officer
            </button>
            <button
              type="button"
              disabled={isLoading}
              onClick={() => handleDemoLogin("field@terra360.in")}
              className="px-2.5 py-1.5 rounded-lg bg-[#F6F4EC] hover:bg-[#DCE8D4] border border-[#173D32]/15 text-[#173D32] transition-colors text-left flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <span>👮</span> Field Officer
            </button>
          </div>
        </div>

        {/* Credentials Form */}
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
              placeholder="e.g. citizen@terra360.in"
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
            <input
              id="password-input"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              className="w-full h-11 px-4 rounded-xl bg-[#FAF8F2] border border-[#173D32]/20 text-sm text-[#173D32] focus:outline-none focus:ring-2 focus:ring-[#173D32] disabled:opacity-60"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 mt-2 rounded-full bg-[#173D32] hover:bg-[#1f4e40] text-[#F6F4EC] text-sm font-bold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-[#F6F4EC]/30 border-t-[#F6F4EC] rounded-full animate-spin" />
                <span>Authenticating...</span>
              </>
            ) : (
              "Sign In"
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
        <div className="min-h-[85vh] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[#173D32]/20 border-t-[#173D32] rounded-full animate-spin" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

