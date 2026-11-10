"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, X } from "lucide-react";
import { authApi, ApiClientError } from "@/lib/api";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"loading" | "success" | "error">(
    token ? "loading" : "error"
  );
  const [message, setMessage] = useState<string>(
    token
      ? "Verifying your email address with the security authority..."
      : "Verification token is missing from the URL. Please verify you clicked the full link."
  );

  useEffect(() => {
    if (!token) return;

    let isMounted = true;

    async function verify() {
      try {
        const res = await authApi.verifyEmail(token!);
        if (isMounted) {
          setStatus("success");
          setMessage(
            res.message || "Email address has been successfully verified. You now have full clearance."
          );
        }
      } catch (err: unknown) {
        if (isMounted) {
          setStatus("error");
          if (err instanceof ApiClientError) {
            setMessage(err.message);
          } else if (err instanceof Error) {
            setMessage(err.message);
          } else {
            setMessage("Verification failed. The token may have expired or is invalid.");
          }
        }
      }
    }

    verify();

    return () => {
      isMounted = false;
    };
  }, [token]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-[#FAF8F2]">
      <div className="w-full max-w-md mb-4 flex items-center justify-between">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#173D32] hover:opacity-80 transition-opacity"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          <span>Back to Sign In</span>
        </Link>
        <Link
          href="/"
          className="text-xs font-semibold text-[#173D32]/60 hover:text-[#173D32] hover:underline"
        >
          Public Home
        </Link>
      </div>

      <div className="w-full max-w-md bg-[#F6F4EC] border border-[#173D32]/15 rounded-3xl p-6 sm:p-8 shadow-xl text-[#173D32]">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#DCE8D4]/70 text-[11px] font-bold text-[#173D32] mb-2 uppercase tracking-wider">
            Email Verification
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#173D32]">
            Account Clearance
          </h1>
        </div>

        {/* Loading state */}
        {status === "loading" && (
          <div className="py-8 text-center flex flex-col items-center">
            <div className="w-12 h-12 border-3 border-[#173D32]/20 border-t-[#173D32] rounded-full animate-spin mb-4" />
            <p className="text-sm font-semibold text-[#173D32]/80">{message}</p>
          </div>
        )}

        {/* Success state */}
        {status === "success" && (
          <div className="p-6 bg-[#FAF8F2] border border-emerald-300 rounded-2xl text-center animate-in fade-in">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-4">
              <Check className="w-7 h-7" strokeWidth={2.5} aria-hidden="true" />
            </div>
            <h2 className="text-lg font-bold text-[#173D32] mb-2">
              Email Verified Successfully!
            </h2>
            <p className="text-xs sm:text-sm text-[#173D32]/80 mb-6 leading-relaxed">
              {message}
            </p>
            <Link
              href="/login"
              className="block w-full py-2.5 rounded-full bg-[#173D32] hover:bg-[#1f4e40] text-[#F6F4EC] text-xs font-bold text-center transition-colors shadow-sm"
            >
              Sign In to Your Account
            </Link>
          </div>
        )}

        {/* Error state */}
        {status === "error" && (
          <div className="p-6 bg-[#FAF8F2] border border-red-200 rounded-2xl text-center animate-in fade-in">
            <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
              <X className="w-7 h-7" strokeWidth={2.5} aria-hidden="true" />
            </div>
            <h2 className="text-lg font-bold text-[#173D32] mb-2">
              Verification Failed
            </h2>
            <p className="text-xs sm:text-sm text-red-700 mb-6 leading-relaxed">
              {message}
            </p>
            <div className="flex flex-col gap-2">
              <Link
                href="/login"
                className="w-full py-2.5 rounded-full bg-[#173D32] hover:bg-[#1f4e40] text-[#F6F4EC] text-xs font-bold text-center transition-colors shadow-sm"
              >
                Go to Sign In
              </Link>
              <Link
                href="/register"
                className="w-full py-2.5 rounded-full border border-[#173D32]/25 text-[#173D32] text-xs font-bold text-center hover:bg-[#173D32]/5 transition-colors"
              >
                Register Again
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[85vh] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[#173D32]/20 border-t-[#173D32] rounded-full animate-spin" />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}

