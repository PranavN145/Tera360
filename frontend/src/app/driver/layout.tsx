"use client";

import React from "react";
import PortalLayout from "@/components/portal/PortalLayout";

export default function DriverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PortalLayout allowedRoles={["driver", "admin"]}>
      {children}
    </PortalLayout>
  );
}

