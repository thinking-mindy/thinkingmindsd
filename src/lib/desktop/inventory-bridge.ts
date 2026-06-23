/**
 * Inventory API — Rust/Tauri when available, Next server actions otherwise.
 */
import { isTauriBackendAvailable } from '@/lib/desktop/runtime';
import {
  tauriInventoryBulkUpsertItems,
  tauriInventoryBulkUpsertSuppliers,
  tauriInventoryCreateItem,
  tauriInventoryCreateStockMovement,
  tauriInventoryCreateSupplier,
  tauriInventoryDeleteItem,
  tauriInventoryDeleteStockMovement,
  tauriInventoryDeleteSupplier,
  tauriInventoryGetAllItems,
  tauriInventoryGetAllSuppliers,
  tauriInventoryGetStockMovements,
  tauriInventoryUpdateItem,
  tauriInventoryUpdateSupplier,
} from '@/lib/desktop/inventory';
import {
  tauriPosGetInventoryItemsForPos,
  tauriPosSyncInventoryToPos,
} from '@/lib/desktop/pos';

export async function createInventoryItem(data: Record<string, unknown>) {
  if (isTauriBackendAvailable()) {
    return tauriInventoryCreateItem(data);
  }
  const { createInventoryItem: serverCreateInventoryItem } = await import(
    '@/_actions/inventory-items'
  );
  return serverCreateInventoryItem(data as never);
}

export async function getAllInventoryItems() {
  if (isTauriBackendAvailable()) {
    return tauriInventoryGetAllItems();
  }
  const { getAllInventoryItems: serverGetAllInventoryItems } = await import(
    '@/_actions/inventory-items'
  );
  return serverGetAllInventoryItems();
}

export async function updateInventoryItem(
  itemId: string,
  data: Record<string, unknown>
) {
  if (isTauriBackendAvailable()) {
    return tauriInventoryUpdateItem(itemId, data);
  }
  const { updateInventoryItem: serverUpdateInventoryItem } = await import(
    '@/_actions/inventory-items'
  );
  return serverUpdateInventoryItem(itemId, data as never);
}

export async function deleteInventoryItem(itemId: string) {
  if (isTauriBackendAvailable()) {
    const result = await tauriInventoryDeleteItem(itemId);
    if (result.success && result.data) {
      return { success: true as const };
    }
    return { success: false as const, error: result.error ?? 'Failed to delete inventory item' };
  }
  const { deleteInventoryItem: serverDeleteInventoryItem } = await import(
    '@/_actions/inventory-items'
  );
  return serverDeleteInventoryItem(itemId);
}

export async function bulkUpsertInventoryItems(
  rows: Record<string, unknown>[],
  options?: { updateExisting?: boolean }
) {
  if (isTauriBackendAvailable()) {
    const result = await tauriInventoryBulkUpsertItems(rows, options);
    if (!result.success) {
      return { success: false as const, error: result.error ?? 'Import failed' };
    }
    return { success: true as const, ...result.data! };
  }
  const { bulkUpsertInventoryItems: serverBulkUpsertInventoryItems } = await import(
    '@/_actions/inventory-items'
  );
  return serverBulkUpsertInventoryItems(rows as never, options);
}

export async function createStockMovement(data: Record<string, unknown>) {
  if (isTauriBackendAvailable()) {
    return tauriInventoryCreateStockMovement(data);
  }
  const { createStockMovement: serverCreateStockMovement } = await import(
    '@/_actions/stock-movements'
  );
  return serverCreateStockMovement(data as never);
}

export async function getStockMovements(filters?: {
  itemId?: string;
  type?: 'IN' | 'OUT' | 'ADJUST';
  limit?: number;
}) {
  if (isTauriBackendAvailable()) {
    const tauriFilters = filters
      ? {
          ...filters,
          itemId: filters.itemId != null ? String(filters.itemId) : undefined,
        }
      : undefined;
    return tauriInventoryGetStockMovements(tauriFilters);
  }
  const { getStockMovements: serverGetStockMovements } = await import(
    '@/_actions/stock-movements'
  );
  return serverGetStockMovements(filters as never);
}

export async function deleteStockMovement(movementId: string) {
  if (isTauriBackendAvailable()) {
    const result = await tauriInventoryDeleteStockMovement(movementId);
    if (result.success && result.data) {
      return { success: true as const };
    }
    return { success: false as const, error: result.error ?? 'Failed to delete stock movement' };
  }
  const { deleteStockMovement: serverDeleteStockMovement } = await import(
    '@/_actions/stock-movements'
  );
  return serverDeleteStockMovement(movementId);
}

export async function createSupplier(data: Record<string, unknown>) {
  if (isTauriBackendAvailable()) {
    return tauriInventoryCreateSupplier(data);
  }
  const { createSupplier: serverCreateSupplier } = await import('@/_actions/suppliers');
  return serverCreateSupplier(data as never);
}

export async function getAllSuppliers() {
  if (isTauriBackendAvailable()) {
    return tauriInventoryGetAllSuppliers();
  }
  const { getAllSuppliers: serverGetAllSuppliers } = await import('@/_actions/suppliers');
  return serverGetAllSuppliers();
}

export async function updateSupplier(
  supplierId: string,
  data: Record<string, unknown>
) {
  if (isTauriBackendAvailable()) {
    return tauriInventoryUpdateSupplier(supplierId, data);
  }
  const { updateSupplier: serverUpdateSupplier } = await import('@/_actions/suppliers');
  return serverUpdateSupplier(supplierId, data as never);
}

export async function deleteSupplier(supplierId: string) {
  if (isTauriBackendAvailable()) {
    const result = await tauriInventoryDeleteSupplier(supplierId);
    if (result.success && result.data) {
      return { success: true as const };
    }
    return { success: false as const, error: result.error ?? 'Failed to delete supplier' };
  }
  const { deleteSupplier: serverDeleteSupplier } = await import('@/_actions/suppliers');
  return serverDeleteSupplier(supplierId);
}

export async function bulkUpsertSuppliers(
  rows: Record<string, unknown>[],
  options?: { updateExisting?: boolean }
) {
  if (isTauriBackendAvailable()) {
    const result = await tauriInventoryBulkUpsertSuppliers(rows, options);
    if (!result.success) {
      return { success: false as const, error: result.error ?? 'Import failed' };
    }
    return { success: true as const, ...result.data! };
  }
  const { bulkUpsertSuppliers: serverBulkUpsertSuppliers } = await import(
    '@/_actions/suppliers'
  );
  return serverBulkUpsertSuppliers(rows as never, options);
}

export async function syncInventoryItemToPOS(
  inventoryItemId: string,
  categoryId: string,
  options?: { description?: string; imageUrl?: string }
) {
  if (isTauriBackendAvailable()) {
    return tauriPosSyncInventoryToPos(inventoryItemId, categoryId, options);
  }
  const { syncInventoryItemToPOS: serverSyncInventoryItemToPOS } = await import(
    '@/_actions/inventory-pos-sync'
  );
  return serverSyncInventoryItemToPOS(inventoryItemId, categoryId, options);
}

export async function getInventoryItemsForPOS() {
  if (isTauriBackendAvailable()) {
    return tauriPosGetInventoryItemsForPos();
  }
  const { getInventoryItemsForPOS: serverGetInventoryItemsForPOS } = await import(
    '@/_actions/inventory-pos-sync'
  );
  return serverGetInventoryItemsForPOS();
}
