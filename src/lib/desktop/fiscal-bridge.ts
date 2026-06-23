/**
 * ZIMRA fiscalisation — Rust/Tauri when available, Next server actions otherwise.
 */
import { desktopBridge } from '@/lib/desktop/bridge-utils';
import {
  tauriFiscalCloseDay,
  tauriFiscalGetSettings,
  tauriFiscalisePosCreditNote,
  tauriFiscalisePosSale,
  tauriFiscalOpenDay,
  tauriFiscalPingDevice,
  tauriFiscalRefreshStatus,
  tauriFiscalRegisterDevice,
  tauriFiscalSyncConfig,
  tauriFiscalUpdateSettings,
  tauriFiscalVerifyTaxpayer,
} from '@/lib/desktop/fiscal';

export async function getZimraFiscalSettings() {
  const { getZimraFiscalSettings: serverFn } = await import('@/_actions/fiscal');
  return desktopBridge(() => tauriFiscalGetSettings(), () => serverFn());
}

export async function updateZimraFiscalSettings(
  input: Parameters<
    Awaited<typeof import('@/_actions/fiscal')>['updateZimraFiscalSettings']
  >[0]
) {
  const { updateZimraFiscalSettings: serverFn } = await import('@/_actions/fiscal');
  return desktopBridge(
    () => tauriFiscalUpdateSettings(input as Record<string, unknown>),
    () => serverFn(input)
  );
}

export async function syncZimraFiscalConfig() {
  const { syncZimraFiscalConfig: serverFn } = await import('@/_actions/fiscal');
  return desktopBridge(() => tauriFiscalSyncConfig(), () => serverFn());
}

export async function verifyZimraTaxpayer(
  deviceId: number,
  activationKey: string,
  environment: 'test' | 'production'
) {
  const { verifyZimraTaxpayer: serverFn } = await import('@/_actions/fiscal');
  return desktopBridge(
    () => tauriFiscalVerifyTaxpayer(deviceId, activationKey, environment),
    () => serverFn(deviceId, activationKey, environment)
  );
}

export async function pingZimraDevice() {
  const { pingZimraDevice: serverFn } = await import('@/_actions/fiscal');
  return desktopBridge(() => tauriFiscalPingDevice(), () => serverFn());
}

export async function refreshZimraFiscalStatus() {
  const { refreshZimraFiscalStatus: serverFn } = await import('@/_actions/fiscal');
  return desktopBridge(() => tauriFiscalRefreshStatus(), () => serverFn());
}

export async function openZimraFiscalDay() {
  const { openZimraFiscalDay: serverFn } = await import('@/_actions/fiscal');
  return desktopBridge(() => tauriFiscalOpenDay(), () => serverFn());
}

export async function closeZimraFiscalDay() {
  const { closeZimraFiscalDay: serverFn } = await import('@/_actions/fiscal');
  return desktopBridge(() => tauriFiscalCloseDay(), () => serverFn());
}

export async function registerZimraFiscalDevice(input: {
  environment: 'test' | 'production';
  deviceId: number;
  deviceSerialNo: string;
  activationKey: string;
  deviceModelName?: string;
  deviceModelVersion?: string;
}) {
  const { registerZimraFiscalDevice: serverFn } = await import('@/_actions/fiscal');
  return desktopBridge(() => tauriFiscalRegisterDevice(input), () => serverFn(input));
}

export async function fiscalisePosSale(input: {
  orderId?: string;
  invoiceNo: string;
  items: Array<{ name: string; price: number; quantity: number; taxPercent?: number }>;
  payments: Array<{ method: string; amount: number }>;
  taxEnabled?: boolean;
}) {
  const { fiscalisePosSale: serverFn } = await import('@/_actions/fiscal');
  return desktopBridge(() => tauriFiscalisePosSale(input), () => serverFn(input));
}

export async function fiscalisePosCreditNote(input: {
  orderId: string;
  receiptNotes?: string;
}) {
  const { fiscalisePosCreditNote: serverFn } = await import('@/_actions/fiscal');
  return desktopBridge(() => tauriFiscalisePosCreditNote(input), () => serverFn(input));
}
