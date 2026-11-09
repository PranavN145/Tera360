"use client";

import React from "react";

export default function PortalLoadingShell() {
  return (
    <div className="min-h-screen bg-[#F6F4EC] text-[#173D32] flex flex-col overflow-x-hidden animate-in fade-in duration-150">
      {/* Header Silhouette */}
      <header className="sticky top-0 z-40 w-full h-[72px] sm:h-20 bg-[#F6F4EC]/95 backdrop-blur-md border-b border-[#173D32]/10 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#173D32]/10 animate-pulse flex items-center justify-center font-black text-xs text-[#173D32]/40">
            T
          </div>
          <div>
            <div className="h-4 w-24 bg-[#173D32]/15 rounded-md animate-pulse" />
            <div className="h-2.5 w-16 bg-[#173D32]/10 rounded-md mt-1 animate-pulse" />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#173D32]/10 animate-pulse" />
          <div className="w-8 h-8 rounded-full bg-[#173D32]/15 animate-pulse" />
        </div>
      </header>

      {/* Workspace: Sidebar Silhouette + Main Content Skeleton */}
      <div className="flex-1 flex w-full relative">
        {/* Desktop Sidebar Silhouette */}
        <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-[#173D32]/10 bg-[#FAF8F2]/60 p-4 space-y-3">
          <div className="px-3 py-2">
            <div className="h-3 w-28 bg-[#173D32]/15 rounded animate-pulse mb-4" />
            <div className="space-y-2.5">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="h-9 rounded-xl bg-[#173D32]/8 flex items-center px-3 gap-3 animate-pulse"
                >
                  <div className="w-4 h-4 rounded bg-[#173D32]/15" />
                  <div className="h-3 w-24 bg-[#173D32]/12 rounded" />
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 flex flex-col p-4 sm:p-6 lg:p-8 xl:p-10 w-full max-w-[1600px]">
          {/* Breadcrumb Skeleton */}
          <div className="flex items-center gap-2 mb-6">
            <div className="h-4 w-20 bg-[#173D32]/10 rounded animate-pulse" />
            <div className="h-4 w-4 bg-[#173D32]/5 rounded animate-pulse" />
            <div className="h-4 w-28 bg-[#173D32]/15 rounded animate-pulse" />
          </div>

          {/* Title Strip Skeleton */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-5 border-b border-[#173D32]/10">
            <div>
              <div className="h-7 w-64 sm:w-80 bg-[#173D32]/20 rounded-lg animate-pulse" />
              <div className="h-3.5 w-48 sm:w-96 bg-[#173D32]/10 rounded-md mt-2 animate-pulse" />
            </div>
            <div className="h-8 w-28 bg-[#173D32]/10 rounded-full animate-pulse" />
          </div>

          {/* Verification Status Card */}
          <div className="mb-8 p-6 rounded-2xl bg-[#FAF8F2] border border-[#173D32]/12 shadow-2xs flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            <div className="w-10 h-10 border-3 border-[#173D32]/20 border-t-[#173D32] rounded-full animate-spin shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-bold text-[#173D32]">
                Verifying Security Clearance
              </h3>
              <p className="text-xs text-[#173D32]/70 mt-0.5">
                Restoring authenticated session and operational corridor feeds...
              </p>
            </div>
          </div>

          {/* Metric Cards Skeleton Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="p-5 bg-[#FAF8F2] rounded-2xl border border-[#173D32]/10 space-y-3"
              >
                <div className="h-3 w-20 bg-[#173D32]/15 rounded animate-pulse" />
                <div className="h-8 w-16 bg-[#173D32]/20 rounded-lg animate-pulse" />
                <div className="h-2.5 w-full bg-[#173D32]/10 rounded animate-pulse pt-2" />
              </div>
            ))}
          </div>

          {/* Large Content Skeleton */}
          <div className="p-6 bg-[#FAF8F2] rounded-3xl border border-[#173D32]/10 space-y-4">
            <div className="h-4 w-40 bg-[#173D32]/15 rounded animate-pulse" />
            <div className="space-y-3 pt-2">
              <div className="h-14 bg-[#173D32]/5 rounded-xl animate-pulse" />
              <div className="h-14 bg-[#173D32]/5 rounded-xl animate-pulse" />
              <div className="h-14 bg-[#173D32]/5 rounded-xl animate-pulse" />
            </div>
          </div>
        </main>
      </div>

      {/* Footer Silhouette */}
      <footer className="w-full bg-[#173D32] text-[#F6F4EC]/60 px-6 py-6 border-t border-[#173D32]/20 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="h-4 w-32 bg-[#F6F4EC]/20 rounded animate-pulse" />
        <div className="h-3 w-48 bg-[#F6F4EC]/15 rounded animate-pulse" />
      </footer>
    </div>
  );
}

