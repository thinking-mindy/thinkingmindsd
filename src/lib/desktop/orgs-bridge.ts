/**
 * Organisation API — Rust/Tauri when available, Next server actions otherwise.
 */
import { isTauriBackendAvailable } from '@/lib/desktop/runtime';
import {
  tauriCreateOrg,
  tauriGetOrg,
  tauriSearchOrgs,
  tauriSyncLocalOrgToDatabase,
  type SyncLocalOrgInput,
} from '@/lib/desktop/orgs';
import { tauriAdminUpdateOrg, tauriAdminUpdateOrgPlan } from '@/lib/desktop/admin';
import type { TauriActionResult } from '@/lib/desktop/admin-types';

export async function createOrgBridge(
  data: Record<string, unknown>
): Promise<TauriActionResult<Record<string, unknown>>> {
  if (isTauriBackendAvailable()) {
    return tauriCreateOrg(data);
  }
  const { createOrg } = await import('@/_actions/orgs');
  return createOrg(data as never) as Promise<TauriActionResult<Record<string, unknown>>>;
}

export async function getOrgBridge(
  orgId: string
): Promise<TauriActionResult<Record<string, unknown> | null>> {
  if (isTauriBackendAvailable()) {
    return tauriGetOrg(orgId);
  }
  const { getOrg } = await import('@/_actions/orgs');
  return getOrg(orgId) as Promise<TauriActionResult<Record<string, unknown> | null>>;
}

export async function searchOrgsBridge(
  query: string,
  limit = 10
): Promise<TauriActionResult<Record<string, unknown>[]>> {
  if (isTauriBackendAvailable()) {
    return tauriSearchOrgs(query, limit);
  }
  const { searchOrgs } = await import('@/_actions/orgs');
  return searchOrgs(query, limit) as Promise<TauriActionResult<Record<string, unknown>[]>>;
}

export async function syncLocalOrgToDatabaseBridge(
  input?: SyncLocalOrgInput
): Promise<TauriActionResult<Record<string, unknown> | null>> {
  if (isTauriBackendAvailable()) {
    return tauriSyncLocalOrgToDatabase(input);
  }
  const { syncLocalOrgToDatabase } = await import('@/_actions/orgs');
  return syncLocalOrgToDatabase(input) as Promise<
    TauriActionResult<Record<string, unknown> | null>
  >;
}

export async function updateOrgBridge(
  companyId: string,
  patch: Record<string, unknown>
): Promise<TauriActionResult<Record<string, unknown>>> {
  if (isTauriBackendAvailable()) {
    return tauriAdminUpdateOrg(companyId, patch);
  }
  const { updateOrg } = await import('@/_actions/orgs');
  return updateOrg(companyId, patch as never) as Promise<
    TauriActionResult<Record<string, unknown>>
  >;
}

export async function updateOrgPlanBridge(
  companyId: string,
  planId: string
): Promise<TauriActionResult<Record<string, unknown>>> {
  if (isTauriBackendAvailable()) {
    return tauriAdminUpdateOrgPlan(companyId, planId);
  }
  const { updateOrgPlan } = await import('@/_actions/orgs');
  return updateOrgPlan(companyId, planId) as Promise<
    TauriActionResult<Record<string, unknown>>
  >;
}
