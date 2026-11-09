"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { PortalRoleConfig } from "./portalNavConfig";
import DropdownPortal from "@/components/ui/DropdownPortal";
import { demoDataManager } from "@/data/demoDataManager";

interface PortalHeaderProps {
  portalConfig: PortalRoleConfig;
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

export default function PortalHeader({
  portalConfig,
  onToggleSidebar,
  isSidebarOpen,
}: PortalHeaderProps) {
  const { user, logout } = useApp();
  const router = useRouter();

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const notifTriggerRef = useRef<HTMLButtonElement>(null);
  const profileTriggerRef = useRef<HTMLButtonElement>(null);

  const [isDemoMode, setIsDemoMode] = useState(() => demoDataManager.isDemoModeActive());

  useEffect(() => {
    return demoDataManager.subscribe(() => {
      setIsDemoMode(demoDataManager.isDemoModeActive());
    });
  }, []);

  const toggleNotifications = () => {
    setIsNotificationsOpen((prev) => {
      const next = !prev;
      if (next) setIsProfileOpen(false);
      return next;
    });
  };

  const toggleProfile = () => {
    setIsProfileOpen((prev) => {
      const next = !prev;
      if (next) setIsNotificationsOpen(false);
      return next;
    });
  };

  const handleLogout = async () => {
    setIsProfileOpen(false);
    await logout();
    router.push("/login");
  };

  const userInitials = user?.name
    ? user.name
        .split(" ")
        .filter(Boolean)
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : portalConfig.role === "citizen"
    ? "CZ"
    : portalConfig.role === "field_officer"
    ? "FO"
    : "OP";

  // Check if unread notifications exist (0 when backend notification endpoint is not implemented)
  const unreadCount = 0;

  return (
    <header className="relative z-30 w-full bg-[#FDF9F3] text-[#173D32] shadow-xs border-b border-[#173D32]/15 select-none">
      {/* Decorative Mountain Illustration Background: header.png (scoped overflow clipping) */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <Image
          src="/images/header.png"
          alt="Terra360 Mountains Header Band"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center pointer-events-none select-none"
        />
      </div>

      {/* Header Content Container */}
      <div className="relative z-10 w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">
        
        {/* Left: Mobile Menu Toggle & Brand Logo */}
        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
          {/* Mobile Sidebar Toggle Button */}
          {onToggleSidebar && (
            <button
              type="button"
              onClick={onToggleSidebar}
              className="lg:hidden p-2 rounded-xl bg-white/80 hover:bg-white/95 border border-[#173D32]/15 text-[#173D32] shadow-xs backdrop-blur-sm transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-[#D6A65D]"
              aria-label={isSidebarOpen ? "Close menu" : "Open menu"}
              aria-expanded={isSidebarOpen}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isSidebarOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          )}

          {/* Logo with link to portal home */}
          <Link
            href={portalConfig.homePath}
            className="flex items-center gap-3 group focus-visible:outline-2 focus-visible:outline-[#D6A65D] rounded-lg"
            aria-label={`${portalConfig.portalName} Home`}
          >
            <div className="relative w-[130px] sm:w-[155px] h-[34px] sm:h-[40px]">
              <Image
                src="/images/header_logo.png"
                alt="Terra360 Logo"
                fill
                priority
                sizes="155px"
                className="object-contain object-left"
              />
            </div>
          </Link>

          {/* Portal Role Badge & Dev Mode Pill */}
          <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-[#173D32]/20">
            <span className="px-2.5 py-0.5 rounded-full bg-white/70 border border-[#173D32]/15 text-xs font-bold text-[#173D32] tracking-wide uppercase shadow-2xs backdrop-blur-xs">
              {portalConfig.badgeLabel}
            </span>
            {isDemoMode && (
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-[11px] font-bold text-amber-900 shadow-2xs backdrop-blur-xs"
                title="Frontend-First Mode: Local Demo Data Active (Backend Offline)"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                <span>⚡ Dev Mode</span>
              </span>
            )}
          </div>
        </div>

        {/* Right: Notification Bell & Profile Dropdown */}
        <div className="flex items-center gap-2 sm:gap-4">
          
          {/* Notification Bell */}
          <div className="relative">
            <button
              ref={notifTriggerRef}
              type="button"
              onClick={toggleNotifications}
              className={`relative p-2 sm:p-2.5 rounded-xl border border-[#173D32]/15 text-[#173D32] shadow-xs backdrop-blur-sm transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-[#D6A65D] ${
                isNotificationsOpen ? "bg-white ring-2 ring-[#173D32]/25" : "bg-white/80 hover:bg-white/95"
              }`}
              aria-label="Notifications"
              aria-expanded={isNotificationsOpen}
            >
              <svg className="w-5 h-5 text-[#173D32]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {/* Only show unread indicator if genuine unread notifications exist */}
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                </span>
              )}
            </button>

            {/* Notifications Dropdown Panel (Rendered via React Portal into document.body) */}
            <DropdownPortal
              isOpen={isNotificationsOpen}
              onClose={() => setIsNotificationsOpen(false)}
              triggerRef={notifTriggerRef}
              align="right"
              role="region"
              aria-label="System Notifications"
              className="p-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#173D32]/10 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#173D32]">
                    Notifications
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-[#173D32]/10 text-[10px] font-bold text-[#173D32]">
                    0 Unread
                  </span>
                </div>
                <Link
                  href={portalConfig.role === "officer" ? "/officer/alerts" : "/alerts"}
                  onClick={() => setIsNotificationsOpen(false)}
                  className="text-[11px] font-semibold text-[#173D32]/70 hover:text-[#173D32] underline"
                >
                  View Advisories
                </Link>
              </div>

              {/* Authentic Empty State — Truthfully reports no pending notifications */}
              <div className="text-center py-6 px-3">
                <div className="w-12 h-12 rounded-2xl bg-[#DCE8D4]/60 border border-[#173D32]/15 flex items-center justify-center text-2xl shadow-2xs mx-auto mb-3 text-[#173D32]">
                  🔔
                </div>
                <h4 className="text-sm font-extrabold text-[#173D32] mb-1">
                  No New Notifications
                </h4>
                <p className="text-xs text-[#173D32]/75 leading-relaxed max-w-xs mx-auto">
                  You are all caught up! Real-time emergency dispatches and operational bulletins will appear here.
                </p>
                <div className="mt-4 pt-3 border-t border-[#173D32]/10">
                  <Link
                    href={portalConfig.role === "officer" ? "/officer/alerts" : "/alerts"}
                    onClick={() => setIsNotificationsOpen(false)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#173D32] hover:underline"
                  >
                    <span>Check Live Operational Feeds</span>
                    <span>→</span>
                  </Link>
                </div>
              </div>
            </DropdownPortal>
          </div>

          {/* User Avatar & Profile Dropdown */}
          <div className="relative">
            <button
              ref={profileTriggerRef}
              type="button"
              onClick={toggleProfile}
              className={`flex items-center gap-2.5 pl-2 pr-2.5 sm:pr-3 py-1.5 rounded-2xl border border-[#173D32]/15 text-[#173D32] shadow-xs backdrop-blur-sm transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-[#D6A65D] ${
                isProfileOpen ? "bg-white ring-2 ring-[#173D32]/25" : "bg-white/80 hover:bg-white/95"
              }`}
              aria-label="User Account Menu"
              aria-expanded={isProfileOpen}
            >
              {/* Avatar circle */}
              <div className="w-8 h-8 rounded-full bg-[#173D32] text-[#F6F4EC] font-black text-xs flex items-center justify-center shadow-xs shrink-0">
                {userInitials}
              </div>

              {/* Name & Role (Desktop) */}
              <div className="hidden md:flex flex-col text-left">
                <span className="text-xs font-bold text-[#173D32] leading-tight truncate max-w-[130px]">
                  {user?.name || "Portal User"}
                </span>
                <span className="text-[10px] text-[#173D32]/70 font-semibold leading-tight capitalize">
                  {user?.role ? user.role.replace("_", " ") : portalConfig.badgeLabel}
                </span>
              </div>

              {/* Chevron icon */}
              <svg
                className={`w-4 h-4 text-[#173D32]/70 transition-transform ${isProfileOpen ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Profile Dropdown Menu (Rendered via React Portal into document.body) */}
            <DropdownPortal
              isOpen={isProfileOpen}
              onClose={() => setIsProfileOpen(false)}
              triggerRef={profileTriggerRef}
              align="right"
              role="menu"
              aria-label="User Account Menu"
              className="p-3"
            >
              {/* User Details Header */}
              <div className="px-3 py-3 border-b border-[#173D32]/10 mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#173D32] text-[#F6F4EC] font-black text-sm flex items-center justify-center shadow-xs shrink-0">
                    {userInitials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-extrabold text-[#173D32] truncate">
                      {user?.name || "Authenticated User"}
                    </p>
                    <p className="text-xs text-[#173D32]/70 truncate mt-0.5">
                      {user?.email || "No email"}
                    </p>
                  </div>
                </div>
                <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full bg-[#DCE8D4] text-[#173D32] text-[10px] font-bold uppercase tracking-wider">
                    {user?.role ? user.role.replace("_", " ") : portalConfig.badgeLabel}
                  </span>
                  {user?.emailVerified && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-semibold">
                      Verified
                    </span>
                  )}
                  {isDemoMode && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold border border-amber-200">
                      ⚡ Dev Mode
                    </span>
                  )}
                </div>
              </div>

              {/* Dropdown Navigation Actions */}
              <div className="space-y-1 text-xs">
                {/* 1. My Profile */}
                <Link
                  href={portalConfig.role === "citizen" ? "/citizen/profile" : "/account?tab=profile"}
                  onClick={() => setIsProfileOpen(false)}
                  role="menuitem"
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-[#173D32]/10 transition-colors font-bold text-[#173D32]"
                >
                  <svg className="w-4 h-4 text-[#173D32]/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span>My Profile</span>
                </Link>

                {/* 2. Account Settings */}
                <Link
                  href="/account?tab=security"
                  onClick={() => setIsProfileOpen(false)}
                  role="menuitem"
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-[#173D32]/10 transition-colors font-bold text-[#173D32]"
                >
                  <svg className="w-4 h-4 text-[#173D32]/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>Account Settings</span>
                </Link>

                {/* 3. Public Website Link */}
                <Link
                  href="/"
                  onClick={() => setIsProfileOpen(false)}
                  role="menuitem"
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-[#173D32]/10 transition-colors font-medium text-[#173D32]/85"
                >
                  <svg className="w-4 h-4 text-[#173D32]/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  <span>Public Website</span>
                </Link>
              </div>

              {/* Logout Button */}
              <div className="pt-2 mt-2 border-t border-[#173D32]/10">
                <button
                  type="button"
                  onClick={handleLogout}
                  role="menuitem"
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-xs font-bold text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
                >
                  <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>Logout</span>
                </button>
              </div>
            </DropdownPortal>
          </div>
        </div>
      </div>
    </header>
  );
}
