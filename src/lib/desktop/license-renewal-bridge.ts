import { desktopBridge } from '@/lib/desktop/bridge-utils';
import {
  tauriLicenseRenewalGetOptions,
  tauriLicenseRenewalPay,
  tauriLicenseRenewalPeek,
  tauriLicenseRenewalPollStatus,
  tauriLicenseRenewalRegister,
} from '@/lib/desktop/license-renewal';
import type {
  LicenseRenewalOption,
  LicenseRenewalPayResult,
  LicenseRenewalPeekResult,
  LicenseRenewalStatusResult,
} from '@/lib/license-renewal-types';

export async function getLicenseRenewalOptionsBridge() {
  return desktopBridge(async () => {
    const raw = await tauriLicenseRenewalGetOptions();
    const options = Array.isArray(raw.options) ? (raw.options as LicenseRenewalOption[]) : [];
    return { success: true as const, data: options };
  }, async () => {
    const { getLicenseRenewalOptionsAction } = await import('@/_actions/license-renewal');
    return getLicenseRenewalOptionsAction();
  });
}

export async function peekLicenseRenewalOrgBridge(query: string) {
  return desktopBridge(async () => {
    const data = (await tauriLicenseRenewalPeek(query)) as LicenseRenewalPeekResult;
    return { success: true as const, data };
  }, async () => {
    const { peekLicenseRenewalOrgAction } = await import('@/_actions/license-renewal');
    return peekLicenseRenewalOrgAction(query);
  });
}

export async function registerLicenseRenewalOrgBridge(input: {
  orgId: string;
  licenseType: string;
  orgName: string;
}) {
  return desktopBridge(async () => {
    const data = await tauriLicenseRenewalRegister(input);
    return { success: true as const, data };
  }, async () => {
    const { registerLicenseRenewalOrgAction } = await import('@/_actions/license-renewal');
    return registerLicenseRenewalOrgAction(input);
  });
}

export async function initiateLicenseRenewalPaymentBridge(input: {
  orgId: string;
  licenseType: string;
  phoneNumber: string;
  contactName?: string;
}) {
  return desktopBridge(async () => {
    const data = (await tauriLicenseRenewalPay(input)) as LicenseRenewalPayResult;
    return { success: true as const, data };
  }, async () => {
    const { initiateLicenseRenewalPaymentAction } = await import('@/_actions/license-renewal');
    return initiateLicenseRenewalPaymentAction(input);
  });
}

export async function pollLicenseRenewalStatusBridge(renewalId: string) {
  return desktopBridge(async () => {
    const data = (await tauriLicenseRenewalPollStatus(renewalId)) as LicenseRenewalStatusResult;
    return { success: true as const, data };
  }, async () => {
    const { pollLicenseRenewalStatusAction } = await import('@/_actions/license-renewal');
    return pollLicenseRenewalStatusAction(renewalId);
  });
}
