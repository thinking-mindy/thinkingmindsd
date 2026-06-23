import { invoke } from '@tauri-apps/api/core';
import type { TauriActionResult } from '@/lib/desktop/admin-types';
import { isTauriBackendAvailable } from '@/lib/desktop/runtime';

function requireTauri(): void {
  if (!isTauriBackendAvailable()) {
    throw new Error('Tauri orgs API requires the desktop shell');
  }
}

export type SyncLocalOrgInput = {
  companyId?: string;
  companyName?: string;
  email?: string;
  trialStartedAt?: string;
  licenseExpiresAt?: string;
};

export async function tauriGetOrg(
  orgId: string
): Promise<TauriActionResult<Record<string, unknown> | null>> {
  requireTauri();
  return invoke('org_get_cmd', { orgId });
}

export async function tauriCreateOrg(
  data: Record<string, unknown>
): Promise<TauriActionResult<Record<string, unknown>>> {
  requireTauri();
  return invoke('org_create_cmd', { data });
}

export async function tauriSearchOrgs(
  query: string,
  limit = 10
): Promise<TauriActionResult<Record<string, unknown>[]>> {
  requireTauri();
  return invoke('org_search_cmd', { query, limit });
}

export async function tauriSyncLocalOrgToDatabase(
  input?: SyncLocalOrgInput
): Promise<TauriActionResult<Record<string, unknown> | null>> {
  requireTauri();
  return invoke('org_sync_local_cmd', { input: input ?? null });
}
