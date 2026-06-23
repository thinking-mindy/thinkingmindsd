import { invoke } from '@tauri-apps/api/core';
import type { TauriActionResult } from '@/lib/desktop/admin-types';
import { isTauriBackendAvailable } from '@/lib/desktop/runtime';

function requireTauri(): void {
  if (!isTauriBackendAvailable()) {
    throw new Error('Tauri inventory API requires the desktop shell');
  }
}

export type TauriBulkUpsertResult = {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
};

export async function tauriInventoryCreateItem(
  data: Record<string, unknown>
): Promise<TauriActionResult<Record<string, unknown>>> {
  requireTauri();
  return invoke('inventory_create_item_cmd', { data });
}

export async function tauriInventoryGetAllItems(): Promise<
  TauriActionResult<Record<string, unknown>[]>
> {
  requireTauri();
  return invoke('inventory_get_all_items_cmd');
}

export async function tauriInventoryUpdateItem(
  itemId: string,
  patch: Record<string, unknown>
): Promise<TauriActionResult<Record<string, unknown>>> {
  requireTauri();
  return invoke('inventory_update_item_cmd', { itemId, patch });
}

export async function tauriInventoryDeleteItem(
  itemId: string
): Promise<TauriActionResult<boolean>> {
  requireTauri();
  return invoke('inventory_delete_item_cmd', { itemId });
}

export async function tauriInventoryBulkUpsertItems(
  rows: Record<string, unknown>[],
  options?: { updateExisting?: boolean }
): Promise<TauriActionResult<TauriBulkUpsertResult>> {
  requireTauri();
  return invoke('inventory_bulk_upsert_items_cmd', {
    rows,
    options: { updateExisting: options?.updateExisting ?? false },
  });
}

export async function tauriInventoryCreateStockMovement(
  data: Record<string, unknown>
): Promise<TauriActionResult<Record<string, unknown>>> {
  requireTauri();
  return invoke('inventory_create_stock_movement_cmd', { data });
}

export async function tauriInventoryGetStockMovements(filters?: {
  itemId?: string;
  type?: 'IN' | 'OUT' | 'ADJUST';
  limit?: number;
}): Promise<TauriActionResult<Record<string, unknown>[]>> {
  requireTauri();
  return invoke('inventory_get_stock_movements_cmd', { filters: filters ?? {} });
}

export async function tauriInventoryDeleteStockMovement(
  movementId: string
): Promise<TauriActionResult<boolean>> {
  requireTauri();
  return invoke('inventory_delete_stock_movement_cmd', { movementId });
}

export async function tauriInventoryCreateSupplier(
  data: Record<string, unknown>
): Promise<TauriActionResult<Record<string, unknown>>> {
  requireTauri();
  return invoke('inventory_create_supplier_cmd', { data });
}

export async function tauriInventoryGetAllSuppliers(): Promise<
  TauriActionResult<Record<string, unknown>[]>
> {
  requireTauri();
  return invoke('inventory_get_all_suppliers_cmd');
}

export async function tauriInventoryUpdateSupplier(
  supplierId: string,
  patch: Record<string, unknown>
): Promise<TauriActionResult<Record<string, unknown>>> {
  requireTauri();
  return invoke('inventory_update_supplier_cmd', { supplierId, patch });
}

export async function tauriInventoryDeleteSupplier(
  supplierId: string
): Promise<TauriActionResult<boolean>> {
  requireTauri();
  return invoke('inventory_delete_supplier_cmd', { supplierId });
}

export async function tauriInventoryBulkUpsertSuppliers(
  rows: Record<string, unknown>[],
  options?: { updateExisting?: boolean }
): Promise<TauriActionResult<TauriBulkUpsertResult>> {
  requireTauri();
  return invoke('inventory_bulk_upsert_suppliers_cmd', {
    rows,
    options: { updateExisting: options?.updateExisting ?? false },
  });
}
