/**
 * Module plan access — Rust/Tauri when available, server plan-access otherwise.
 */
import { isTauriBackendAvailable } from '@/lib/desktop/runtime';
import { tauriHasModuleAccess } from '@/lib/desktop/licensing';
import type { ModulePath } from '@/lib/plan-modules';

export type ModuleAccessResult = {
  hasAccess: boolean;
  planSlug?: string;
  planName?: string;
  licenseExpired?: boolean;
};

export async function hasModuleAccess(
  modulePath: ModulePath
): Promise<ModuleAccessResult> {
  if (isTauriBackendAvailable()) {
    return tauriHasModuleAccess(modulePath);
  }
  const { hasModuleAccess: serverHasModuleAccess } = await import('@/lib/plan-access');
  return serverHasModuleAccess(modulePath);
}

export async function getUserPlanBridge(): Promise<Record<string, unknown> | null> {
  if (isTauriBackendAvailable()) {
    const { getOrgBridge } = await import('@/lib/desktop/orgs-bridge');
    const { getPlanBridge } = await import('@/lib/desktop/plans-bridge');
    const { tauriAuthGetCurrentUser } = await import('@/lib/desktop/auth');
    const session = await tauriAuthGetCurrentUser();
    const companyId =
      session?.user?.companyId ||
      (session?.user?.metadata?.companyId as string | undefined);
    if (!companyId) return null;
    const orgRes = await getOrgBridge(companyId);
    if (!orgRes.success || !orgRes.data?.planId) return null;
    const planRes = await getPlanBridge(String(orgRes.data.planId));
    if (!planRes.success || !planRes.data) return null;
    return planRes.data;
  }
  const { getUserPlan } = await import('@/lib/plan-access');
  return getUserPlan() as Promise<Record<string, unknown> | null>;
}
