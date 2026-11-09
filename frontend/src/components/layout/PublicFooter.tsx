"use client";

import { usePathname } from "next/navigation";
import Footer from "./Footer";

const PORTAL_ROUTES = [
  "/officer",
  "/admin",
  "/citizen",
  "/field",
  "/driver",
];

/**
 * PublicFooter selectively renders the public website Footer component
 * on public pages, while omitting it on portal workspaces (/officer, /admin,
 * /citizen, /field, /driver) where PortalLayout renders PortalFooter.
 */
export default function PublicFooter() {
  const pathname = usePathname();

  const isPortalRoute = PORTAL_ROUTES.some((prefix) => pathname.startsWith(prefix));

  if (isPortalRoute) {
    return null;
  }

  return <Footer />;
}

