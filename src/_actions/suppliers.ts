/** Auto-generated desktop stub for suppliers.ts */
export interface Supplier {
  _id?: string;
  orgId: string;
  name: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  website?: string;
  contactPerson?: string;
  notes?: string;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt?: Date;
}

export async function createSupplier(..._args: unknown[]) {
  return { success: false as const, error: 'Desktop app: createSupplier is not available until this module is migrated to Rust.' };
}

export async function getSupplier(..._args: unknown[]) {
  return { success: false as const, error: 'Desktop app: getSupplier is not available until this module is migrated to Rust.' };
}

export async function getAllSuppliers(..._args: unknown[]) {
  return { success: false as const, error: 'Desktop app: getAllSuppliers is not available until this module is migrated to Rust.' };
}

export async function updateSupplier(..._args: unknown[]) {
  return { success: false as const, error: 'Desktop app: updateSupplier is not available until this module is migrated to Rust.' };
}

export async function deleteSupplier(..._args: unknown[]) {
  return { success: false as const, error: 'Desktop app: deleteSupplier is not available until this module is migrated to Rust.' };
}

export async function bulkUpsertSuppliers(..._args: unknown[]) {
  return { success: false as const, error: 'Desktop app: bulkUpsertSuppliers is not available until this module is migrated to Rust.' };
}
