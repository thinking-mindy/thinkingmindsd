import { LICENSE_RENEWAL_URL } from "@/lib/app-config";

/** Plain routes for sidebar, desktop menubar, and shortcuts (no React icons). */

export type MindMenuItem = { title: string; path: string; group?: string };

export const MINDS_MENU_CORE: MindMenuItem[] = [
  { title: "Dashboard", path: "/dashboard", group: "Overview" },
  { title: "POS", path: `/pos`, group: "Sales & finance" },
  { title: "Cashier", path: `/cashier`, group: "Sales & finance" },
  { title: "Finance & Accounting", path: `/finance`, group: "Sales & finance" },
  { title: "Inventory", path: `/inventory`, group: "Supply chain" },
  { title: "Procurement", path: `/procurement`, group: "Supply chain" },
  { title: "HR & Payroll", path: `/hr`, group: "People" },
  { title: "School", path: `/school`, group: "People" },
];

export const MINDS_MENU_OPERATIONS: MindMenuItem[] = [
  { title: "Projects & Tasks", path: `/tasks`, group: "Projects & relationships" },
  { title: "CRM & Clients", path: `/crm`, group: "Projects & relationships" },
  { title: "IT & Systems", path: `/it`, group: "IT & support" },
  { title: "Helpdesk & Support", path: `/helpdesk`, group: "IT & support" },
];

export const MINDS_MENU_FINANCE_EXT: MindMenuItem[] = [
  { title: "Multi-Currency", path: `/currency`, group: "Finance tools" },
  { title: "Audit & Compliance", path: `/audit`, group: "Finance tools" },
];

export const MINDS_MENU_SYSTEM: MindMenuItem[] = [
  { title: "Administration Panel", path: `/admin`, group: "Administration" },
  { title: "Renew licence", path: LICENSE_RENEWAL_URL, group: "Billing & reports" },
  { title: "Reports & Analytics", path: `/reports`, group: "Billing & reports" },
];
