import https from 'node:https';
import {
  DEFAULT_DEVICE_MODEL_NAME,
  DEFAULT_DEVICE_MODEL_VERSION,
  FDMS_PROD_BASE,
  FDMS_TEST_BASE,
} from './constants';
import type { FiscalEnvironment } from './types';

export type FdmsCredentials = {
  certificatePem: string;
  privateKeyPem: string;
  deviceModelName?: string;
  deviceModelVersion?: string;
};

function fdmsBase(environment: FiscalEnvironment): string {
  return environment === 'production' ? FDMS_PROD_BASE : FDMS_TEST_BASE;
}

function deviceBase(environment: FiscalEnvironment, deviceId: number): string {
  return `${fdmsBase(environment)}/Device/v1/${deviceId}`;
}

function publicBase(environment: FiscalEnvironment, deviceId: number): string {
  return `${fdmsBase(environment)}/Public/v1/${deviceId}`;
}

async function fdmsRequest<T>(
  url: string,
  creds: FdmsCredentials,
  options: {
    method: 'GET' | 'POST';
    body?: unknown;
  }
): Promise<T> {
  const payload = options.body ? JSON.stringify(options.body) : undefined;
  const headers: Record<string, string> = {
    DeviceModelName: creds.deviceModelName ?? DEFAULT_DEVICE_MODEL_NAME,
    DeviceModelVersion: creds.deviceModelVersion ?? DEFAULT_DEVICE_MODEL_VERSION,
    Accept: 'application/json',
  };
  if (payload) {
    headers['Content-Type'] = 'application/json';
    headers['Content-Length'] = String(Buffer.byteLength(payload));
  }

  return new Promise<T>((resolve, reject) => {
    const req = https.request(
      url,
      {
        method: options.method,
        cert: creds.certificatePem,
        key: creds.privateKeyPem,
        headers,
        timeout: 30_000,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          let parsed: unknown = text;
          try {
            parsed = text ? JSON.parse(text) : {};
          } catch {
            /* keep raw text */
          }
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed as T);
            return;
          }
          reject(
            new Error(
              `FDMS ${res.statusCode}: ${typeof parsed === 'string' ? parsed : JSON.stringify(parsed)}`
            )
          );
        });
      }
    );
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('FDMS request timed out'));
    });
    if (payload) req.write(payload);
    req.end();
  });
}

export async function fdmsGetConfig(
  environment: FiscalEnvironment,
  deviceId: number,
  creds: FdmsCredentials
) {
  return fdmsRequest<Record<string, unknown>>(
    `${deviceBase(environment, deviceId)}/GetConfig`,
    creds,
    { method: 'GET' }
  );
}

export async function fdmsGetStatus(
  environment: FiscalEnvironment,
  deviceId: number,
  creds: FdmsCredentials
) {
  return fdmsRequest<Record<string, unknown>>(
    `${deviceBase(environment, deviceId)}/GetStatus`,
    creds,
    { method: 'GET' }
  );
}

export async function fdmsOpenDay(
  environment: FiscalEnvironment,
  deviceId: number,
  creds: FdmsCredentials,
  fiscalDayNo: number,
  fiscalDayOpened: string
) {
  return fdmsRequest<Record<string, unknown>>(
    `${deviceBase(environment, deviceId)}/OpenDay`,
    creds,
    {
      method: 'POST',
      body: { fiscalDayNo, fiscalDayOpened },
    }
  );
}

export async function fdmsSubmitReceipt(
  environment: FiscalEnvironment,
  deviceId: number,
  creds: FdmsCredentials,
  receipt: Record<string, unknown>
) {
  return fdmsRequest<Record<string, unknown>>(
    `${deviceBase(environment, deviceId)}/SubmitReceipt`,
    creds,
    {
      method: 'POST',
      body: { Receipt: receipt },
    }
  );
}

export async function fdmsPing(
  environment: FiscalEnvironment,
  deviceId: number,
  creds: FdmsCredentials
) {
  return fdmsRequest<Record<string, unknown>>(
    `${deviceBase(environment, deviceId)}/Ping`,
    creds,
    { method: 'POST', body: {} }
  );
}

export async function fdmsCloseDay(
  environment: FiscalEnvironment,
  deviceId: number,
  creds: FdmsCredentials,
  payload: Record<string, unknown>
) {
  return fdmsRequest<Record<string, unknown>>(
    `${deviceBase(environment, deviceId)}/CloseDay`,
    creds,
    { method: 'POST', body: payload }
  );
}

export async function fdmsVerifyTaxpayer(
  environment: FiscalEnvironment,
  deviceId: number,
  activationKey: string
) {
  const url = `${publicBase(environment, deviceId)}/VerifyTaxpayerInformation`;
  return new Promise<Record<string, unknown>>((resolve, reject) => {
    const body = JSON.stringify({ deviceID: deviceId, activationKey });
    const req = https.request(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': String(Buffer.byteLength(body)),
          Accept: 'application/json',
        },
        timeout: 30_000,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          try {
            const parsed = JSON.parse(text);
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              resolve(parsed);
            } else {
              reject(new Error(`FDMS ${res.statusCode}: ${text}`));
            }
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
