"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { authApi, ApiClientError } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await authApi.forgotPassword(email.trim().toLowerCase());
      setSuccessMessage(
        res.message ||
          "If an account exists with this email, a password reset link has been sent. Please check your inbox and spam folder."
      );
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setErrorMessage(err.message);
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Unable to process request. Please try again later.");
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
            Account Recovery
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#173D32]">
            Reset Password
          </h1>
          <p className="text-xs sm:text-sm text-[#173D32]/70 mt-1">
            Enter your registered email address to receive password reset instructions
          </p>
        </div>

        {/* Success View */}
        {successMessage ? (
          <div className="p-6 bg-[#FAF8F2] border border-emerald-300 rounded-2xl text-center animate-in fade-in">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-3">
              <Check className="w-6 h-6" strokeWidth={2.5} aria-hidden="true" />
            </div>
            <h2 className="text-lg font-bold text-[#173D32] mb-2">
              Check Your Email
            </h2>
            <p className="text-xs sm:text-sm text-[#173D32]/80 mb-5 leading-relaxed">
              {successMessage}
            </p>
            <div className="flex flex-col gap-2">
              <Link
                href="/login"
                className="w-full py-2.5 rounded-full bg-[#173D32] hover:bg-[#1f4e40] text-[#F6F4EC] text-xs font-bold text-center transition-colors shadow-sm"
              >
                Return to Sign In
              </Link>
            </div>
          </div>
        ) : (
          /* Form */
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
                  htmlFor="forgot-email"
                  className="block text-xs font-bold text-[#173D32] uppercase tracking-wide mb-1.5"
                >
                  Registered Email Address
                </label>
                <input
                  id="forgot-email"
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

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 mt-2 rounded-full bg-[#173D32] hover:bg-[#1f4e40] text-[#F6F4EC] text-sm font-bold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-[#F6F4EC]/30 border-t-[#F6F4EC] rounded-full animate-spin" />
                    <span>Sending Reset Link...</span>
                  </>
                ) : (
                  "Send Reset Link"
                )}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-[#173D32]/10 text-center text-xs text-[#173D32]/70">
              Remember your password?{" "}
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

