import { NextResponse } from 'next/server';
import {
  assertAnyModuleAccess,
  assertModuleAccess,
  assertOwner,
  requireAuth,
} from '@/lib/module-access-server';

export {
  canAccessRequestPath,
  getUserFromCookies,
  userFromRequestCookie,
} from '@/lib/auth-cookie';

export async function getRequestUser() {
  try {
    return await requireAuth();
  } catch {
    return null;
  }
}

export function unauthorizedResponse(message = 'Not authenticated') {
  return NextResponse.json({ success: false, error: message }, { status: 401 });
}

export function forbiddenResponse(message = 'Not allowed') {
  return NextResponse.json({ success: false, error: message }, { status: 403 });
}

/** Auth check for Route Handlers — returns error response or null if allowed. */
export async function requireApiAuth(options?: {
  module?: string;
  anyModule?: string[];
  ownerOnly?: boolean;
}) {
  try {
    if (options?.ownerOnly) {
      await assertOwner();
      return null;
    }
    if (options?.anyModule?.length) {
      await assertAnyModuleAccess(options.anyModule);
      return null;
    }
    if (options?.module) {
      await assertModuleAccess(options.module);
      return null;
    }
    await requireAuth();
    return null;
  } catch (error) {
    const message = (error as Error).message || 'Not allowed';
    const status = message.includes('Not authenticated') ? 401 : 403;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

/** Map local JSON DB collections to required module access. */
export const LOCAL_DB_COLLECTION_MODULES: Record<string, string[]> = {
  cashier_transactions: ['cashier', 'finance'],
  invoices: ['finance'],
  payments: ['finance'],
  expenses: ['finance'],
  budgets: ['finance'],
  finance_settings: ['finance'],
  inventory_items: ['inventory'],
  stock_movements: ['inventory'],
  suppliers: ['inventory', 'procurement'],
  purchase_orders: ['procurement'],
  pos_orders: ['pos'],
  menu_items: ['pos'],
  menu_categories: ['pos'],
  school_students: ['school'],
  school_classes: ['school'],
  school_settings: ['school'],
  contacts: ['crm'],
  tickets: ['helpdesk'],
  payroll_records: ['payroll', 'hr'],
  projects: ['tasks'],
  tasks: ['tasks'],
  assets: ['it'],
  audit_logs: ['audit'],
  notifications: ['notifications'],
  currencies: ['currency'],
  usage_logs: ['logs', 'admin'],
  users: ['admin'],
  orgs: ['admin'],
  join_requests: ['admin'],
  plans: ['admin'],
};

export function modulesForLocalDbCollection(collection: string): string[] | null {
  if (LOCAL_DB_COLLECTION_MODULES[collection]) {
    return LOCAL_DB_COLLECTION_MODULES[collection];
  }
  const base = collection.split('.')[0]?.split('_')[0];
  if (base && LOCAL_DB_COLLECTION_MODULES[base]) {
    return LOCAL_DB_COLLECTION_MODULES[base];
  }
  return null;
}
