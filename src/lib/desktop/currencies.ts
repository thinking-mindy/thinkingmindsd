import { invoke } from '@tauri-apps/api/core';
import type { TauriActionResult } from '@/lib/desktop/admin-types';
import { isTauriBackendAvailable } from '@/lib/desktop/runtime';

function requireTauri(): void {
  if (!isTauriBackendAvailable()) {
    throw new Error('Tauri currencies API requires the desktop shell');
  }
}

export async function tauriCurrenciesCreateCurrency(data: Record<string, unknown>) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>>>('currencies_create_currency_cmd', { data });
}

export async function tauriCurrenciesGetCurrencyByCode(code: string) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>>>('currencies_get_currency_by_code_cmd', { code });
}

export async function tauriCurrenciesGetCurrency(currencyId: string) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>>>('currencies_get_currency_cmd', { currencyId });
}

export async function tauriCurrenciesGetAllCurrencies() {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>[]>>('currencies_get_all_currencies_cmd');
}

export async function tauriCurrenciesGetUsdExchangeRates() {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>>>('currencies_get_usd_exchange_rates_cmd');
}

export async function tauriCurrenciesUpdateCurrency(currencyId: string, data: Record<string, unknown>) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>>>('currencies_update_currency_cmd', { currencyId, data });
}

export async function tauriCurrenciesUpdateExchangeRates(rates: Record<string, unknown>, base?: string) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>>>('currencies_update_exchange_rates_cmd', {
    rates,
    base: base ?? null,
  });
}

export async function tauriCurrenciesConvertCurrency(amount: number, fromCode: string, toCode: string) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>>>('currencies_convert_currency_cmd', { amount, fromCode, toCode });
}

export async function tauriCurrenciesDeleteCurrency(currencyId: string) {
  requireTauri();
  return invoke<TauriActionResult<boolean>>('currencies_delete_currency_cmd', { currencyId });
}
