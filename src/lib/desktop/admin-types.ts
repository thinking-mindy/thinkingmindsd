import type { LicenseStatus } from '@/lib/license-utils';

export type TauriAdminLoadPanel = {
  companyContext: {
    success: boolean;
    companyId: string;
    companyName?: string;
    email?: string;
    error?: string;
  };
  org: Record<string, unknown> | null;
  currentPlan: Record<string, unknown> | null;
  allPlans: Record<string, unknown>[];
  licenseStatus: LicenseStatus | null;
  joinRequests: Record<string, unknown>[];
  members: Record<string, unknown>[];
  payments: Record<string, unknown>[];
  isOwner: boolean;
};

export type TauriActionResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};
