import { UserRole } from "@/types/auth";

export interface PortalNavItem {
  id: string;
  label: string;
  href: string;
  icon: string;
  badge?: string;
  exact?: boolean;
}

export interface PortalRoleConfig {
  role: UserRole;
  portalName: string;
  badgeLabel: string;
  homePath: string;
  navItems: PortalNavItem[];
}

export const PORTAL_CONFIGS: Record<UserRole, PortalRoleConfig> = {
  officer: {
    role: "officer",
    portalName: "Officer Command Portal",
    badgeLabel: "Disaster Operations",
    homePath: "/officer/dashboard",
    navItems: [
      { id: "dashboard", label: "Dashboard", href: "/officer/dashboard", icon: "dashboard", exact: true },
      { id: "map", label: "Live Risk Map", href: "/officer/map", icon: "map" },
      { id: "roads", label: "Road Impact", href: "/officer/roads", icon: "roads" },
      { id: "alerts", label: "Alert Center", href: "/officer/alerts", icon: "alerts" },
      { id: "routes", label: "Safe Routes", href: "/officer/routes", icon: "routes" },
      { id: "villages", label: "Villages", href: "/officer/villages", icon: "villages" },
      { id: "reports", label: "Field Reports", href: "/officer/reports", icon: "reports" },
    ],
  },
  field_officer: {
    role: "field_officer",
    portalName: "Field Operations Portal",
    badgeLabel: "Field Response",
    homePath: "/field/tasks",
    navItems: [
      { id: "tasks", label: "My Tasks", href: "/field/tasks", icon: "tasks", exact: true },
      { id: "map", label: "Assigned Area Map", href: "/field/map", icon: "map" },
      { id: "reports", label: "Reports", href: "/field/reports", icon: "reports" },
      { id: "roads", label: "Road Status", href: "/field/roads", icon: "roads" },
      { id: "alerts", label: "Alerts", href: "/field/alerts", icon: "alerts" },
      { id: "profile", label: "Profile", href: "/field/profile", icon: "profile", exact: true },
    ],
  },
  citizen: {
    role: "citizen",
    portalName: "Citizen Community Portal",
    badgeLabel: "Resident Desk",
    homePath: "/citizen/home",
    navItems: [
      { id: "home", label: "Home", href: "/citizen/home", icon: "home", exact: true },
      { id: "my-area", label: "My Area", href: "/citizen/my-area", icon: "map" },
      { id: "safe-place", label: "Safe Place", href: "/citizen/safe-place", icon: "safe-place" },
      { id: "report", label: "Report", href: "/citizen/report", icon: "reports" },
      { id: "profile", label: "Profile", href: "/citizen/profile", icon: "profile", exact: true },
    ],
  },
  driver: {
    role: "driver",
    portalName: "Driver Highway Transit Portal",
    badgeLabel: "Highway Transit",
    homePath: "/driver/route-check",
    navItems: [
      { id: "route-check", label: "Route Check", href: "/driver/route-check", icon: "route-check", exact: true },
    ],
  },
  admin: {
    role: "admin",
    portalName: "System Admin Console",
    badgeLabel: "Administration",
    homePath: "/admin/users",
    navItems: [
      { id: "users", label: "User Management", href: "/admin/users", icon: "users", exact: true },
    ],
  },
};

export function getPortalConfig(role?: string): PortalRoleConfig {
  if (role && role in PORTAL_CONFIGS) {
    return PORTAL_CONFIGS[role as UserRole];
  }
  // Default fallback for safe rendering
  return PORTAL_CONFIGS.officer;
}

