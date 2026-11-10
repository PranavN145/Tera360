"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { getRolePortalPath } from "@/lib/api";

interface NavItem {
  name: string;
  href: string;
  targetId: string;
}

const NAV_ITEMS: NavItem[] = [
  { name: "Home", href: "/#home", targetId: "home" },
  { name: "Risk Map", href: "/#risk-map", targetId: "risk-map" },
  { name: "Alerts", href: "/#alerts", targetId: "alerts" },
  { name: "About", href: "/#about", targetId: "about" },
  { name: "Report", href: "/#report", targetId: "report" },
];

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("home");
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useApp();

  // Flag and timer to suppress scroll-spy updates during programmatic click transitions
  const isProgrammaticScrollRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const unlockScroll = useCallback(() => {
    isProgrammaticScrollRef.current = false;
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = null;
    }
  }, []);

  // Prevent automatic scroll to bottom/hash on page refresh, or scroll to target hash
  useEffect(() => {
    if (pathname !== "/") return;

    // Disable browser automatic scroll restoration on reload
    if (typeof window !== "undefined" && "scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    const navEntry =
      typeof window !== "undefined" &&
      window.performance &&
      window.performance.getEntriesByType("navigation").length > 0
        ? (window.performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming)
        : undefined;
    const isReload = navEntry?.type === "reload";

    if (isReload) {
      if (window.location.hash) {
        window.history.replaceState(null, "", window.location.pathname);
      }
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      setActiveSection("home");
    } else if (window.location.hash) {
      const targetId = window.location.hash.replace("#", "");
      let targetEl = document.getElementById(targetId);
      if (!targetEl && targetId === "about") {
        targetEl = document.getElementById("how-it-works") || document.getElementById("about");
      }
      if (targetEl) {
        setActiveSection(targetId);
        isProgrammaticScrollRef.current = true;
        targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
        scrollTimeoutRef.current = setTimeout(() => {
          isProgrammaticScrollRef.current = false;
          scrollTimeoutRef.current = null;
        }, 1200);
      }
    }
  }, [pathname]);

  // Track active section as user scrolls through the homepage
  useEffect(() => {
    if (pathname !== "/") return;

    const sectionIds = ["home", "risk-map", "alerts", "about", "report"];

    const handleScroll = () => {
      // Do not update active state during programmatic click transitions
      if (isProgrammaticScrollRef.current) return;

      // 1. If at top of the page (scrollY < 120), Home is active
      if (window.scrollY < 120) {
        setActiveSection("home");
        return;
      }

      // 2. If user has scrolled near bottom of page (within 120px)
      const isAtBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 120;

      if (isAtBottom) {
        setActiveSection("report");
        return;
      }

      // 3. Find active section based on viewport bounding rectangles
      const threshold = 200;
      let currentSection = "home";

      for (let i = sectionIds.length - 1; i >= 0; i--) {
        const id = sectionIds[i];
        const el = document.getElementById(id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= threshold) {
            currentSection = id;
            break;
          }
        }
      }

      setActiveSection(currentSection);
    };

    // User manual interaction instantly releases the programmatic scroll lock
    const handleUserInteraction = () => {
      if (isProgrammaticScrollRef.current) {
        unlockScroll();
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("wheel", handleUserInteraction, { passive: true });
    window.addEventListener("touchmove", handleUserInteraction, { passive: true });
    window.addEventListener("keydown", handleUserInteraction, { passive: true });
    window.addEventListener("scrollend", handleUserInteraction, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("wheel", handleUserInteraction);
      window.removeEventListener("touchmove", handleUserInteraction);
      window.removeEventListener("keydown", handleUserInteraction);
      window.removeEventListener("scrollend", handleUserInteraction);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [pathname, unlockScroll]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Prevent background scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  const handleNavClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    targetId: string
  ) => {
    setMobileMenuOpen(false);

    if (pathname === "/") {
      e.preventDefault();

      // Immediately activate target button without delay
      setActiveSection(targetId);

      // Lock scroll-spy listener so intermediate sections don't cause the indicator to travel
      isProgrammaticScrollRef.current = true;
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      scrollTimeoutRef.current = setTimeout(() => {
        isProgrammaticScrollRef.current = false;
        scrollTimeoutRef.current = null;
      }, 1200);

      if (targetId === "home") {
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      let targetEl = document.getElementById(targetId);
      if (!targetEl && targetId === "about") {
        targetEl = document.getElementById("how-it-works") || document.getElementById("about");
      }

      if (targetEl) {
        targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    } else {
      setActiveSection(targetId);
    }
  };

  const isActive = (item: NavItem) => {
    if (pathname === "/") {
      return activeSection === item.targetId;
    }
    return pathname.startsWith(`/${item.targetId}`);
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 pt-[14px] sm:pt-[16px] lg:pt-[20px] px-3 sm:px-6 pointer-events-none transition-all">
        {/* Sleek, compact floating capsule navbar */}
        <div
          className={`w-full sm:w-[94%] ${
            user ? "max-w-[940px]" : "max-w-[820px]"
          } mx-auto pointer-events-auto`}
        >
          {/* Compact floating navbar: 54px-58px height, rounded-[36px], background #F6F4EC */}
          <div className="relative w-full h-[54px] lg:h-[58px] bg-[#F6F4EC]/95 backdrop-blur-md rounded-[36px] px-3.5 sm:px-5 lg:px-6 border border-[#173D32]/10 shadow-[0_4px_25px_-4px_rgba(23,61,50,0.12)] flex items-center justify-between gap-2 transition-all">
          
          {/* Left: Logo */}
          <div className="flex items-center shrink-0">
            <Link
              href="/"
              onClick={(e) => {
                if (pathname === "/") {
                  e.preventDefault();
                  window.scrollTo({ top: 0, behavior: "smooth" });
                  setActiveSection("home");
                }
              }}
              className="flex items-center rounded-lg focus-visible:outline-2 focus-visible:outline-[#173D32] transition-opacity hover:opacity-90"
              aria-label="Terra360 Homepage"
            >
              <div className="relative w-[125px] lg:w-[138px] h-[36px] lg:h-[40px]">
                <Image
                  src="/images/header_logo.png"
                  alt="Terra360"
                  fill
                  sizes="138px"
                  className="object-contain object-left"
                  priority
                />
              </div>
            </Link>
          </div>

          {/* Center: Navigation Links centered directly between Logo on left and Login on right with equal space */}
          <nav
            className={`hidden lg:flex flex-1 items-center justify-center ${
              user ? "gap-3.5 xl:gap-6" : "gap-5 xl:gap-7"
            } px-2`}
            aria-label="Main Navigation"
          >
            {NAV_ITEMS.map((item) => {
              const active = isActive(item);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={(e) => handleNavClick(e, item.targetId)}
                  className={`relative py-1 text-[14px] xl:text-[15px] transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-[#173D32] rounded-xs whitespace-nowrap cursor-pointer ${
                    active
                      ? "font-bold text-[#173D32]"
                      : "font-semibold text-[#173D32]/75 hover:text-[#173D32]"
                  }`}
                  aria-current={active ? "page" : undefined}
                >
                  <span>{item.name}</span>
                  {/* Active link indicator with subtle 150-200ms transition */}
                  <span
                    className={`absolute -bottom-1 left-0 right-0 h-[2.5px] bg-[#173D32] rounded-full transition-all duration-200 ease-out origin-center ${
                      active
                        ? "opacity-100 scale-x-100"
                        : "opacity-0 scale-x-50 pointer-events-none"
                    }`}
                    aria-hidden="true"
                  />
                </Link>
              );
            })}
          </nav>

          {/* Right: Login & Register Buttons */}
          <div className="hidden lg:flex items-center justify-end gap-2 shrink-0">
            {user ? (
              <div className="flex items-center gap-2">
                <Link
                  href="/account"
                  className="text-right leading-tight max-w-[110px] hover:opacity-85 transition-opacity"
                  title="Account Settings"
                >
                  <span className="block text-xs font-bold text-[#173D32] truncate">
                    {user.name.split(" ")[0]}
                  </span>
                  <span className="block text-[10px] text-[#173D32]/70 font-semibold truncate capitalize">
                    {user.role?.replace("_", " ")}
                  </span>
                </Link>
                <Link
                  href="/account"
                  className="h-[32px] px-2.5 inline-flex items-center justify-center rounded-full bg-[#173D32]/10 hover:bg-[#173D32]/15 text-[#173D32] text-xs font-bold transition-colors"
                  title="Account Settings"
                >
                  Account
                </Link>
                <Link
                  href={getRolePortalPath(user.role)}
                  className="h-[32px] px-3 inline-flex items-center justify-center rounded-full bg-[#173D32] text-[#F6F4EC] hover:bg-[#1f4e40] text-xs font-bold transition-colors"
                >
                  {user.role === "officer" ? "Officer Portal →" : "Portal"}
                </Link>
                <button
                  type="button"
                  onClick={async () => {
                    await logout();
                    router.push("/");
                  }}
                  className="h-[32px] px-3 inline-flex items-center justify-center rounded-full border border-[#173D32]/30 text-[#173D32] hover:bg-[#173D32]/10 text-xs font-bold transition-colors cursor-pointer"
                  title="Sign Out"
                >
                  Logout
                </button>
              </div>
            ) : (
              <>
                <Link
                  href="/login"
                  className="h-[36px] px-4.5 inline-flex items-center justify-center rounded-full border-2 border-[#173D32] text-[#173D32] hover:bg-[#173D32]/5 text-[13px] font-bold tracking-wide transition-colors focus-visible:outline-2 focus-visible:outline-[#173D32] cursor-pointer whitespace-nowrap"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="h-[36px] px-5 inline-flex items-center justify-center rounded-full bg-[#173D32] text-[#F6F4EC] hover:bg-[#1a4437] text-[13px] font-bold tracking-wide transition-colors shadow-xs hover:shadow focus-visible:outline-2 focus-visible:outline-[#173D32] cursor-pointer whitespace-nowrap"
                >
                  Register
                </Link>
              </>
            )}
          </div>

          {/* Mobile/Tablet Menu Hamburger Button */}
          <div className="flex lg:hidden items-center">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-expanded={mobileMenuOpen}
              aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              className="p-1.5 rounded-full text-[#173D32] hover:bg-[#173D32]/10 transition-colors focus-visible:outline-2 focus-visible:outline-[#173D32] cursor-pointer"
            >
              <svg
                className="w-5 h-5 sm:w-6 sm:h-6"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                aria-hidden="true"
              >
                {mobileMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile / Tablet Dropdown Menu */}
        {mobileMenuOpen && (
          <div
            className="lg:hidden mt-2 bg-[#F6F4EC]/98 backdrop-blur-xl border border-[#173D32]/15 rounded-3xl p-4 sm:p-5 shadow-xl transition-all max-h-[calc(100dvh-5.75rem)] overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile Navigation Menu"
          >
            <nav className="flex flex-col gap-1.5">
              {NAV_ITEMS.map((item) => {
                const active = isActive(item);
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={(e) => handleNavClick(e, item.targetId)}
                    className={`min-h-[44px] flex items-center justify-between px-4 py-2.5 rounded-2xl text-[16px] transition-colors duration-200 cursor-pointer ${
                      active
                        ? "bg-[#DCE8D4] text-[#173D32] font-bold"
                        : "text-[#173D32]/85 hover:bg-[#173D32]/5 hover:text-[#173D32] font-medium"
                    }`}
                    aria-current={active ? "page" : undefined}
                  >
                    <span>{item.name}</span>
                    <span
                      className={`w-2 h-2 rounded-full bg-[#173D32] transition-all duration-200 ${
                        active ? "opacity-100 scale-100" : "opacity-0 scale-50 pointer-events-none"
                      }`}
                      aria-hidden="true"
                    />
                  </Link>
                );
              })}
            </nav>

            <div className="border-t border-[#173D32]/10 mt-4 pt-4 flex flex-col sm:flex-row gap-3">
              {user ? (
                <div className="w-full flex flex-col gap-2 p-3.5 rounded-2xl bg-[#DCE8D4]/50 border border-[#173D32]/10">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="block text-sm font-bold text-[#173D32] truncate">{user.name}</span>
                      <span className="block text-xs text-[#173D32]/70 capitalize truncate">
                        {user.role?.replace("_", " ")}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        await logout();
                        setMobileMenuOpen(false);
                        router.push("/");
                      }}
                      className="px-3 py-1 rounded-full border border-[#173D32]/30 text-xs font-bold text-[#173D32] hover:bg-red-50 hover:text-red-700 hover:border-red-300 transition-colors cursor-pointer shrink-0"
                    >
                      Sign Out
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-[#173D32]/10">
                    <Link
                      href="/account"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex-1 py-2 rounded-xl bg-[#FAF8F2] border border-[#173D32]/15 text-center text-xs font-bold text-[#173D32] hover:bg-[#F6F4EC] transition-colors"
                    >
                      Account Settings
                    </Link>
                    <Link
                      href={getRolePortalPath(user.role)}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex-1 py-2 rounded-xl bg-[#173D32] text-center text-xs font-bold text-[#F6F4EC] hover:bg-[#1f4e40] transition-colors"
                    >
                      Role Portal →
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2.5 w-full">
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="min-h-[44px] flex-1 flex items-center justify-center px-4 rounded-full text-sm font-bold text-[#173D32] border-2 border-[#173D32] hover:bg-[#173D32]/5 transition-colors cursor-pointer"
                  >
                    Login
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="min-h-[44px] flex-1 flex items-center justify-center px-4 rounded-full text-sm font-bold bg-[#173D32] text-[#F6F4EC] hover:bg-[#1a4437] shadow-sm transition-colors cursor-pointer"
                  >
                    Register
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
    {/* Structural spacer so content underneath maintains perfect spacing */}
    <div className="h-[74px] lg:h-[80px] shrink-0 pointer-events-none" aria-hidden="true" />
  </>
  );
}
