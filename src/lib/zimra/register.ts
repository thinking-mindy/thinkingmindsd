import { generateKeyPairSync } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import https from 'node:https';
import {
  DEFAULT_DEVICE_MODEL_NAME,
  DEFAULT_DEVICE_MODEL_VERSION,
  FDMS_PROD_BASE,
  FDMS_TEST_BASE,
} from './constants';
import type { FiscalEnvironment } from './types';

export function generateDeviceKeyPair(): { privateKeyPem: string; publicKeyPem: string } {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
  });
  return { privateKeyPem: privateKey, publicKeyPem: publicKey };
}

export function buildCsrPem(
  privateKeyPem: string,
  deviceSerialNo: string,
  deviceId: number
): string {
  const formattedId = String(deviceId).padStart(10, '0');
  const commonName = `ZIMRA-${deviceSerialNo}-${formattedId}`;
  const dir = mkdtempSync(join(tmpdir(), 'zimra-csr-'));
  const keyPath = join(dir, 'device.key');
  const csrPath = join(dir, 'device.csr');
  try {
    writeFileSync(keyPath, privateKeyPem, { mode: 0o600 });
    execFileSync(
      'openssl',
      ['req', '-new', '-key', keyPath, '-subj', `/CN=${commonName}`, '-out', csrPath],
      { stdio: 'pipe' }
    );
    return readFileSync(csrPath, 'utf8');
  } finally {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
}

export async function fdmsRegisterDevice(input: {
  environment: FiscalEnvironment;
  deviceId: number;
  activationKey: string;
  certificateRequest: string;
  deviceModelName?: string;
  deviceModelVersion?: string;
}): Promise<{ certificate: string; operationID?: string }> {
  const base = input.environment === 'production' ? FDMS_PROD_BASE : FDMS_TEST_BASE;
  const url = `${base}/Public/v1/${input.deviceId}/RegisterDevice`;
  const body = JSON.stringify({
    activationKey: input.activationKey,
    certificateRequest: input.certificateRequest,
  });

  return new Promise((resolve, reject) => {
    const req = https.request(
      url,
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'Content-Length': String(Buffer.byteLength(body)),
          DeviceModelName: input.deviceModelName ?? DEFAULT_DEVICE_MODEL_NAME,
          DeviceModelVersion: input.deviceModelVersion ?? DEFAULT_DEVICE_MODEL_VERSION,
        },
        timeout: 30_000,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          try {
            const parsed = JSON.parse(text) as { certificate?: string; operationID?: string };
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300 && parsed.certificate) {
              resolve({ certificate: parsed.certificate, operationID: parsed.operationID });
              return;
            }
            reject(new Error(`FDMS ${res.statusCode}: ${text}`));
          } catch {
            reject(new Error(`FDMS ${res.statusCode}: ${text}`));
          }
        });
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

export async function registerZimraDevice(input: {
  environment: FiscalEnvironment;
  deviceId: number;
  deviceSerialNo: string;
  activationKey: string;
  deviceModelName?: string;
  deviceModelVersion?: string;
}) {
  const { privateKeyPem } = generateDeviceKeyPair();
  const csrPem = buildCsrPem(privateKeyPem, input.deviceSerialNo, input.deviceId);
  const result = await fdmsRegisterDevice({
    environment: input.environment,
    deviceId: input.deviceId,
    activationKey: input.activationKey,
    certificateRequest: csrPem,
    deviceModelName: input.deviceModelName,
    deviceModelVersion: input.deviceModelVersion,
  });
  return {
    privateKeyPem,
    certificatePem: result.certificate,
    csrPem,
    operationID: result.operationID,
  };
}
