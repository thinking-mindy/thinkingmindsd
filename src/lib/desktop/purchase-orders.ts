import { invoke } from '@tauri-apps/api/core';
import type { TauriActionResult } from '@/lib/desktop/admin-types';
import { isTauriBackendAvailable } from '@/lib/desktop/runtime';

function requireTauri(): void {
  if (!isTauriBackendAvailable()) {
    throw new Error('Tauri purchase orders API requires the desktop shell');
  }
}

export async function tauriPurchaseOrdersCreate(data: Record<string, unknown>) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>>>('purchase_orders_create_cmd', { data });
}

export async function tauriPurchaseOrdersGet(poNumber: string) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>>>('purchase_orders_get_cmd', { poNumber });
}

export async function tauriPurchaseOrdersGetByOrg(orgId: string) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>[]>>('purchase_orders_get_by_org_cmd', { orgId });
}

export async function tauriPurchaseOrdersGetForCurrentOrg(limit?: number) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>[]>>('purchase_orders_get_for_current_org_cmd', { limit: limit ?? null });
}

export async function tauriPurchaseOrdersGetByStatus(orgId: string, status: string) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>[]>>('purchase_orders_get_by_status_cmd', { orgId, status });
}

export async function tauriPurchaseOrdersGetByVendor(orgId: string, vendor: string) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>[]>>('purchase_orders_get_by_vendor_cmd', { orgId, vendor });
}

export async function tauriPurchaseOrdersUpdate(poNumber: string, data: Record<string, unknown>) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>>>('purchase_orders_update_cmd', { poNumber, data });
}

export async function tauriPurchaseOrdersApprove(poNumber: string, approvedBy: string) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>>>('purchase_orders_approve_cmd', { poNumber, approvedBy });
}

export async function tauriPurchaseOrdersDelete(poNumber: string) {
  requireTauri();
  return invoke<TauriActionResult<boolean>>('purchase_orders_delete_cmd', { poNumber });
}
