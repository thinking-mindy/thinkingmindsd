/** Auto-generated desktop stub for pos.ts */
export interface POSOrder {
  _id?: string;
  orderId?: string;
  orgId: string;
  items: Array<{
    itemId: string;
    name: string;
    price: number;
    quantity: number;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: 'cash' | 'paynow' | 'card';
  paymentReference?: string;
  status: 'pending' | 'completed' | 'cancelled' | 'refunded';
  tableNumber?: string;
  customerName?: string;
  customerId?: string;
  createdBy: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface MenuCategory {
  _id?: string;
  orgId: string;
  name: string;
  description?: string;
  displayOrder?: number;
  createdAt: Date;
}

export interface MenuItem {
  _id?: string;
  orgId: string;
  categoryId: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  sku?: string;
  isAvailable: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export async function createPOSOrder(..._args: unknown[]) {
  return { success: false as const, error: 'Desktop app: createPOSOrder is not available until this module is migrated to Rust.' };
}

export async function completePOSOrder(..._args: unknown[]) {
  return { success: false as const, error: 'Desktop app: completePOSOrder is not available until this module is migrated to Rust.' };
}

export async function getPOSOrders(..._args: unknown[]) {
  return { success: false as const, error: 'Desktop app: getPOSOrders is not available until this module is migrated to Rust.' };
}

export async function getPOSRegisterActivity(..._args: unknown[]) {
  return { success: false as const, error: 'Desktop app: getPOSRegisterActivity is not available until this module is migrated to Rust.' };
}

export async function getMenuCategories(..._args: unknown[]) {
  return { success: false as const, error: 'Desktop app: getMenuCategories is not available until this module is migrated to Rust.' };
}

export async function createMenuCategory(..._args: unknown[]) {
  return { success: false as const, error: 'Desktop app: createMenuCategory is not available until this module is migrated to Rust.' };
}

export async function getMenuItems(..._args: unknown[]) {
  return { success: false as const, error: 'Desktop app: getMenuItems is not available until this module is migrated to Rust.' };
}

export async function createMenuItem(..._args: unknown[]) {
  return { success: false as const, error: 'Desktop app: createMenuItem is not available until this module is migrated to Rust.' };
}

export async function updateMenuItem(..._args: unknown[]) {
  return { success: false as const, error: 'Desktop app: updateMenuItem is not available until this module is migrated to Rust.' };
}

export async function deleteMenuItem(..._args: unknown[]) {
  return { success: false as const, error: 'Desktop app: deleteMenuItem is not available until this module is migrated to Rust.' };
}
