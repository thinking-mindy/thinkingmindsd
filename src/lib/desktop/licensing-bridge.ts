/**
 * Licensing API — Rust/Tauri when available, Next server actions otherwise.
 */
import { isTauriBackendAvailable } from '@/lib/desktop/runtime';
import {
  tauriGetLicenseStatus,
  tauriGetLicenseStatusForCurrentUser,
  tauriRefreshLicenseFromRemote,
  tauriSyncLicenseFromServer,
} from '@/lib/desktop/licensing';
import type { LicenseStatus } from '@/lib/license-utils';
import type { TauriActionResult } from '@/lib/desktop/admin-types';

export async function getLicenseStatusBridge(
  orgId: string | null
): Promise<LicenseStatus | null> {
  if (!orgId) return null;
  if (isTauriBackendAvailable()) {
    return tauriGetLicenseStatus(orgId);
  }
  const { getLicenseStatus } = await import('@/_actions/licenses');
  return getLicenseStatus(orgId);
}

export async function getLicenseStatusForCurrentUserBridge(): Promise<LicenseStatus | null> {
  if (isTauriBackendAvailable()) {
    return tauriGetLicenseStatusForCurrentUser();
  }
  const { getLicenseStatusForCurrentUser } = await import('@/_actions/licenses');
  return getLicenseStatusForCurrentUser();
}

export async function syncLicenseFromServerBridge(): Promise<
  TauriActionResult<LicenseStatus>
> {
  if (isTauriBackendAvailable()) {
    return tauriSyncLicenseFromServer();
  }
  const { syncLicenseFromServer } = await import('@/_actions/licenses');
  return syncLicenseFromServer();
}

export async function refreshLicenseFromRemoteBridge(): Promise<
  TauriActionResult<LicenseStatus>
> {
  if (isTauriBackendAvailable()) {
    return tauriRefreshLicenseFromRemote();
  }
  const { refreshLicenseFromRemoteMongo } = await import('@/_actions/licenses');
  return refreshLicenseFromRemoteMongo();
}
