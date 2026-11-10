"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import FieldOfficerPortalPage from "../field/page";

export default function OfficerPortalRoute() {
  const { user, isLoadingAuth } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (!isLoadingAuth) {
      if (!user) {
        // Unauthenticated visitor -> redirect with role hint & return path
        router.replace("/login?redirect=/officer&role=field-officer");
      } else if (
        user.role !== "field_officer" &&
        (user.role as string) !== "field-officer" &&
        user.role !== "officer" &&
        user.role !== "admin"
      ) {
        // Non-officer visitor (citizen or driver) -> redirect with notice
        router.replace("/login?redirect=/officer&role=field-officer&notice=unauthorized");
      }
    }
  }, [user, isLoadingAuth, router]);

  // Loading security check
  if (isLoadingAuth) {
    return (
      <div className="min-h-[85vh] flex flex-col items-center justify-center p-6 bg-[#FAF8F2] text-[#173D32]">
        <div className="w-10 h-10 border-3 border-[#173D32]/20 border-t-[#173D32] rounded-full animate-spin mb-4" />
        <p className="text-sm font-bold text-[#173D32]">
          Verifying Field Officer Security Clearance...
        </p>
        <p className="text-xs text-[#173D32]/60 mt-1">
          Validating Sector 4 dispatch permissions & active duty session
        </p>
      </div>
    );
  }

  // Unauthenticated fallback state while redirecting
  if (!user) {
    return (
      <div className="min-h-[85vh] flex flex-col items-center justify-center p-6 bg-[#FAF8F2] text-center">
        <div className="w-8 h-8 border-2 border-[#173D32]/20 border-t-[#173D32] rounded-full animate-spin mb-3" />
        <p className="text-xs font-semibold text-[#173D32]/70">
          Redirecting to Field Officer Login...
        </p>
      </div>
    );
  }

  // Non-officer role safeguard
  if (
    user.role !== "field_officer" &&
    (user.role as string) !== "field-officer" &&
    user.role !== "officer" &&
    user.role !== "admin"
  ) {
    return (
      <div className="min-h-[85vh] flex flex-col items-center justify-center p-6 bg-[#FAF8F2] text-center">
        <div className="max-w-md p-6 bg-[#F8F4EC] border border-[#173D32]/20 rounded-3xl shadow-xl text-[#173D32]">
          <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xl font-bold mx-auto mb-3">
            🛡️
          </div>
          <h3 className="text-lg font-extrabold text-[#173D32] mb-1">
            Field Officer Authorization Required
          </h3>
          <p className="text-xs text-[#173D32]/70 mb-5 leading-relaxed">
            Your current account (<span className="font-bold text-[#173D32]">{user.name}</span>, role: <span className="font-mono">{user.role}</span>) does not have clearance for the Hill Highway Sector operations terminal.
          </p>
          <div className="flex flex-col gap-2">
            <Link
              href="/login?redirect=/officer&role=field-officer&notice=unauthorized"
              className="w-full py-2.5 rounded-full bg-[#173D32] text-[#F8F4EC] text-xs font-bold hover:bg-[#1f4e40] transition-colors"
            >
              Sign In with Field Officer Credentials
            </Link>
            <Link
              href="/"
              className="w-full py-2 rounded-full border border-[#173D32]/20 text-[#173D32] text-xs font-semibold hover:bg-white/40 transition-colors"
            >
              Return to Public Portal
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Authorized Field Officer view
  return <FieldOfficerPortalPage />;
}
