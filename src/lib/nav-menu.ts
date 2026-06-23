import type { ReactNode } from "react";
import { LICENSE_RENEWAL_URL } from "@/lib/app-config";

/** Sidebar navigation sections (icons attached on the client in SideMenu / AppNavbar). */

export type NavMenuItem = {
  title: string;
  path: string;
};

export type NavSection = {
  id: string;
  title: string;
  items: NavMenuItem[];
};

export type NavMenuItemWithIcon = NavMenuItem & { icon: ReactNode | null };

export type NavSectionWithIcons = {
  id: string;
  title: string;
  items: NavMenuItemWithIcon[];
};

export const NAV_SECTIONS: NavSection[] = [
  {
    id: "home",
    title: "Home",
    items: [{ title: "Dashboard", path: "/dashboard" }],
  },
  {
    id: "sales",
    title: "Sales & checkout",
    items: [
      { title: "Point of sale", path: "/pos" },
      { title: "Cashier", path: "/cashier" },
    ],
  },
  {
    id: "finance",
    title: "Finance",
    items: [
      { title: "Finance & accounting", path: "/finance" },
      { title: "Multi-currency", path: "/currency" },
      { title: "Audit & compliance", path: "/audit" },
    ],
  },
  {
    id: "supply",
    title: "Supply chain",
    items: [
      { title: "Inventory", path: "/inventory" },
      { title: "Procurement", path: "/procurement" },
    ],
  },
  {
    id: "people",
    title: "People",
    items: [
      { title: "HR & payroll", path: "/hr" },
      { title: "School", path: "/school" },
    ],
  },
  {
    id: "work",
    title: "Work & clients",
    items: [
      { title: "Projects & tasks", path: "/tasks" },
      { title: "CRM & clients", path: "/crm" },
    ],
  },
  {
    id: "support",
    title: "IT & support",
    items: [
      { title: "IT & systems", path: "/it" },
      { title: "Helpdesk", path: "/helpdesk" },
    ],
  },
  {
    id: "system",
    title: "Admin & insights",
    items: [
      { title: "Administration", path: "/admin" },
      { title: "Renew licence", path: LICENSE_RENEWAL_URL },
      { title: "Reports & analytics", path: "/reports" },
    ],
  },
];

export function filterNavSections(
  sections: NavSection[],
  allow: (path: string) => boolean
): NavSection[] {
  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => allow(item.path)),
    }))
    .filter((section) => section.items.length > 0);
}

export function isNavItemActive(itemPath: string, pathname: string, search: string): boolean {
  const [base, query] = itemPath.split("?");
  if (query) {
    const params = new URLSearchParams(query);
    const current = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
    if (pathname !== base && !pathname.startsWith(`${base}/`)) return false;
    let match = true;
    params.forEach((value, key) => {
      if (current.get(key) !== value) match = false;
    });
    return match;
  }
  if (base === "/" || base === "/dashboard") {
    return pathname === "/" || pathname === "/dashboard";
  }
  return pathname === base || pathname.startsWith(`${base}/`);
}
