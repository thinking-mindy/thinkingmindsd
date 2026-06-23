/**
 * POS API — Rust/Tauri when available, Next server actions otherwise.
 */
import { isTauriBackendAvailable } from '@/lib/desktop/runtime';
import {
  tauriPosCompleteOrder,
  tauriPosCreateOrder,
  tauriPosGetMenuCategories,
  tauriPosGetMenuItems,
  tauriPosGetOrders,
  tauriPosGetRegisterActivity,
} from '@/lib/desktop/pos';

export async function createPOSOrder(data: Record<string, unknown>) {
  if (isTauriBackendAvailable()) {
    return tauriPosCreateOrder(data);
  }
  const { createPOSOrder: serverCreatePOSOrder } = await import('@/_actions/pos');
  return serverCreatePOSOrder(data as never);
}

export async function completePOSOrder(
  orderId: string,
  paymentInfo: { method: 'cash' | 'ecocash' | 'paynow' | 'card'; reference?: string }
) {
  if (isTauriBackendAvailable()) {
    return tauriPosCompleteOrder(orderId, paymentInfo.method, paymentInfo.reference);
  }
  const { completePOSOrder: serverCompletePOSOrder } = await import('@/_actions/pos');
  return serverCompletePOSOrder(orderId, paymentInfo);
}

export async function getPOSOrders(limit?: number) {
  if (isTauriBackendAvailable()) {
    return tauriPosGetOrders(limit);
  }
  const { getPOSOrders: serverGetPOSOrders } = await import('@/_actions/pos');
  return serverGetPOSOrders(limit);
}

export async function getPOSRegisterActivity(limit?: number) {
  if (isTauriBackendAvailable()) {
    return tauriPosGetRegisterActivity(limit);
  }
  const { getPOSRegisterActivity: serverGetPOSRegisterActivity } = await import('@/_actions/pos');
  return serverGetPOSRegisterActivity(limit);
}

export async function getMenuCategories() {
  if (isTauriBackendAvailable()) {
    return tauriPosGetMenuCategories();
  }
  const { getMenuCategories: serverGetMenuCategories } = await import('@/_actions/pos');
  return serverGetMenuCategories();
}

export async function getMenuItems(
  categoryId?: string,
  includeUnavailable?: boolean
) {
  if (isTauriBackendAvailable()) {
    return tauriPosGetMenuItems(categoryId, includeUnavailable);
  }
  const { getMenuItems: serverGetMenuItems } = await import('@/_actions/pos');
  return serverGetMenuItems(categoryId, includeUnavailable);
}
