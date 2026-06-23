/**
 * Payments API — Rust/Tauri when available, Next server actions otherwise.
 */
import { desktopBridge } from '@/lib/desktop/bridge-utils';
import {
  tauriPaymentsGetForOrg,
  tauriPaymentsGetForCurrentOrg,
  tauriPaymentsInitiatePlanPayment,
  tauriPaymentsCheckPlanPaymentStatus,
  tauriPaymentsInitiatePosPaynowPayment,
} from '@/lib/desktop/payments';

export async function getPaymentsForOrg(orgId: string) {
  const { getPaymentsForOrg: serverFn } = await import('@/_actions/payments');
  return desktopBridge(() => tauriPaymentsGetForOrg(orgId), () => serverFn(orgId));
}

export async function getPaymentsForCurrentOrg() {
  const { getPaymentsForCurrentOrg: serverFn } = await import('@/_actions/payments');
  return desktopBridge(() => tauriPaymentsGetForCurrentOrg(), () => serverFn());
}

export async function initiatePlanPayment(input: Record<string, unknown>) {
  const { initiatePlanPayment: serverFn } = await import('@/_actions/payments');
  return desktopBridge(() => tauriPaymentsInitiatePlanPayment(input), () => serverFn(input as never));
}

export async function checkPlanPaymentStatus(paymentId: string) {
  const { checkPlanPaymentStatus: serverFn } = await import('@/_actions/payments');
  return desktopBridge(() => tauriPaymentsCheckPlanPaymentStatus(paymentId), () => serverFn(paymentId));
}

export async function initiatePOSPayNowPayment(input: Record<string, unknown>) {
  const { initiatePOSPayNowPayment: serverFn } = await import('@/_actions/payments');
  return desktopBridge(() => tauriPaymentsInitiatePosPaynowPayment(input), () => serverFn(input as never));
}
