"use client";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import PortalShell from "@/components/portal/PortalShell";

export default function OfficerDashboardPage() {
  return (
    <ProtectedRoute allowedRoles={["officer"]}>
      <PortalShell
        title="Disaster Operations Dashboard"
        subtitle="Regional landslide monitoring, emergency broadcast issuing, and SDMA command control."
        icon="📊"
        badgeColor="bg-purple-100 text-purple-900"
      />
    </ProtectedRoute>
  );
}

