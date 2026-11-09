"use client";

import React from "react";
import PortalLayout from "@/components/portal/PortalLayout";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PortalLayout allowedRoles={["admin"]}>
      {children}
    </PortalLayout>
  );
}

