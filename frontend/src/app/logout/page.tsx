"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";

export default function LogoutPage() {
  const { logout } = useApp();
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    async function performLogout() {
      await logout();
      if (mounted) {
        router.replace("/login");
      }
    }
    void performLogout();
    return () => {
      mounted = false;
    };
  }, [logout, router]);

  return (
    <div className="min-h-screen bg-[#F6F4EC] flex flex-col items-center justify-center p-6 text-[#173D32]">
      <div className="w-10 h-10 border-3 border-[#173D32]/20 border-t-[#173D32] rounded-full animate-spin mb-4" />
      <p className="text-sm font-bold text-[#173D32]">Signing out of Terra360...</p>
    </div>
  );
}

