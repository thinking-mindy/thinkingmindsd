const ALERT_DAYS_BEFORE = 10;

export type LicenseStatus = {
  orgId: string;
  trialStartedAt: string | null;
  licenseExpiresAt: string | null;
  daysRemaining: number;
  isExpired: boolean;
  isInTrial: boolean;
  planSlug: string;
  tier: 'vendor' | 'shop_owner' | 'company';
  priceMonthly: number;
  currency: 'USD';
};

/**
 * Whether to show the "X days remaining" alert (1–10 days left, not expired).
 */
export function shouldShowRemainingDaysAlert(status: LicenseStatus | null): boolean {
  if (!status || status.isExpired) return false;
  return status.daysRemaining > 0 && status.daysRemaining <= ALERT_DAYS_BEFORE;
}

/** Active free-trial period — all modules unlocked until expiry. */
export function isTrialAccessActive(status: LicenseStatus | null): boolean {
  return !!status && status.isInTrial && !status.isExpired;
}

/** Routes still reachable after licence expiry (renewal / overview). */
export const EXPIRED_LICENSE_ALLOWED_PREFIXES = [
  '/admin',
  '/dashboard',
  '/settings',
  '/renew-licence',
] as const;

export function isPathAllowedWhenLicenseExpired(pathname: string): boolean {
  const base = pathname.split('?')[0] || '';
  return EXPIRED_LICENSE_ALLOWED_PREFIXES.some(
    (p) => base === p || base.startsWith(`${p}/`)
  );
}
