"use client";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import PortalShell from "@/components/portal/PortalShell";

export default function FieldTasksPage() {
  return (
    <ProtectedRoute allowedRoles={["field_officer"]}>
      <PortalShell
        title="Field Operations & Tasks Portal"
        subtitle="Sensor telemetry checks, incident verification, and ground team dispatches."
        icon="🛠️"
        badgeColor="bg-blue-100 text-blue-900"
      />
    </ProtectedRoute>
  );
}

