"use client";

import React from "react";
import PortalLayout from "@/components/portal/PortalLayout";

export default function FieldOfficerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PortalLayout allowedRoles={["field_officer", "admin"]}>
      {children}
    </PortalLayout>
  );
}

