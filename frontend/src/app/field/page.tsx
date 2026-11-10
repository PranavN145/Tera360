"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function FieldRootPage() {
  const router = useRouter();

  useEffect(() => {
    // AUD-07: Consolidate Field Officer portal on canonical /field/tasks workspace
    router.replace("/field/tasks");
  }, [router]);

  return (
    <div className="min-h-screen bg-[#FAF8F2] flex items-center justify-center p-6 text-[#173D32]">
      <div className="text-center">
        <div className="w-8 h-8 border-3 border-[#173D32] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm font-semibold">Redirecting to Field Operations Workspace...</p>
      </div>
    </div>
  );
}
