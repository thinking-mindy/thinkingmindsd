/**
 * Payroll + leave requests API — Rust/Tauri when available, Next server actions otherwise.
 */
import { desktopBridge } from '@/lib/desktop/bridge-utils';
import { isTauriBackendAvailable } from '@/lib/desktop/runtime';
import {
  tauriPayrollGetOrgMembersForHr,
  tauriPayrollCreateRecord,
  tauriPayrollGetRecord,
  tauriPayrollGetRecordsByOrg,
  tauriPayrollGetRecordsForCurrentOrg,
  tauriPayrollGetRecordsByEmployee,
  tauriPayrollGetRecordsByPeriod,
  tauriPayrollUpdateRecord,
  tauriPayrollDeleteRecord,
  tauriPayrollCreateLeaveRequest,
  tauriPayrollGetLeaveRequest,
  tauriPayrollGetLeaveRequestsByOrg,
  tauriPayrollGetLeaveRequestsForCurrentOrg,
  tauriPayrollGetLeaveRequestsByEmployee,
  tauriPayrollGetLeaveRequestsByStatus,
  tauriPayrollUpdateLeaveRequest,
  tauriPayrollDeleteLeaveRequest,
} from '@/lib/desktop/payroll';

export type HREmployee = {
  id: string;
  email: string;
  name: string;
  role?: string;
  department?: string;
};

export type { LeaveRequest } from '@/_actions/leave-requests';

export async function getOrgMembersForHR() {
  const { getOrgMembersForHR: serverFn } = await import('@/_actions/payroll');
  return desktopBridge(() => tauriPayrollGetOrgMembersForHr(), () => serverFn());
}

export async function createPayrollRecord(data: Record<string, unknown>) {
  const { createPayrollRecord: serverFn } = await import('@/_actions/payroll');
  return desktopBridge(() => tauriPayrollCreateRecord(data), () => serverFn(data as never));
}

export async function getPayrollRecord(recordId: string) {
  const { getPayrollRecord: serverFn } = await import('@/_actions/payroll');
  return desktopBridge(() => tauriPayrollGetRecord(recordId), () => serverFn(recordId));
}

export async function getPayrollRecordsByOrg(orgId: string) {
  const { getPayrollRecordsByOrg: serverFn } = await import('@/_actions/payroll');
  return desktopBridge(() => tauriPayrollGetRecordsByOrg(orgId), () => serverFn(orgId));
}

export async function getPayrollRecordsForCurrentOrg(limit = 500) {
  const { getPayrollRecordsForCurrentOrg: serverFn } = await import('@/_actions/payroll');
  return desktopBridge(() => tauriPayrollGetRecordsForCurrentOrg(limit), () => serverFn(limit));
}

export async function getPayrollRecordsByEmployee(employeeId: string) {
  const { getPayrollRecordsByEmployee: serverFn } = await import('@/_actions/payroll');
  return desktopBridge(() => tauriPayrollGetRecordsByEmployee(employeeId), () => serverFn(employeeId));
}

export async function getPayrollRecordsByPeriod(orgId: string, payPeriod: string) {
  const { getPayrollRecordsByPeriod: serverFn } = await import('@/_actions/payroll');
  return desktopBridge(() => tauriPayrollGetRecordsByPeriod(orgId, payPeriod), () => serverFn(orgId, payPeriod));
}

export async function updatePayrollRecord(recordId: string, data: Record<string, unknown>) {
  const { updatePayrollRecord: serverFn } = await import('@/_actions/payroll');
  return desktopBridge(() => tauriPayrollUpdateRecord(recordId, data), () => serverFn(recordId, data as never));
}

export async function deletePayrollRecord(recordId: string) {
  if (isTauriBackendAvailable()) {
    const res = await tauriPayrollDeleteRecord(recordId);
    if (res.success && res.data) return { success: true as const };
    return { success: false as const, error: res.error ?? 'Failed to delete payroll record' };
  }
  const { deletePayrollRecord: serverFn } = await import('@/_actions/payroll');
  return serverFn(recordId);
}

export async function createLeaveRequest(data: Record<string, unknown>) {
  const { createLeaveRequest: serverFn } = await import('@/_actions/leave-requests');
  return desktopBridge(() => tauriPayrollCreateLeaveRequest(data), () => serverFn(data as never));
}

export async function getLeaveRequest(requestId: string) {
  const { getLeaveRequest: serverFn } = await import('@/_actions/leave-requests');
  return desktopBridge(() => tauriPayrollGetLeaveRequest(requestId), () => serverFn(requestId));
}

export async function getLeaveRequestsByOrg(orgId: string) {
  const { getLeaveRequestsByOrg: serverFn } = await import('@/_actions/leave-requests');
  return desktopBridge(() => tauriPayrollGetLeaveRequestsByOrg(orgId), () => serverFn(orgId));
}

export async function getLeaveRequestsForCurrentOrg(limit = 300) {
  const { getLeaveRequestsForCurrentOrg: serverFn } = await import('@/_actions/leave-requests');
  return desktopBridge(() => tauriPayrollGetLeaveRequestsForCurrentOrg(limit), () => serverFn(limit));
}

export async function getLeaveRequestsByEmployee(employeeId: string) {
  const { getLeaveRequestsByEmployee: serverFn } = await import('@/_actions/leave-requests');
  return desktopBridge(() => tauriPayrollGetLeaveRequestsByEmployee(employeeId), () => serverFn(employeeId));
}

export async function getLeaveRequestsByStatus(orgId: string, status: string) {
  const { getLeaveRequestsByStatus: serverFn } = await import('@/_actions/leave-requests');
  return desktopBridge(() => tauriPayrollGetLeaveRequestsByStatus(orgId, status), () => serverFn(orgId, status as never));
}

export async function updateLeaveRequest(requestId: string, data: Record<string, unknown>) {
  const { updateLeaveRequest: serverFn } = await import('@/_actions/leave-requests');
  return desktopBridge(() => tauriPayrollUpdateLeaveRequest(requestId, data), () => serverFn(requestId, data as never));
}

export async function deleteLeaveRequest(requestId: string) {
  if (isTauriBackendAvailable()) {
    const res = await tauriPayrollDeleteLeaveRequest(requestId);
    if (res.success && res.data) return { success: true as const };
    return { success: false as const, error: res.error ?? 'Failed to delete leave request' };
  }
  const { deleteLeaveRequest: serverFn } = await import('@/_actions/leave-requests');
  return serverFn(requestId);
}
