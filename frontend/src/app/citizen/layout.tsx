"use client";

import React from "react";
import PortalLayout from "@/components/portal/PortalLayout";

export default function CitizenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PortalLayout allowedRoles={["citizen", "driver", "admin"]}>
      {children}
    </PortalLayout>
  );
}

