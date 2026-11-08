"use client";

import React from "react";
import { useApp } from "@/context/AppContext";

export default function ToastContainer() {
  const { toasts, removeToast } = useApp();

  if (!toasts.length) return null;

  return (
    <div
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
      aria-live="polite"
    >
      {toasts.map((toast) => {
        const isSuccess = toast.type === "success";
        const isWarning = toast.type === "warning";

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto p-4 rounded-2xl shadow-xl border backdrop-blur-md transition-all flex items-start justify-between gap-3 ${
              isSuccess
                ? "bg-[#173D32] text-[#F6F4EC] border-[#173D32]/20"
                : isWarning
                ? "bg-amber-900 text-amber-50 border-amber-800"
                : "bg-[#F6F4EC] text-[#173D32] border-[#173D32]/15"
            }`}
          >
            <div className="flex items-start gap-2.5">
              <span className="text-lg">
                {isSuccess ? "✓" : isWarning ? "⚠️" : "ℹ️"}
              </span>
              <div>
                <h4 className="text-sm font-bold leading-tight">{toast.title}</h4>
                <p className="text-xs mt-0.5 opacity-90 leading-snug">{toast.description}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="p-1 rounded-lg opacity-60 hover:opacity-100 transition-opacity"
              aria-label="Dismiss toast"
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}

