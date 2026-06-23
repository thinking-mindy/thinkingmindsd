/**
 * Module keys map to routes. Owners assign `allowedModules` per user in Admin.
 * Non-owners only see and can open modules in their assigned list (+ dashboard).
 */

export const PATH_TO_MODULE: Record<string, string> = {
  dashboard: 'dashboard',
  pos: 'pos',
  cashier: 'cashier',
  finance: 'finance',
  inventory: 'inventory',
  procurement: 'procurement',
  hr: 'hr',
  school: 'school',
  tasks: 'tasks',
  crm: 'crm',
  it: 'it',
  helpdesk: 'helpdesk',
  currency: 'currency',
  audit: 'audit',
  admin: 'admin',
  reports: 'reports',
  logs: 'logs',
  notifications: 'notifications',
  payroll: 'payroll',
  settings: 'settings',
  profile: 'profile',
};

/** Routes any signed-in user may open regardless of module assignment */
export const ALWAYS_ALLOWED_SEGMENTS = new Set(['settings', 'profile', 'docs']);

export const MODULE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  pos: 'POS',
  cashier: 'Cashier',
  finance: 'Finance & Accounting',
  inventory: 'Inventory',
  procurement: 'Procurement',
  hr: 'HR & Payroll',
  school: 'School',
  tasks: 'Projects & Tasks',
  crm: 'CRM & Clients',
  it: 'IT & Systems',
  helpdesk: 'Helpdesk & Support',
  currency: 'Multi-Currency',
  audit: 'Audit & Compliance',
  admin: 'Administration',
  reports: 'Reports & Analytics',
  logs: 'Logs',
  notifications: 'Notifications',
  payroll: 'Payroll',
};

export const ALL_ASSIGNABLE_MODULES = Object.keys(MODULE_LABELS).filter((k) => k !== 'admin');

export type ModuleAccessIdentity = {
  role?: string;
  userId?: string;
  /** Org `ownerId` or `publicMetadata.companyOwnerId` — the user who created the company */
  orgOwnerId?: string;
};

/** Company creator / org owner — full access to every module and admin. */
export function isCompanyOwner(
  role?: string,
  userId?: string,
  orgOwnerId?: string
): boolean {
  if (role === 'owner') return true;
  if (userId && orgOwnerId && userId === orgOwnerId) return true;
  return false;
}

/** Get module key from path (e.g. /pos -> pos, /finance/reports -> finance) */
export function pathToModule(pathname: string): string | null {
  const clean = pathname.split('?')[0] || '/';
  if (clean === '/' || clean === '/dashboard') return 'dashboard';
  const base = clean.replace(/^\//, '').split('/')[0] || '';
  return PATH_TO_MODULE[base] ?? (base ? base : null);
}

/**
 * Effective module list for menu + route guards.
 * `null` = unrestricted (org owner).
 */
export function getEffectiveAllowedModules(
  role: string | undefined,
  allowedModules: string[] | undefined | null,
  userId?: string,
  orgOwnerId?: string
): string[] | null {
  if (isCompanyOwner(role, userId, orgOwnerId)) return null;
  if (allowedModules && Array.isArray(allowedModules) && allowedModules.length > 0) {
    const set = new Set(allowedModules);
    set.add('dashboard');
    return Array.from(set);
  }
  return ['dashboard'];
}

/** True when the user has at least one module assigned (owners always true). */
export function hasAssignedModules(
  role: string | undefined,
  allowedModules: string[] | undefined | null,
  userId?: string,
  orgOwnerId?: string
): boolean {
  if (isCompanyOwner(role, userId, orgOwnerId)) return true;
  return Boolean(allowedModules && allowedModules.length > 0);
}

/** Whether user may open this path based on role + assigned modules */
export function canAccessPath(
  role: string | undefined,
  allowedModules: string[] | undefined | null,
  pathname: string,
  userId?: string,
  orgOwnerId?: string
): boolean {
  const effective = getEffectiveAllowedModules(role, allowedModules, userId, orgOwnerId);
  if (effective === null) return true;

  const clean = (pathname.split('?')[0] || '/').replace(/\/$/, '') || '/';
  const segment = clean.replace(/^\//, '').split('/')[0] || '';

  if (ALWAYS_ALLOWED_SEGMENTS.has(segment)) return true;
  if (clean === '/' || clean === '/dashboard') return effective.includes('dashboard');

  const mod = pathToModule(clean);
  if (!mod) return false;
  if (mod === 'admin') return isCompanyOwner(role, userId, orgOwnerId);
  return effective.includes(mod);
}

export function moduleLabel(moduleKey: string): string {
  return MODULE_LABELS[moduleKey] ?? moduleKey;
}
