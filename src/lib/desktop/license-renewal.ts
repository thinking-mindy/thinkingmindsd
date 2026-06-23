import { invoke } from '@tauri-apps/api/core';
import { isTauriBackendAvailable } from '@/lib/desktop/runtime';

function requireTauri(): void {
  if (!isTauriBackendAvailable()) {
    throw new Error('Tauri licence renewal API requires the desktop shell');
  }
}

export async function tauriLicenseRenewalGetOptions() {
  requireTauri();
  return invoke<{ success?: boolean; options?: unknown[] }>(
    'license_renewal_get_options_cmd'
  );
}

export async function tauriLicenseRenewalPeek(query: string) {
  requireTauri();
  return invoke<Record<string, unknown>>('license_renewal_peek_cmd', { query });
}

export async function tauriLicenseRenewalRegister(input: {
  orgId: string;
  licenseType: string;
  orgName: string;
}) {
  requireTauri();
  return invoke<Record<string, unknown>>('license_renewal_register_cmd', {
    orgId: input.orgId,
    licenseType: input.licenseType,
    orgName: input.orgName,
  });
}

export async function tauriLicenseRenewalPay(input: {
  orgId: string;
  licenseType: string;
  phoneNumber: string;
  contactName?: string;
}) {
  requireTauri();
  return invoke<Record<string, unknown>>('license_renewal_pay_cmd', {
    orgId: input.orgId,
    licenseType: input.licenseType,
    phoneNumber: input.phoneNumber,
    contactName: input.contactName,
  });
}

export async function tauriLicenseRenewalPollStatus(renewalId: string) {
  requireTauri();
  return invoke<Record<string, unknown>>('license_renewal_poll_status_cmd', {
    renewalId,
  });
}
