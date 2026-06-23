"use client";

import { getOfflineLoginSecret } from '@/lib/offline/offline-login-secret';

const ENC_PREFIX = 'enc:';
const SALT =
  process.env.NEXT_PUBLIC_OFFLINE_SECRETS_SALT?.trim() || 'thinkingminds-offline-secrets-v1';

function passphrase(): string {
  return getOfflineLoginSecret();
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function deriveKey(): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase()),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: encoder.encode(SALT), iterations: 120000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

type LicenseDateField = 'trialStartedAt' | 'licenseExpiresAt';

function contextFor(field: LicenseDateField): string {
  return field === 'trialStartedAt' ? 'license-field:trialStartedAt' : 'license-field:licenseExpiresAt';
}

export function isEncryptedLicenseDate(value: unknown): boolean {
  return typeof value === 'string' && value.startsWith(ENC_PREFIX);
}

export async function encryptLicenseDateField(field: LicenseDateField, isoDate: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await deriveKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: encoder.encode(contextFor(field)) },
    key,
    encoder.encode(isoDate)
  );
  const packed = JSON.stringify({
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
    algo: 'AES-GCM-256',
  });
  return `${ENC_PREFIX}${btoa(packed)}`;
}

export async function decryptLicenseDateField(field: LicenseDateField, value: unknown): Promise<string | null> {
  if (typeof value !== 'string') return null;
  if (!value.startsWith(ENC_PREFIX)) {
    const legacy = new Date(value);
    return Number.isNaN(legacy.getTime()) ? null : legacy.toISOString();
  }
  try {
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    const key = await deriveKey();
    const { iv, ciphertext } = JSON.parse(atob(value.slice(ENC_PREFIX.length))) as {
      iv: string;
      ciphertext: string;
    };
    const plaintext = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: base64ToBytes(iv) as BufferSource,
        additionalData: encoder.encode(contextFor(field)),
      },
      key,
      base64ToBytes(ciphertext) as BufferSource
    );
    const iso = decoder.decode(plaintext);
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  } catch {
    return null;
  }
}
