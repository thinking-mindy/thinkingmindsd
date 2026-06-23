/** Auto-generated desktop stub for leave-requests.ts */
export interface LeaveRequest {
  _id?: string;
  requestId?: string;
  orgId: string;
  employeeId: string;
  leaveType: 'Annual' | 'Sick' | 'Personal' | 'Maternity' | 'Paternity' | 'Unpaid';
  status: 'Pending' | 'Approved' | 'Rejected';
  startDate: Date;
  endDate: Date;
  days: number;
  reason: string;
  submittedDate: Date;
  approvedBy?: string;
  approvedAt?: Date;
  rejectedReason?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export async function createLeaveRequest(..._args: unknown[]) {
  return { success: false as const, error: 'Desktop app: createLeaveRequest is not available until this module is migrated to Rust.' };
}

export async function getLeaveRequest(..._args: unknown[]) {
  return { success: false as const, error: 'Desktop app: getLeaveRequest is not available until this module is migrated to Rust.' };
}

export async function getLeaveRequestsByOrg(..._args: unknown[]) {
  return { success: false as const, error: 'Desktop app: getLeaveRequestsByOrg is not available until this module is migrated to Rust.' };
}

export async function getLeaveRequestsForCurrentOrg(..._args: unknown[]) {
  return { success: false as const, error: 'Desktop app: getLeaveRequestsForCurrentOrg is not available until this module is migrated to Rust.' };
}

export async function getLeaveRequestsByEmployee(..._args: unknown[]) {
  return { success: false as const, error: 'Desktop app: getLeaveRequestsByEmployee is not available until this module is migrated to Rust.' };
}

export async function getLeaveRequestsByStatus(..._args: unknown[]) {
  return { success: false as const, error: 'Desktop app: getLeaveRequestsByStatus is not available until this module is migrated to Rust.' };
}

export async function updateLeaveRequest(..._args: unknown[]) {
  return { success: false as const, error: 'Desktop app: updateLeaveRequest is not available until this module is migrated to Rust.' };
}

export async function deleteLeaveRequest(..._args: unknown[]) {
  return { success: false as const, error: 'Desktop app: deleteLeaveRequest is not available until this module is migrated to Rust.' };
}
