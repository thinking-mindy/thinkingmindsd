import { invoke } from '@tauri-apps/api/core';
import type { TauriActionResult } from '@/lib/desktop/admin-types';
import { isTauriBackendAvailable } from '@/lib/desktop/runtime';

function requireTauri(): void {
  if (!isTauriBackendAvailable()) {
    throw new Error('Tauri POS API requires the desktop shell');
  }
}

export async function tauriPosCreateOrder(
  data: Record<string, unknown>
): Promise<TauriActionResult<Record<string, unknown>>> {
  requireTauri();
  return invoke('pos_create_order_cmd', { data });
}

export async function tauriPosCompleteOrder(
  orderId: string,
  method: string,
  reference?: string
): Promise<TauriActionResult<Record<string, unknown>>> {
  requireTauri();
  return invoke('pos_complete_order_cmd', {
    input: { orderId, method, reference },
  });
}

export async function tauriPosGetOrders(
  limit?: number
): Promise<TauriActionResult<Record<string, unknown>[]>> {
  requireTauri();
  return invoke('pos_get_orders_cmd', { limit });
}

export async function tauriPosGetRegisterActivity(
  limit?: number
): Promise<TauriActionResult<Record<string, unknown>[]>> {
  requireTauri();
  return invoke('pos_get_register_activity_cmd', { limit });
}

export async function tauriPosGetMenuCategories(): Promise<
  TauriActionResult<Record<string, unknown>[]>
> {
  requireTauri();
  return invoke('pos_get_menu_categories_cmd');
}

export async function tauriPosGetMenuItems(
  categoryId?: string,
  includeUnavailable?: boolean
): Promise<TauriActionResult<Record<string, unknown>[]>> {
  requireTauri();
  return invoke('pos_get_menu_items_cmd', { categoryId, includeUnavailable });
}

export async function tauriPosSyncInventoryToPos(
  inventoryItemId: string,
  categoryId: string,
  options?: { description?: string; imageUrl?: string }
): Promise<TauriActionResult<Record<string, unknown>>> {
  requireTauri();
  return invoke('pos_sync_inventory_to_pos_cmd', {
    input: { inventoryItemId, categoryId, options: options ?? {} },
  });
}

export async function tauriPosGetInventoryItemsForPos(): Promise<
  TauriActionResult<Record<string, unknown>[]>
> {
  requireTauri();
  return invoke('pos_get_inventory_items_for_pos_cmd');
}
