import { invoke } from '@tauri-apps/api/core';
import type { TauriActionResult } from '@/lib/desktop/admin-types';
import { isTauriBackendAvailable } from '@/lib/desktop/runtime';

function requireTauri(): void {
  if (!isTauriBackendAvailable()) {
    throw new Error('Tauri fiscal API requires the desktop shell');
  }
}

export type TauriFiscalFlexibleResult = {
  success: boolean;
  data?: unknown;
  error?: string;
  skipped?: boolean;
  warning?: string;
};

export async function tauriFiscalGetSettings() {
  requireTauri();
  return invoke<TauriActionResult<{ settings: unknown; state: unknown }>>('fiscal_get_settings_cmd');
}

export async function tauriFiscalUpdateSettings(patch: Record<string, unknown>) {
  requireTauri();
  return invoke<TauriActionResult<void>>('fiscal_update_settings_cmd', { patch });
}

export async function tauriFiscalSyncConfig() {
  requireTauri();
  return invoke<TauriActionResult<unknown>>('fiscal_sync_config_cmd');
}

export async function tauriFiscalVerifyTaxpayer(
  deviceId: number,
  activationKey: string,
  environment: 'test' | 'production'
) {
  requireTauri();
  return invoke<TauriActionResult<unknown>>('fiscal_verify_taxpayer_cmd', {
    deviceId,
    activationKey,
    environment,
  });
}

export async function tauriFiscalPingDevice() {
  requireTauri();
  return invoke<TauriActionResult<unknown>>('fiscal_ping_device_cmd');
}

export async function tauriFiscalRefreshStatus() {
  requireTauri();
  return invoke<TauriActionResult<unknown>>('fiscal_refresh_status_cmd');
}

export async function tauriFiscalOpenDay() {
  requireTauri();
  return invoke<TauriActionResult<unknown>>('fiscal_open_day_cmd');
}

export async function tauriFiscalCloseDay() {
  requireTauri();
  return invoke<TauriActionResult<unknown>>('fiscal_close_day_cmd');
}

export async function tauriFiscalRegisterDevice(input: {
  environment: 'test' | 'production';
  deviceId: number;
  deviceSerialNo: string;
  activationKey: string;
  deviceModelName?: string;
  deviceModelVersion?: string;
}) {
  requireTauri();
  return invoke<TauriActionResult<unknown>>('fiscal_register_device_cmd', {
    environment: input.environment,
    deviceId: input.deviceId,
    deviceSerialNo: input.deviceSerialNo,
    activationKey: input.activationKey,
    deviceModelName: input.deviceModelName ?? null,
    deviceModelVersion: input.deviceModelVersion ?? null,
  });
}

export async function tauriFiscalisePosSale(input: {
  orderId?: string;
  invoiceNo: string;
  items: Array<{ name: string; price: number; quantity: number; taxPercent?: number }>;
  payments: Array<{ method: string; amount: number }>;
  taxEnabled?: boolean;
}) {
  requireTauri();
  return invoke<TauriFiscalFlexibleResult>('fiscal_fiscalise_sale_cmd', {
    orderId: input.orderId ?? null,
    invoiceNo: input.invoiceNo,
    items: input.items,
    payments: input.payments,
    taxEnabled: input.taxEnabled ?? null,
  });
}

export async function tauriFiscalisePosCreditNote(input: {
  orderId: string;
  receiptNotes?: string;
}) {
  requireTauri();
  return invoke<TauriFiscalFlexibleResult>('fiscal_fiscalise_credit_note_cmd', {
    orderId: input.orderId,
    receiptNotes: input.receiptNotes ?? null,
  });
}
