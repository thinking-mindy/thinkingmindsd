/**
 * Field-level encryption for organisation licence dates (trial start / expiry).
 * Stored in org documents as opaque strings; legacy ISO plaintext is migrated on read.
 */
import {
  decryptCollectionPayload,
  encryptCollectionPayload,
  isEncryptedEnvelope,
} from '@/lib/local-db-crypto';

const ENC_PREFIX = 'enc:';
const CTX_TRIAL = 'license-field:trialStartedAt';
const CTX_EXPIRES = 'license-field:licenseExpiresAt';

export type LicenseDateField = 'trialStartedAt' | 'licenseExpiresAt';

function contextFor(field: LicenseDateField): string {
  return field === 'trialStartedAt' ? CTX_TRIAL : CTX_EXPIRES;
}

export function isEncryptedLicenseDate(value: unknown): boolean {
  return typeof value === 'string' && value.startsWith(ENC_PREFIX);
}

export function encryptLicenseDateField(field: LicenseDateField, date: Date): string {
  const envelope = encryptCollectionPayload(date.toISOString(), contextFor(field));
  const packed = Buffer.from(JSON.stringify(envelope), 'utf8').toString('base64url');
  return `${ENC_PREFIX}${packed}`;
}

export function decryptLicenseDateField(field: LicenseDateField, value: unknown): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (value == null) return null;

  if (typeof value === 'string') {
    if (value.startsWith(ENC_PREFIX)) {
      try {
        const json = Buffer.from(value.slice(ENC_PREFIX.length), 'base64url').toString('utf8');
        const envelope = JSON.parse(json) as unknown;
        if (!isEncryptedEnvelope(envelope)) return null;
        const iso = decryptCollectionPayload(envelope, contextFor(field));
        const d = new Date(iso);
        return Number.isNaN(d.getTime()) ? null : d;
      } catch {
        return null;
      }
    }
    const legacy = new Date(value);
    return Number.isNaN(legacy.getTime()) ? null : legacy;
  }

  return null;
}

export function readOrgLicenseDates(org: Record<string, unknown>): {
  trialStartedAt: Date | null;
  licenseExpiresAt: Date | null;
} {
  return {
    trialStartedAt: decryptLicenseDateField('trialStartedAt', org.trialStartedAt),
    licenseExpiresAt: decryptLicenseDateField('licenseExpiresAt', org.licenseExpiresAt),
  };
}

export function licenseDatesForStorage(trialStartedAt: Date, licenseExpiresAt: Date): {
  trialStartedAt: string;
  licenseExpiresAt: string;
} {
  return {
    trialStartedAt: encryptLicenseDateField('trialStartedAt', trialStartedAt),
    licenseExpiresAt: encryptLicenseDateField('licenseExpiresAt', licenseExpiresAt),
  };
}

export function orgLicenseDatesNeedEncryption(org: Record<string, unknown>): boolean {
  const hasTrial = org.trialStartedAt != null;
  const hasExpiry = org.licenseExpiresAt != null;
  if (!hasTrial && !hasExpiry) return false;
  return (
    (hasTrial && !isEncryptedLicenseDate(org.trialStartedAt)) ||
    (hasExpiry && !isEncryptedLicenseDate(org.licenseExpiresAt))
  );
}
