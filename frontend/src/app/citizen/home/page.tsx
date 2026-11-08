"use client";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import PortalShell from "@/components/portal/PortalShell";

export default function CitizenHomePage() {
  return (
    <ProtectedRoute allowedRoles={["citizen"]}>
      <PortalShell
        title="Citizen Safety Portal"
        subtitle="Community alerts, danger reporting, and local landslide risk advisories."
        icon="🏡"
        badgeColor="bg-emerald-100 text-emerald-800"
      />
    </ProtectedRoute>
  );
}

