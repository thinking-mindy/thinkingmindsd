/**
 * App configuration.
 * Local dev works with defaults; production deployments must set secrets via env (see .env.example).
 */

import { resolveLicenseAnchorSecret } from '@/lib/desktop-secrets';

const DEFAULT_BASE_URL = 'http://localhost:3000';

/** In-app licence renewal wizard (local page → remote API). */
export const LICENSE_RENEWAL_PATH = '/renew-licence';

/** Public web renewal page (fallback link). */
export const LICENSE_RENEWAL_EXTERNAL_URL =
  process.env.NEXT_PUBLIC_LICENSE_RENEWAL_EXTERNAL_URL ||
  'https://www.thinkingminds.co.zw/renew-licence';

/** Nav / buttons — local page by default; override with env for external-only builds. */
export const LICENSE_RENEWAL_URL =
  process.env.NEXT_PUBLIC_LICENSE_RENEWAL_URL || LICENSE_RENEWAL_PATH;

export const APP_BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : DEFAULT_BASE_URL);

/** HMAC secret for tamper-resistant licence anchor files — required in production. */
export function getLicenseAnchorSecret(): string {
  return resolveLicenseAnchorSecret();
}

export const PAYNOW_CONFIG = {
  integrationId: process.env.PAYNOW_INTEGRATION_ID || '',
  integrationKey: process.env.PAYNOW_INTEGRATION_KEY || '',
  returnUrl: process.env.PAYNOW_RETURN_URL || `${APP_BASE_URL}/payment/return`,
  resultUrl: process.env.PAYNOW_RESULT_URL || `${APP_BASE_URL}/api/payments/paynow-webhook`,
  merchantEmail: process.env.PAYNOW_MERCHANT_EMAIL || '',
};

export function isPaynowConfigured(): boolean {
  return Boolean(PAYNOW_CONFIG.integrationId && PAYNOW_CONFIG.integrationKey);
}

/** Optional remote MongoDB for license sync — not used in local JSON mode. */
export function getRemoteMongoUri(): string | undefined {
  return process.env.MONGODB_URI_REMOTE || process.env.MONGODB_URI || undefined;
}
