/**
 * HTTP client for thinkingminds.co.zw licence renewal API.
 * Called from server actions and Tauri — not directly from the browser (CORS).
 */
import {
  LICENSE_RENEWAL_API_BASE,
  type LicenseRenewalOption,
  type LicenseRenewalPayResult,
  type LicenseRenewalPeekResult,
  type LicenseRenewalStatusResult,
} from '@/lib/license-renewal-types';

async function renewalFetch<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const url = `${LICENSE_RENEWAL_API_BASE.replace(/\/$/, '')}${path}`;
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
    cache: 'no-store',
  });

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new Error(
      response.ok
        ? 'Licence server returned a non-JSON response'
        : `Licence server error (${response.status})`
    );
  }

  if (!response.ok) {
    const message =
      body &&
      typeof body === 'object' &&
      ('message' in body || 'error' in body) &&
      typeof (body as { message?: string; error?: string }).message === 'string'
        ? (body as { message: string }).message
        : body &&
            typeof body === 'object' &&
            typeof (body as { error?: string }).error === 'string'
          ? (body as { error: string }).error
          : `Licence server returned ${response.status}`;
    throw new Error(message);
  }

  return body as T;
}

export async function fetchLicenseRenewalOptions(): Promise<LicenseRenewalOption[]> {
  const data = await renewalFetch<{ success?: boolean; options?: LicenseRenewalOption[] }>(
    '/api/license-renewal/options'
  );
  return Array.isArray(data.options) ? data.options : [];
}

export async function peekLicenseRenewalOrg(query: string): Promise<LicenseRenewalPeekResult> {
  return renewalFetch<LicenseRenewalPeekResult>('/api/license-renewal/peek', {
    method: 'POST',
    body: JSON.stringify({ query: query.trim() }),
  });
}

export async function registerLicenseRenewalOrg(input: {
  orgId: string;
  licenseType: string;
  orgName: string;
}): Promise<{ success: boolean; message?: string; orgId?: string }> {
  return renewalFetch('/api/license-renewal/register', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function initiateLicenseRenewalPayment(input: {
  orgId: string;
  licenseType: string;
  phoneNumber: string;
  contactName?: string;
}): Promise<LicenseRenewalPayResult> {
  return renewalFetch<LicenseRenewalPayResult>('/api/license-renewal/pay', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function pollLicenseRenewalStatus(
  renewalId: string
): Promise<LicenseRenewalStatusResult> {
  const id = encodeURIComponent(renewalId.trim());
  return renewalFetch<LicenseRenewalStatusResult>(
    `/api/license-renewal/status?renewalId=${id}`
  );
}
