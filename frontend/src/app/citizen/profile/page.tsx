"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

export default function CitizenProfileRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/account");
  }, [router]);

  return (
    <ProtectedRoute allowedRoles={["citizen"]}>
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#173D32]/20 border-t-[#173D32] rounded-full animate-spin" />
      </div>
    </ProtectedRoute>
  );
}

