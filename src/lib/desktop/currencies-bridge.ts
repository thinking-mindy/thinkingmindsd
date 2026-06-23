/**
 * Currencies API — Rust/Tauri when available, Next server actions otherwise.
 */
import { desktopBridge } from '@/lib/desktop/bridge-utils';
import { isTauriBackendAvailable } from '@/lib/desktop/runtime';
import {
  tauriCurrenciesCreateCurrency,
  tauriCurrenciesGetCurrencyByCode,
  tauriCurrenciesGetCurrency,
  tauriCurrenciesGetAllCurrencies,
  tauriCurrenciesGetUsdExchangeRates,
  tauriCurrenciesUpdateCurrency,
  tauriCurrenciesUpdateExchangeRates,
  tauriCurrenciesConvertCurrency,
  tauriCurrenciesDeleteCurrency,
} from '@/lib/desktop/currencies';

export { DEFAULT_RATE_MAP } from '@/_actions/currencies';

export async function createCurrency(data: Record<string, unknown>) {
  const { createCurrency: serverFn } = await import('@/_actions/currencies');
  return desktopBridge(() => tauriCurrenciesCreateCurrency(data), () => serverFn(data as never));
}

export async function getCurrencyByCode(code: string) {
  const { getCurrencyByCode: serverFn } = await import('@/_actions/currencies');
  return desktopBridge(() => tauriCurrenciesGetCurrencyByCode(code), () => serverFn(code));
}

export async function getCurrency(currencyId: string) {
  const { getCurrency: serverFn } = await import('@/_actions/currencies');
  return desktopBridge(() => tauriCurrenciesGetCurrency(currencyId), () => serverFn(currencyId));
}

export async function getAllCurrencies() {
  const { getAllCurrencies: serverFn } = await import('@/_actions/currencies');
  return desktopBridge(() => tauriCurrenciesGetAllCurrencies(), () => serverFn());
}

export async function getUsdExchangeRates() {
  const { getUsdExchangeRates: serverFn } = await import('@/_actions/currencies');
  return desktopBridge(() => tauriCurrenciesGetUsdExchangeRates(), () => serverFn());
}

export async function updateCurrency(currencyId: string, data: Record<string, unknown>) {
  const { updateCurrency: serverFn } = await import('@/_actions/currencies');
  return desktopBridge(() => tauriCurrenciesUpdateCurrency(currencyId, data), () => serverFn(currencyId, data as never));
}

export async function updateExchangeRates(rates: Record<string, unknown>, base?: string) {
  const { updateExchangeRates: serverFn } = await import('@/_actions/currencies');
  return desktopBridge(() => tauriCurrenciesUpdateExchangeRates(rates, base), () => serverFn(rates as never, base));
}

export async function convertCurrency(amount: number, fromCode: string, toCode: string) {
  const { convertCurrency: serverFn } = await import('@/_actions/currencies');
  return desktopBridge(() => tauriCurrenciesConvertCurrency(amount, fromCode, toCode), () => serverFn(amount, fromCode, toCode));
}

export async function deleteCurrency(currencyId: string) {
  if (isTauriBackendAvailable()) {
    const res = await tauriCurrenciesDeleteCurrency(currencyId);
    if (res.success && res.data) return { success: true as const };
    return { success: false as const, error: res.error ?? 'Failed to delete currency' };
  }
  const { deleteCurrency: serverFn } = await import('@/_actions/currencies');
  return serverFn(currencyId);
}
