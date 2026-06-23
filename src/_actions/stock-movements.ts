/** Auto-generated desktop stub for stock-movements.ts */
export interface StockMovement {
  _id?: string;
  orgId: string;
  itemId: string;
  itemName: string;
  itemSku?: string;
  type: 'IN' | 'OUT' | 'ADJUST';
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  reason?: string;
  reference?: string; // PO number, order ID, etc.
  location?: string;
  createdBy: string;
  createdAt: Date;
}

export async function createStockMovement(..._args: unknown[]) {
  return { success: false as const, error: 'Desktop app: createStockMovement is not available until this module is migrated to Rust.' };
}

export async function getStockMovements(..._args: unknown[]) {
  return { success: false as const, error: 'Desktop app: getStockMovements is not available until this module is migrated to Rust.' };
}

export async function getStockMovement(..._args: unknown[]) {
  return { success: false as const, error: 'Desktop app: getStockMovement is not available until this module is migrated to Rust.' };
}

export async function deleteStockMovement(..._args: unknown[]) {
  return { success: false as const, error: 'Desktop app: deleteStockMovement is not available until this module is migrated to Rust.' };
}
