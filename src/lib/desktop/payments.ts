import { invoke } from '@tauri-apps/api/core';
import type { TauriActionResult } from '@/lib/desktop/admin-types';
import { isTauriBackendAvailable } from '@/lib/desktop/runtime';

function requireTauri(): void {
  if (!isTauriBackendAvailable()) {
    throw new Error('Tauri payments API requires the desktop shell');
  }
}

export async function tauriPaymentsGetForOrg(orgId: string) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>[]>>('payments_get_for_org_cmd', { orgId });
}

export async function tauriPaymentsGetForCurrentOrg() {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>[]>>('payments_get_for_current_org_cmd');
}

export async function tauriPaymentsInitiatePlanPayment(input: Record<string, unknown>) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>>>('payments_initiate_plan_payment_cmd', { input });
}

export async function tauriPaymentsCheckPlanPaymentStatus(paymentId: string) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>>>('payments_check_plan_payment_status_cmd', { paymentId });
}

export async function tauriPaymentsInitiatePosPaynowPayment(input: Record<string, unknown>) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>>>('payments_initiate_pos_paynow_payment_cmd', { input });
}
