"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import FieldOfficerPortalPage from "../field/page";

export default function OfficerPortalRoute() {
  const { user, isLoadingAuth } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (!isLoadingAuth && !user) {
      router.replace("/login?redirect=/field&role=field-officer");
    }
  }, [user, isLoadingAuth, router]);

  // Load Field Direct View directly without intermediate loading screens or delays
  return <FieldOfficerPortalPage />;
}
