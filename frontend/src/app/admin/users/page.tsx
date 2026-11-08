"use client";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import PortalShell from "@/components/portal/PortalShell";

export default function AdminUsersPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <PortalShell
        title="System Administration & Users"
        subtitle="User account management, role assignments, audit logs, and security controls."
        icon="🛡️"
        badgeColor="bg-rose-100 text-rose-900"
      />
    </ProtectedRoute>
  );
}

