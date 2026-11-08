"use client";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import PortalShell from "@/components/portal/PortalShell";

export default function DriverRouteCheckPage() {
  return (
    <ProtectedRoute allowedRoles={["driver"]}>
      <PortalShell
        title="Driver Route Check Portal"
        subtitle="Corridor risk assessments, real-time road blockage alerts, and safe route clearance."
        icon="🚛"
        badgeColor="bg-amber-100 text-amber-900"
      />
    </ProtectedRoute>
  );
}

