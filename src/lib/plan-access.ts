import type { ModulePath } from './plan-modules';

export type ModuleAccessResult = {
  hasAccess: boolean;
  planSlug?: string;
  planName?: string;
  licenseExpired?: boolean;
};

export async function hasModuleAccess(_modulePath: ModulePath): Promise<ModuleAccessResult> {
  return { hasAccess: true, planSlug: 'free', planName: 'Free Trial' };
}

export async function getUserPlan() {
  return null;
}
