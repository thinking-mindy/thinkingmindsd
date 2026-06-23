/**
 * HTTP licence sync against thinkingminds.co.zw (server-only).
 */

export type LicenseSyncRequest = {
  companyId: string;
  orgId: string;
  /** Sent to the licence server; used when the org record does not exist yet. */
  companyName?: string;
};

export type LicenseSyncResponse = {
  success?: boolean;
  companyId?: string;
  orgId?: string;
  companyName?: string;
  trialStartedAt?: string;
  licenseExpiresAt?: string;
  registeredAt?: string;
  expiresAt?: string;
  expiryDate?: string;
  planSlug?: string;
  planId?: string;
  billingTier?: string;
  billingStatus?: string;
  error?: string;
  message?: string;
};

export function buildLicenseSyncRequest(
  companyId: string,
  companyName?: string | null
): LicenseSyncRequest {
  const request: LicenseSyncRequest = { companyId, orgId: companyId };
  const name = typeof companyName === 'string' ? companyName.trim() : '';
  if (name) request.companyName = name;
  return request;
}

export function getLicenseSyncUrl(): string {
  return (
    process.env.LICENSE_SYNC_URL?.trim() ||
    process.env.NEXT_PUBLIC_LICENSE_SYNC_URL?.trim() ||
    'https://www.thinkingminds.co.zw/renew-licence'
  );
}

function parseIsoDate(value: unknown): Date | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export function parseLicenseSyncResponse(body: unknown): {
  ok: boolean;
  error?: string;
  trialStartedAt?: Date;
  licenseExpiresAt?: Date;
  registeredAt?: Date;
  planSlug?: string;
  planId?: string;
  billingTier?: string;
  billingStatus?: string;
  companyName?: string;
} {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Invalid response from licence server' };
  }

  const r = body as LicenseSyncResponse;
  if (r.success === false) {
    return { ok: false, error: r.error || r.message || 'Licence sync was rejected' };
  }

  const licenseExpiresAt = parseIsoDate(
    r.licenseExpiresAt ?? r.expiresAt ?? r.expiryDate
  );
  if (!licenseExpiresAt) {
    return { ok: false, error: 'Licence server did not return an expiry date (licenseExpiresAt)' };
  }

  const trialStartedAt = parseIsoDate(r.trialStartedAt);
  const registeredAt = parseIsoDate(r.registeredAt ?? r.trialStartedAt);

  return {
    ok: true,
    trialStartedAt,
    licenseExpiresAt,
    registeredAt,
    planSlug: typeof r.planSlug === 'string' ? r.planSlug : undefined,
    planId: typeof r.planId === 'string' ? r.planId : undefined,
    billingTier: typeof r.billingTier === 'string' ? r.billingTier : undefined,
    billingStatus: typeof r.billingStatus === 'string' ? r.billingStatus : undefined,
    companyName: typeof r.companyName === 'string' ? r.companyName.trim() || undefined : undefined,
  };
}
