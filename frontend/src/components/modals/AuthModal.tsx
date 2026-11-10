"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, X } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { getRolePortalPath, ApiClientError } from "@/lib/api";

export default function AuthModal() {
  const router = useRouter();
  const { isAuthModalOpen, closeAuthModal, authMode, login, register } = useApp();
  const [mode, setMode] = useState<"login" | "register">(authMode);

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"citizen" | "driver">("citizen");
  const phone = "";

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [verificationPendingMsg, setVerificationPendingMsg] = useState<string | null>(null);

  // Sync mode with context authMode when opened
  useEffect(() => {
    const timer = setTimeout(() => {
      setMode(authMode);
      setErrorMessage(null);
      setVerificationPendingMsg(null);
    }, 0);
    return () => clearTimeout(timer);
  }, [authMode, isAuthModalOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isAuthModalOpen) {
        closeAuthModal();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isAuthModalOpen, closeAuthModal]);

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (isAuthModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isAuthModalOpen]);

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      if (mode === "login") {
        const loggedInUser = await login({
          email: email.trim().toLowerCase(),
          password,
        });
        closeAuthModal();
        router.push(getRolePortalPath(loggedInUser.role));
      } else {
        const res = await register({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          role,
          phone: phone.trim() || undefined,
        });
        setVerificationPendingMsg(
          res.message || "Account created successfully. Please check your email to verify your address."
        );
      }
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setErrorMessage(err.message);
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Authentication failed. Please verify your credentials.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-sm overflow-hidden animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeAuthModal();
      }}
    >
      <div className="relative w-full max-w-md max-h-[min(90vh,660px)] bg-[#FAF8F2] border border-[#173D32]/15 rounded-[24px] sm:rounded-[28px] shadow-2xl flex flex-col text-[#173D32] overflow-hidden my-auto transition-all">
        {/* Sticky Header */}
        <div className="p-5 sm:p-6 pb-3 border-b border-[#173D32]/10 shrink-0 relative bg-[#FAF8F2]">
          {/* Close Button */}
          <button
            type="button"
            onClick={closeAuthModal}
            className="absolute top-4 right-4 p-2 rounded-full text-[#173D32]/60 hover:text-[#173D32] hover:bg-[#173D32]/10 transition-colors focus-visible:outline-2 focus-visible:outline-[#173D32] cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>

          {/* Brand header */}
          <div className="text-center pr-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#DCE8D4]/70 text-[11px] font-bold text-[#173D32] mb-1.5 uppercase tracking-wider">
              Terra360 Platform
            </div>
            <h2 id="auth-modal-title" className="text-xl sm:text-2xl font-bold tracking-tight text-[#173D32]">
              {mode === "login" ? "Welcome Back" : "Create an Account"}
            </h2>
            <p className="text-xs text-[#173D32]/70 mt-1">
              Access real-time radar data, custom alerts & field telemetry.
            </p>
          </div>

          {/* Tab Selector */}
          <div className="flex bg-[#F6F4EC] p-1 rounded-full border border-[#173D32]/15 mt-3.5">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setErrorMessage(null);
                setVerificationPendingMsg(null);
              }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-full transition-all cursor-pointer ${
                mode === "login"
                  ? "bg-[#173D32] text-[#F6F4EC] shadow-xs"
                  : "text-[#173D32]/70 hover:text-[#173D32]"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setErrorMessage(null);
                setVerificationPendingMsg(null);
              }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-full transition-all cursor-pointer ${
                mode === "register"
                  ? "bg-[#173D32] text-[#F6F4EC] shadow-xs"
                  : "text-[#173D32]/70 hover:text-[#173D32]"
              }`}
            >
              Register
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto overscroll-contain flex-1 flex flex-col gap-4">
          {verificationPendingMsg ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-center">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto mb-2 font-bold text-lg">
                <Check className="w-5 h-5" strokeWidth={2.5} aria-hidden="true" />
              </div>
              <h3 className="text-sm font-bold text-emerald-900 mb-1">Registration Successful</h3>
              <p className="text-xs text-emerald-800 mb-4">{verificationPendingMsg}</p>
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setVerificationPendingMsg(null);
                }}
                className="w-full py-2 rounded-full bg-[#173D32] text-[#F6F4EC] text-xs font-bold"
              >
                Go to Sign In
              </button>
            </div>
          ) : (
            <>
              {/* Error message */}
              {errorMessage && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
                  {errorMessage}
                </div>
              )}

              {/* Standard Form */}
              <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
                {mode === "register" && (
                  <div>
                    <label className="block text-xs font-bold text-[#173D32] uppercase tracking-wide mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Ramesh Kalita"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required={mode === "register"}
                      disabled={isLoading}
                      className="w-full h-10 px-3.5 rounded-xl bg-[#F6F4EC] border border-[#173D32]/20 text-sm text-[#173D32] placeholder:text-[#173D32]/40 focus:outline-none focus:ring-2 focus:ring-[#173D32]"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-[#173D32] uppercase tracking-wide mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. citizen@terra360.in"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                    className="w-full h-10 px-3.5 rounded-xl bg-[#F6F4EC] border border-[#173D32]/20 text-sm text-[#173D32] placeholder:text-[#173D32]/40 focus:outline-none focus:ring-2 focus:ring-[#173D32]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-[#173D32] uppercase tracking-wide">
                      Password
                    </label>
                    {mode === "login" && (
                      <Link
                        href="/forgot-password"
                        onClick={closeAuthModal}
                        className="text-xs font-semibold text-[#173D32]/70 hover:text-[#173D32] hover:underline"
                      >
                        Forgot password?
                      </Link>
                    )}
                  </div>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    disabled={isLoading}
                    className="w-full h-10 px-3.5 rounded-xl bg-[#F6F4EC] border border-[#173D32]/20 text-sm text-[#173D32] focus:outline-none focus:ring-2 focus:ring-[#173D32]"
                  />
                </div>

                {mode === "register" && (
                  <div>
                    <label className="block text-xs font-bold text-[#173D32] uppercase tracking-wide mb-1">
                      Self-Registration Role
                    </label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as "citizen" | "driver")}
                      disabled={isLoading}
                      className="w-full h-10 px-3.5 rounded-xl bg-[#F6F4EC] border border-[#173D32]/20 text-sm font-semibold text-[#173D32] focus:outline-none focus:ring-2 focus:ring-[#173D32]"
                    >
                      <option value="citizen">Citizen / Resident</option>
                      <option value="driver">Commercial Driver / Fleet</option>
                    </select>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-11 mt-1 rounded-full bg-[#173D32] hover:bg-[#1f4e40] text-[#F6F4EC] text-sm font-bold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-[#F6F4EC]/30 border-t-[#F6F4EC] rounded-full animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    mode === "login" ? "Sign In to Terra360" : "Create Account"
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
