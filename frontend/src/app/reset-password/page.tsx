"use client";

import React, { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { authApi, ApiClientError } from "@/lib/api";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    if (!token) {
      setErrorMessage("Reset token is missing. Please click the link received in your email or request a new one.");
      return;
    }

    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match. Please ensure both fields are identical.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await authApi.resetPassword(token, password);
      setSuccessMessage(
        res.message || "Password has been successfully reset. Please log in with your new password."
      );
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setErrorMessage(err.message);
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Password reset failed. The link may have expired. Please request a new link.");
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
            Security Clearance
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#173D32]">
            Create New Password
          </h1>
          <p className="text-xs sm:text-sm text-[#173D32]/70 mt-1">
            Choose a strong password with at least 8 characters
          </p>
        </div>

        {/* Missing Token Warning */}
        {!token && !successMessage && (
          <div className="mb-5 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm">
            <div className="font-bold mb-1">Missing Reset Token</div>
            <p className="mb-3">
              No password reset token was found in the link. Please make sure you opened the full link from your email.
            </p>
            <Link
              href="/forgot-password"
              className="inline-block px-4 py-2 rounded-full bg-[#173D32] text-[#F6F4EC] text-xs font-bold hover:bg-[#1f4e40] transition-colors"
            >
              Request New Reset Link
            </Link>
          </div>
        )}

        {/* Success View */}
        {successMessage ? (
          <div className="p-6 bg-[#FAF8F2] border border-emerald-300 rounded-2xl text-center animate-in fade-in">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-3 text-2xl font-bold">
              ✓
            </div>
            <h2 className="text-lg font-bold text-[#173D32] mb-2">
              Password Reset Complete!
            </h2>
            <p className="text-xs sm:text-sm text-[#173D32]/80 mb-5 leading-relaxed">
              {successMessage}
            </p>
            <Link
              href="/login"
              className="block w-full py-2.5 rounded-full bg-[#173D32] hover:bg-[#1f4e40] text-[#F6F4EC] text-xs font-bold text-center transition-colors shadow-sm"
            >
              Sign In with New Password
            </Link>
          </div>
        ) : (
          /* Form (only shown if token is present) */
          token && (
            <>
              {errorMessage && (
                <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs sm:text-sm text-red-700 flex items-start gap-2.5 animate-in fade-in duration-200">
                  <span className="font-bold text-red-800 text-base leading-none">!</span>
                  <div className="flex-1">{errorMessage}</div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <label
                    htmlFor="reset-password-input"
                    className="block text-xs font-bold text-[#173D32] uppercase tracking-wide mb-1.5"
                  >
                    New Password (min 8 characters)
                  </label>
                  <input
                    id="reset-password-input"
                    type="password"
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    disabled={isLoading}
                    className="w-full h-11 px-4 rounded-xl bg-[#FAF8F2] border border-[#173D32]/20 text-sm text-[#173D32] focus:outline-none focus:ring-2 focus:ring-[#173D32] disabled:opacity-60"
                  />
                </div>

                <div>
                  <label
                    htmlFor="reset-confirm-password"
                    className="block text-xs font-bold text-[#173D32] uppercase tracking-wide mb-1.5"
                  >
                    Confirm New Password
                  </label>
                  <input
                    id="reset-confirm-password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
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
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    "Reset Password"
                  )}
                </button>
              </form>

              <div className="mt-6 pt-5 border-t border-[#173D32]/10 text-center text-xs text-[#173D32]/70">
                Cancel and return to{" "}
                <Link
                  href="/login"
                  className="font-bold text-[#173D32] hover:underline"
                >
                  Sign In
                </Link>
              </div>
            </>
          )
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[85vh] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[#173D32]/20 border-t-[#173D32] rounded-full animate-spin" />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}

