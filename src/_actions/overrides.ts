/** Auto-generated desktop stub for overrides.ts */
export type CompanyProjectType = 'overrides';

export interface CompanyProject {
  _id: string;
  companyId: string;
  type: CompanyProjectType;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CompanyFile {
  _id: string;
  companyId: string;
  projectId: string;
  path: string;
  content: string;
  contentType: string;
  updatedAt: Date;
  updatedBy?: string;
  createdAt: Date;
}

export async function ensureOverridesProject(..._args: unknown[]) {
  return { success: false as const, error: 'Desktop app: ensureOverridesProject is not available until this module is migrated to Rust.' };
}

export async function listOverrideFiles(..._args: unknown[]) {
  return { success: false as const, error: 'Desktop app: listOverrideFiles is not available until this module is migrated to Rust.' };
}

export async function getOverrideFile(..._args: unknown[]) {
  return { success: false as const, error: 'Desktop app: getOverrideFile is not available until this module is migrated to Rust.' };
}

export async function upsertOverrideFile(..._args: unknown[]) {
  return { success: false as const, error: 'Desktop app: upsertOverrideFile is not available until this module is migrated to Rust.' };
}

export async function deleteOverrideFile(..._args: unknown[]) {
  return { success: false as const, error: 'Desktop app: deleteOverrideFile is not available until this module is migrated to Rust.' };
}

export async function resolveOverrideOrDefault(..._args: unknown[]) {
  return { success: false as const, error: 'Desktop app: resolveOverrideOrDefault is not available until this module is migrated to Rust.' };
}
