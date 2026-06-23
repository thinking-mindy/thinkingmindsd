/**
 * Purchase orders API — Rust/Tauri when available, Next server actions otherwise.
 */
import { isTauriBackendAvailable } from '@/lib/desktop/runtime';
import {
  tauriPurchaseOrdersCreate,
  tauriPurchaseOrdersGet,
  tauriPurchaseOrdersGetByOrg,
  tauriPurchaseOrdersGetForCurrentOrg,
  tauriPurchaseOrdersGetByStatus,
  tauriPurchaseOrdersGetByVendor,
  tauriPurchaseOrdersUpdate,
  tauriPurchaseOrdersApprove,
  tauriPurchaseOrdersDelete,
} from '@/lib/desktop/purchase-orders';

export async function createPurchaseOrder(data: Record<string, unknown>) {
  if (isTauriBackendAvailable()) return tauriPurchaseOrdersCreate(data);
  const { createPurchaseOrder: serverFn } = await import('@/_actions/purchase-orders');
  return serverFn(data as never);
}

export async function getPurchaseOrder(poNumber: string) {
  if (isTauriBackendAvailable()) return tauriPurchaseOrdersGet(poNumber);
  const { getPurchaseOrder: serverFn } = await import('@/_actions/purchase-orders');
  return serverFn(poNumber);
}

export async function getPurchaseOrdersByOrg(orgId: string) {
  if (isTauriBackendAvailable()) return tauriPurchaseOrdersGetByOrg(orgId);
  const { getPurchaseOrdersByOrg: serverFn } = await import('@/_actions/purchase-orders');
  return serverFn(orgId);
}

export async function getPurchaseOrdersForCurrentOrg(limit = 50) {
  if (isTauriBackendAvailable()) return tauriPurchaseOrdersGetForCurrentOrg(limit);
  const { getPurchaseOrdersForCurrentOrg: serverFn } = await import('@/_actions/purchase-orders');
  return serverFn(limit);
}

export async function getPurchaseOrdersByStatus(orgId: string, status: string) {
  if (isTauriBackendAvailable()) return tauriPurchaseOrdersGetByStatus(orgId, status);
  const { getPurchaseOrdersByStatus: serverFn } = await import('@/_actions/purchase-orders');
  return serverFn(orgId, status as never);
}

export async function getPurchaseOrdersByVendor(orgId: string, vendor: string) {
  if (isTauriBackendAvailable()) return tauriPurchaseOrdersGetByVendor(orgId, vendor);
  const { getPurchaseOrdersByVendor: serverFn } = await import('@/_actions/purchase-orders');
  return serverFn(orgId, vendor);
}

export async function updatePurchaseOrder(poNumber: string, data: Record<string, unknown>) {
  if (isTauriBackendAvailable()) return tauriPurchaseOrdersUpdate(poNumber, data);
  const { updatePurchaseOrder: serverFn } = await import('@/_actions/purchase-orders');
  return serverFn(poNumber, data as never);
}

export async function approvePurchaseOrder(poNumber: string, approvedBy: string) {
  if (isTauriBackendAvailable()) return tauriPurchaseOrdersApprove(poNumber, approvedBy);
  const { approvePurchaseOrder: serverFn } = await import('@/_actions/purchase-orders');
  return serverFn(poNumber, approvedBy);
}

export async function deletePurchaseOrder(poNumber: string) {
  if (isTauriBackendAvailable()) {
    const res = await tauriPurchaseOrdersDelete(poNumber);
    if (res.success && res.data) return { success: true as const };
    return { success: false as const, error: res.error ?? 'Failed to delete purchase order' };
  }
  const { deletePurchaseOrder: serverFn } = await import('@/_actions/purchase-orders');
  return serverFn(poNumber);
}
