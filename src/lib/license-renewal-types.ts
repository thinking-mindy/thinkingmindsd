/** Remote licence renewal API — https://www.thinkingminds.co.zw/api/license-renewal/* */

export const LICENSE_RENEWAL_API_BASE =
  process.env.NEXT_PUBLIC_LICENSE_RENEWAL_API_BASE?.trim() ||
  'https://www.thinkingminds.co.zw';

export type LicenseRenewalOption = {
  id: string;
  label: string;
  priceMonthly: number;
  summary: string;
  idealFor: string;
  planSlug: string;
  billingTier: string;
  accent: string;
};

export type LicenseRenewalPeekMatch = {
  orgId: string;
  orgName: string;
};

export type LicenseRenewalOrgPreview = {
  orgId: string;
  orgName: string;
  licenseExpiresAt?: string;
  planSlug?: string;
  billingStatus?: string;
  billingTier?: string;
  licenseType: string;
  licenseTypeLabel: string;
  amount: number;
  months: number;
  planLabel?: string;
  created?: boolean;
};

export type LicenseRenewalPeekResult =
  | {
      success: true;
      exists: true;
      orgId: string;
      orgName: string;
      licenseExpiresAt?: string;
      planSlug?: string;
      billingStatus?: string;
      billingTier?: string;
      licenseType?: string;
      licenseTypeLabel?: string;
      amount?: number;
      months?: number;
      planLabel?: string;
    }
  | {
      success: true;
      exists: false;
      lookupBy?: 'name' | 'id';
      query?: string;
    }
  | {
      success: false;
      message?: string;
      ambiguous?: boolean;
      matches?: LicenseRenewalPeekMatch[];
    };

export type LicenseRenewalPayResult = {
  success: boolean;
  renewalId?: string;
  reference?: string;
  instructions?: string;
  message?: string;
};

export type LicenseRenewalStatusResult = {
  success: boolean;
  paid?: boolean;
  status?: 'pending' | 'paid' | 'failed' | 'cancelled' | string;
  message?: string;
  licenseExpiresAt?: string;
};
