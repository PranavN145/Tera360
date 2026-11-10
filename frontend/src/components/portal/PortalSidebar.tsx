"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PortalRoleConfig, PortalNavItem } from "./portalNavConfig";

interface PortalSidebarProps {
  portalConfig: PortalRoleConfig;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export default function PortalSidebar({
  portalConfig,
  isOpenMobile = false,
  onCloseMobile,
}: PortalSidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const isItemActive = (item: PortalNavItem) => {
    const [itemPath, itemHash] = item.href.split("#");
    if (itemHash) {
      return (
        pathname === itemPath &&
        typeof window !== "undefined" &&
        window.location.hash === `#${itemHash}`
      );
    }
    if (item.exact) {
      return pathname === itemPath;
    }
    return pathname === itemPath || pathname.startsWith(`${itemPath}/`);
  };

  const renderIcon = (iconName: string, active: boolean) => {
    const strokeClass = active ? "text-[#173D32]" : "text-[#173D32]/75 group-hover:text-[#173D32]";
    switch (iconName) {
      case "dashboard":
        return (
          <svg className={`w-5 h-5 shrink-0 ${strokeClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 12a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1v-7z" />
          </svg>
        );
      case "map":
        return (
          <svg className={`w-5 h-5 shrink-0 ${strokeClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
        );
      case "roads":
        return (
          <svg className={`w-5 h-5 shrink-0 ${strokeClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h8m-8 5h8m-8 5h8M4 3h16a1 1 0 011 1v16a1 1 0 01-1 1H4a1 1 0 01-1-1V4a1 1 0 011-1z" />
          </svg>
        );
      case "alerts":
        return (
          <svg className={`w-5 h-5 shrink-0 ${strokeClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      case "routes":
        return (
          <svg className={`w-5 h-5 shrink-0 ${strokeClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        );
      case "villages":
        return (
          <svg className={`w-5 h-5 shrink-0 ${strokeClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        );
      case "reports":
        return (
          <svg className={`w-5 h-5 shrink-0 ${strokeClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case "tasks":
        return (
          <svg className={`w-5 h-5 shrink-0 ${strokeClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        );
      case "home":
        return (
          <svg className={`w-5 h-5 shrink-0 ${strokeClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        );
      case "safe-place":
        return (
          <svg className={`w-5 h-5 shrink-0 ${strokeClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        );
      case "profile":
        return (
          <svg className={`w-5 h-5 shrink-0 ${strokeClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        );
      default:
        return (
          <svg className={`w-5 h-5 shrink-0 ${strokeClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        );
    }
  };

  const navContent = (
    <div className="relative w-full h-full flex flex-col justify-between overflow-hidden">
      {/* Background Graphic Artwork: side navbar.png with natural lower edge fade */}
      <div
        className="absolute inset-0 z-0 pointer-events-none select-none"
        style={{
          WebkitMaskImage:
            "linear-gradient(to bottom, black 0%, black 50%, rgba(0,0,0,0.7) 65%, rgba(0,0,0,0.2) 75%, transparent 82%)",
          maskImage:
            "linear-gradient(to bottom, black 0%, black 50%, rgba(0,0,0,0.7) 65%, rgba(0,0,0,0.2) 75%, transparent 82%)",
        }}
      >
        <Image
          src="/images/side navbar.png"
          alt="Terra360 Sidebar Landscape Artwork"
          fill
          priority
          sizes="280px"
          className="object-cover object-bottom pointer-events-none select-none"
        />
      </div>

      {/* Top Header / Portal Brand */}
      <div className="relative z-10 p-4 sm:p-5 border-b border-[#173D32]/12">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#173D32]/65 block">
                Command Navigation
              </span>
              <h2 className="text-sm font-extrabold text-[#173D32] tracking-tight truncate mt-0.5">
                {portalConfig.portalName}
              </h2>
            </div>
          )}

          {/* Desktop Collapse Toggle */}
          <button
            type="button"
            onClick={() => setIsCollapsed((prev) => !prev)}
            className="hidden lg:flex p-1.5 rounded-lg bg-white/70 hover:bg-white/95 border border-[#173D32]/15 text-[#173D32] transition-colors cursor-pointer shadow-2xs"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={isCollapsed ? "Expand" : "Collapse"}
          >
            <svg
              className={`w-4 h-4 transition-transform ${isCollapsed ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="relative z-10 flex-1 overflow-y-auto px-3 py-4 space-y-1.5" aria-label="Portal Navigation">
        {portalConfig.navItems.map((item) => {
          const active = isItemActive(item);

          return (
            <Link
              key={item.id}
              href={item.href}
              onClick={onCloseMobile}
              title={isCollapsed ? item.label : undefined}
              className={`group flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                active
                  ? "bg-[#DCE8D4] text-[#173D32] shadow-2xs font-extrabold border border-[#173D32]/15"
                  : "text-[#173D32]/85 hover:text-[#173D32] hover:bg-[#173D32]/8"
              } ${isCollapsed ? "justify-center px-2" : ""}`}
            >
              {renderIcon(item.icon, active)}

              {!isCollapsed && (
                <span className="flex-1 truncate tracking-wide">
                  {item.label}
                </span>
              )}

              {!isCollapsed && active && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#173D32] shrink-0" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Emergency / Operations Notice */}
      <div className="relative z-10 p-3.5 sm:p-4">
        {!isCollapsed ? (
          <Link
            href="/risk-map"
            onClick={onCloseMobile}
            title="Inspect Live GIS Corridor Risk & Telemetry"
            className="block rounded-xl p-3 bg-white/80 hover:bg-white backdrop-blur-xs border border-[#173D32]/15 hover:border-[#173D32]/30 text-[11px] text-[#173D32] shadow-2xs transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between font-bold text-[#173D32] mb-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                <span>Ops Center Live</span>
              </div>
              <span className="text-[10px] text-[#173D32]/60 group-hover:text-[#173D32] group-hover:translate-x-0.5 transition-transform">
                →
              </span>
            </div>
            <p className="text-[#173D32]/75 leading-tight text-[10px]">
              Assam, Nagaland, Sikkim corridors synchronized.
            </p>
          </Link>
        ) : (
          <Link
            href="/risk-map"
            onClick={onCloseMobile}
            className="flex justify-center p-2 rounded-lg hover:bg-white/70 transition-colors"
            title="Inspect Live Ops Center"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse" />
          </Link>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sticky Sidebar */}
      <aside
        className={`hidden lg:block shrink-0 transition-all duration-300 relative bg-[#F6F4EC] text-[#173D32] select-none ${
          isCollapsed ? "w-20" : "w-64"
        }`}
        style={{ minHeight: "calc(100vh - 80px)" }}
      >
        {navContent}
        {/* Soft fading right border divider between sidebar and main workspace */}
        <div
          className="absolute top-0 right-0 bottom-0 w-[1px] pointer-events-none z-10"
          style={{
            background:
              "linear-gradient(to bottom, rgba(23,61,50,0.15) 0%, rgba(23,61,50,0.12) 50%, rgba(23,61,50,0.03) 75%, transparent 95%)",
          }}
        />
      </aside>

      {/* Mobile Backdrop & Drawer */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
            aria-hidden="true"
          />

          {/* Drawer Content */}
          <div className="relative z-10 w-72 max-w-[85vw] h-full bg-[#FAF6F2] text-[#173D32] shadow-2xl flex flex-col animate-in slide-in-from-left duration-200">
            {/* Mobile Close Button Header */}
            <div className="absolute top-3 right-3 z-20">
              <button
                type="button"
                onClick={onCloseMobile}
                className="p-1.5 rounded-xl bg-white/80 hover:bg-white text-[#173D32] border border-[#173D32]/15 transition-colors cursor-pointer shadow-xs"
                aria-label="Close menu"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {navContent}
          </div>
        </div>
      )}
    </>
  );
}

