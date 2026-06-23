/** Zimbabwe standard VAT (2026). */
export const ZIMRA_STANDARD_VAT_PERCENT = 15.5;

export const FDMS_TEST_BASE = 'https://fdmsapitest.zimra.co.zw';
export const FDMS_PROD_BASE = 'https://fdmsapi.zimra.co.zw';
export const FDMS_TEST_QR = 'https://fdmstest.zimra.co.zw/';
export const FDMS_PROD_QR = 'https://invoice.zimra.co.zw/';

export const DEFAULT_DEVICE_MODEL_NAME = 'ThinkingMindsPOS';
export const DEFAULT_DEVICE_MODEL_VERSION = 'v1';

/** Default tax ID mapping (test environment). Synced from getConfig when available. */
export const DEFAULT_APPLICABLE_TAXES: Record<string | number, number> = {
  0: 2,
  exempt: 3,
  5: 514,
  15: 3,
  15.5: 515,
};

export const MONEY_TYPE = {
  CASH: 0,
  CARD: 1,
  MOBILE: 2,
} as const;
