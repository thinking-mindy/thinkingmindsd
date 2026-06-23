/** Auto-generated desktop stub for licenses.ts */
export type { LicenseStatus } from '@/lib/license-utils';

export async function getLicenseStatus(..._args: unknown[]) {
  return { success: false as const, error: 'Desktop app: getLicenseStatus is not available until this module is migrated to Rust.' };
}

export async function getLicenseStatusForCurrentUser(..._args: unknown[]) {
  return { success: false as const, error: 'Desktop app: getLicenseStatusForCurrentUser is not available until this module is migrated to Rust.' };
}

export async function extendLicense(..._args: unknown[]) {
  return { success: false as const, error: 'Desktop app: extendLicense is not available until this module is migrated to Rust.' };
}

export async function syncLicenseFromServer(..._args: unknown[]) {
  return { success: false as const, error: 'Desktop app: syncLicenseFromServer is not available until this module is migrated to Rust.' };
}

export async function refreshLicenseFromRemoteMongo(..._args: unknown[]) {
  return { success: false as const, error: 'Desktop app: refreshLicenseFromRemoteMongo is not available until this module is migrated to Rust.' };
}
