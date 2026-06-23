/** Auto-generated desktop stub for user-requests.ts */
export interface UserRequest {
  _id?: string;
  requestId?: string;
  orgId: string;
  userId: string;
  userEmail?: string;
  issue: string;
  description: string;
  category: string;
  status: 'Pending' | 'In Progress' | 'Completed' | 'Rejected';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt?: Date;
  completedAt?: Date;
  assignedTo?: string;
  notes?: string;
}

export async function createUserRequest(..._args: unknown[]) {
  return { success: false as const, error: 'Desktop app: createUserRequest is not available until this module is migrated to Rust.' };
}

export async function getUserRequest(..._args: unknown[]) {
  return { success: false as const, error: 'Desktop app: getUserRequest is not available until this module is migrated to Rust.' };
}

export async function getUserRequestsByOrg(..._args: unknown[]) {
  return { success: false as const, error: 'Desktop app: getUserRequestsByOrg is not available until this module is migrated to Rust.' };
}

export async function getUserRequestsByUser(..._args: unknown[]) {
  return { success: false as const, error: 'Desktop app: getUserRequestsByUser is not available until this module is migrated to Rust.' };
}

export async function getUserRequestsByStatus(..._args: unknown[]) {
  return { success: false as const, error: 'Desktop app: getUserRequestsByStatus is not available until this module is migrated to Rust.' };
}

export async function updateUserRequest(..._args: unknown[]) {
  return { success: false as const, error: 'Desktop app: updateUserRequest is not available until this module is migrated to Rust.' };
}

export async function deleteUserRequest(..._args: unknown[]) {
  return { success: false as const, error: 'Desktop app: deleteUserRequest is not available until this module is migrated to Rust.' };
}
