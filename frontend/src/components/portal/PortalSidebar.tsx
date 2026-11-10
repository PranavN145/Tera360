"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowRight,
  Bell,
  CheckSquare,
  Compass,
  FileText,
  Home,
  LayoutDashboard,
  Map,
  Navigation,
  Route,
  ShieldCheck,
  Sparkles,
  Truck,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";
import { PortalRoleConfig, PortalNavItem } from "./portalNavConfig";

const NAV_ICON_MAP: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  map: Map,
  roads: Route,
  alerts: Bell,
  routes: Navigation,
  villages: Compass,
  reports: FileText,
  tasks: CheckSquare,
  home: Home,
  "safe-place": ShieldCheck,
  profile: User,
  "route-check": Truck,
  users: Users,
};

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
    const IconComponent = NAV_ICON_MAP[iconName] || Sparkles;
    const strokeClass = active ? "text-[#173D32]" : "text-[#173D32]/75 group-hover:text-[#173D32]";
    return <IconComponent className={`w-5 h-5 shrink-0 transition-colors ${strokeClass}`} strokeWidth={2} aria-hidden="true" />;
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
              <ArrowRight
                className="w-3 h-3 text-[#173D32]/60 group-hover:text-[#173D32] group-hover:translate-x-0.5 transition-transform"
                aria-hidden="true"
              />
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

