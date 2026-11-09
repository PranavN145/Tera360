"use client";

import React from "react";
import PortalLayout from "@/components/portal/PortalLayout";

export default function OfficerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PortalLayout allowedRoles={["officer", "admin"]}>
      {children}
    </PortalLayout>
  );
}

