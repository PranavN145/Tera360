"use client";

import React, { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import { UserRole } from "@/types/auth";
import { getRolePortalPath } from "@/lib/api";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export default function ProtectedRoute({
  children,
  allowedRoles,
}: ProtectedRouteProps) {
  const { user, isLoadingAuth, logout } = useApp();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoadingAuth && !user) {
      const redirectUrl = `/login?redirect=${encodeURIComponent(pathname)}`;
      router.replace(redirectUrl);
    }
  }, [user, isLoadingAuth, router, pathname]);

  if (isLoadingAuth) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-10 h-10 border-3 border-[#173D32]/20 border-t-[#173D32] rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold text-[#173D32]/80">
          Verifying security clearance...
        </p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Check role authorization
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    const authorizedPath = getRolePortalPath(user.role);
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center max-w-lg mx-auto">
        <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-2xl mb-4 font-bold">
          !
        </div>
        <h2 className="text-2xl font-bold text-[#173D32] mb-2">Access Denied</h2>
        <p className="text-sm text-[#173D32]/70 mb-6">
          Your role (<span className="font-semibold text-[#173D32]">{user.role}</span>) does not have permission to access this portal ({pathname}).
        </p>
        <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
          <Link
            href={authorizedPath}
            className="px-5 py-2.5 rounded-full bg-[#173D32] text-[#F6F4EC] text-sm font-semibold hover:bg-[#1a4437] transition-colors"
          >
            Go to My Portal ({user.role})
          </Link>
          <button
            type="button"
            onClick={async () => {
              await logout();
              router.push("/login");
            }}
            className="px-5 py-2.5 rounded-full border border-[#173D32]/30 text-[#173D32] text-sm font-semibold hover:bg-[#173D32]/5 transition-colors cursor-pointer"
          >
            Sign in as different user
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

