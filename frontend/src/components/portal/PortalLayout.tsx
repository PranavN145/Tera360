"use client";

import React, { useState, useEffect, createContext, useContext } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { UserRole } from "@/types/auth";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import PortalHeader from "./PortalHeader";
import PortalSidebar from "./PortalSidebar";
import PortalFooter from "./PortalFooter";
import { getPortalConfig, PortalRoleConfig } from "./portalNavConfig";

export const PortalLayoutContext = createContext<{
  isInsidePortalLayout: boolean;
}>({
  isInsidePortalLayout: false,
});

interface PortalLayoutProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  title?: string;
  subtitle?: string;
  headerActions?: React.ReactNode;
}

export default function PortalLayout({
  children,
  allowedRoles = ["officer"],
  title,
  subtitle,
  headerActions,
}: PortalLayoutProps) {
  const { user } = useApp();
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Check if we are nested inside an existing directory-level PortalLayout
  const parentLayout = useContext(PortalLayoutContext);

  // Auto-close mobile sidebar drawer on route transition
  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [pathname]);

  // Derive portal configuration dynamically based on the current user's role
  const portalConfig: PortalRoleConfig = getPortalConfig(user?.role);

  const isHomePage = pathname === portalConfig.homePath;
  const showBackButton = !isHomePage;

  // Safe back navigation: only calls router.back() if there is same-origin history; otherwise safe fallback to portal home
  const handleBack = () => {
    if (
      typeof window !== "undefined" &&
      window.history.length > 1 &&
      document.referrer &&
      document.referrer.includes(window.location.host)
    ) {
      router.back();
    } else {
      router.push(portalConfig.homePath);
    }
  };

  // If already nested inside a persistent PortalLayout (e.g. from app/officer/layout.tsx),
  // render only the page-level breadcrumbs, title banner, and children.
  // This prevents unmounting Header, Sidebar, and Footer when navigating between sibling tabs!
  if (parentLayout.isInsidePortalLayout) {
    return (
      <div className="flex-1 flex flex-col w-full">
        {/* Breadcrumb & Safe Back Navigation Bar */}
        <div className="flex items-center gap-2 mb-4 text-xs">
          {showBackButton && (
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/80 hover:bg-white text-[#173D32] border border-[#173D32]/15 shadow-2xs transition-all cursor-pointer font-bold shrink-0"
              aria-label="Go back to previous page"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Back</span>
            </button>
          )}
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[#173D32]/75 truncate">
            <Link
              href={portalConfig.homePath}
              className="hover:text-[#173D32] hover:underline font-medium truncate"
            >
              {portalConfig.portalName}
            </Link>
            {title && !isHomePage && (
              <>
                <span className="text-[#173D32]/40 shrink-0">/</span>
                <span className="text-[#173D32] font-extrabold truncate">{title}</span>
              </>
            )}
          </nav>
        </div>

        {/* Page Title Header Strip */}
        {(title || headerActions) && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8 pb-5 border-b border-[#173D32]/12">
            <div>
              {title && (
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#173D32] tracking-tight">
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="text-xs sm:text-sm text-[#173D32]/75 mt-1 font-normal max-w-3xl leading-relaxed">
                  {subtitle}
                </p>
              )}
            </div>

            {headerActions && (
              <div className="flex flex-wrap items-center gap-2.5 sm:shrink-0">
                {headerActions}
              </div>
            )}
          </div>
        )}

        {/* Page Body Viewport */}
        <div className="flex-1 w-full">{children}</div>
      </div>
    );
  }

  // Standalone / Top-level Portal Layout (mounts persistent Header, Sidebar, and Footer)
  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <PortalLayoutContext.Provider value={{ isInsidePortalLayout: true }}>
        <div className="min-h-screen bg-[#F6F4EC] text-[#173D32] flex flex-col overflow-x-clip selection:bg-[#DCE8D4] selection:text-[#173D32]">
          {/* Shared Portal Header (with header.png background) */}
          <PortalHeader
            portalConfig={portalConfig}
            onToggleSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
            isSidebarOpen={isMobileSidebarOpen}
          />

          {/* Central Workspace: Sidebar + Main Content */}
          <div className="flex-1 flex w-full relative">
            {/* Shared Portal Sidebar (with side navbar.png background) */}
            <PortalSidebar
              portalConfig={portalConfig}
              isOpenMobile={isMobileSidebarOpen}
              onCloseMobile={() => setIsMobileSidebarOpen(false)}
            />

            {/* Main Content Area */}
            <main className="flex-1 min-w-0 flex flex-col p-4 sm:p-6 lg:p-8 xl:p-10 w-full max-w-[1600px]">
              {/* Render breadcrumb and page title only if title was explicitly passed to this outer instance */}
              {title && (
                <>
                  <div className="flex items-center gap-2 mb-4 text-xs">
                    {showBackButton && (
                      <button
                        type="button"
                        onClick={handleBack}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/80 hover:bg-white text-[#173D32] border border-[#173D32]/15 shadow-2xs transition-all cursor-pointer font-bold shrink-0"
                        aria-label="Go back to previous page"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                        </svg>
                        <span>Back</span>
                      </button>
                    )}
                    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[#173D32]/75 truncate">
                      <Link
                        href={portalConfig.homePath}
                        className="hover:text-[#173D32] hover:underline font-medium truncate"
                      >
                        {portalConfig.portalName}
                      </Link>
                      {!isHomePage && (
                        <>
                          <span className="text-[#173D32]/40 shrink-0">/</span>
                          <span className="text-[#173D32] font-extrabold truncate">{title}</span>
                        </>
                      )}
                    </nav>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8 pb-5 border-b border-[#173D32]/12">
                    <div>
                      <h1 className="text-2xl sm:text-3xl font-extrabold text-[#173D32] tracking-tight">
                        {title}
                      </h1>
                      {subtitle && (
                        <p className="text-xs sm:text-sm text-[#173D32]/75 mt-1 font-normal max-w-3xl leading-relaxed">
                          {subtitle}
                        </p>
                      )}
                    </div>

                    {headerActions && (
                      <div className="flex flex-wrap items-center gap-2.5 sm:shrink-0">
                        {headerActions}
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Page Body Viewport */}
              <div className="flex-1 w-full">{children}</div>
            </main>
          </div>

          {/* Shared Portal Footer (with footer_bg.png background) */}
          <PortalFooter />
        </div>
      </PortalLayoutContext.Provider>
    </ProtectedRoute>
  );
}
