import { invoke } from '@tauri-apps/api/core';
import type { LicenseStatus } from '@/lib/license-utils';
import type { TauriActionResult } from '@/lib/desktop/admin-types';
import { isTauriBackendAvailable } from '@/lib/desktop/runtime';

function requireTauri(): void {
  if (!isTauriBackendAvailable()) {
    throw new Error('Tauri licensing API requires the desktop shell');
  }
}

export type TauriModuleAccessResult = {
  hasAccess: boolean;
  planSlug?: string;
  planName?: string;
  licenseExpired?: boolean;
};

export async function tauriGetLicenseStatus(
  orgId: string
): Promise<LicenseStatus | null> {
  requireTauri();
  return invoke<LicenseStatus | null>('license_get_status_cmd', { orgId });
}

export async function tauriGetLicenseStatusForCurrentUser(): Promise<LicenseStatus | null> {
  requireTauri();
  return invoke<LicenseStatus | null>('license_get_status_for_current_user_cmd');
}

export async function tauriSyncLicenseFromServer(): Promise<
  TauriActionResult<LicenseStatus>
> {
  requireTauri();
  return invoke('license_sync_from_server_cmd');
}

export async function tauriRefreshLicenseFromRemote(): Promise<
  TauriActionResult<LicenseStatus>
> {
  requireTauri();
  return invoke('license_refresh_from_remote_cmd');
}

export async function tauriHasModuleAccess(
  modulePath: string
): Promise<TauriModuleAccessResult> {
  requireTauri();
  return invoke('license_has_module_access_cmd', { modulePath });
}
