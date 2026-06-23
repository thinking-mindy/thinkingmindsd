import { invoke } from '@tauri-apps/api/core';
import type { TauriActionResult } from '@/lib/desktop/admin-types';
import { isTauriBackendAvailable } from '@/lib/desktop/runtime';

function requireTauri(): void {
  if (!isTauriBackendAvailable()) {
    throw new Error('Tauri payroll API requires the desktop shell');
  }
}

export async function tauriPayrollGetOrgMembersForHr() {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>[]>>('payroll_get_org_members_for_hr_cmd');
}

export async function tauriPayrollCreateRecord(data: Record<string, unknown>) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>>>('payroll_create_record_cmd', { data });
}

export async function tauriPayrollGetRecord(recordId: string) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>>>('payroll_get_record_cmd', { recordId });
}

export async function tauriPayrollGetRecordsByOrg(orgId: string) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>[]>>('payroll_get_records_by_org_cmd', { orgId });
}

export async function tauriPayrollGetRecordsForCurrentOrg(limit?: number) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>[]>>('payroll_get_records_for_current_org_cmd', { limit: limit ?? null });
}

export async function tauriPayrollGetRecordsByEmployee(employeeId: string) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>[]>>('payroll_get_records_by_employee_cmd', { employeeId });
}

export async function tauriPayrollGetRecordsByPeriod(orgId: string, payPeriod: string) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>[]>>('payroll_get_records_by_period_cmd', { orgId, payPeriod });
}

export async function tauriPayrollUpdateRecord(recordId: string, data: Record<string, unknown>) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>>>('payroll_update_record_cmd', { recordId, data });
}

export async function tauriPayrollDeleteRecord(recordId: string) {
  requireTauri();
  return invoke<TauriActionResult<boolean>>('payroll_delete_record_cmd', { recordId });
}

export async function tauriPayrollCreateLeaveRequest(data: Record<string, unknown>) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>>>('payroll_create_leave_request_cmd', { data });
}

export async function tauriPayrollGetLeaveRequest(requestId: string) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>>>('payroll_get_leave_request_cmd', { requestId });
}

export async function tauriPayrollGetLeaveRequestsByOrg(orgId: string) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>[]>>('payroll_get_leave_requests_by_org_cmd', { orgId });
}

export async function tauriPayrollGetLeaveRequestsForCurrentOrg(limit?: number) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>[]>>('payroll_get_leave_requests_for_current_org_cmd', { limit: limit ?? null });
}

export async function tauriPayrollGetLeaveRequestsByEmployee(employeeId: string) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>[]>>('payroll_get_leave_requests_by_employee_cmd', { employeeId });
}

export async function tauriPayrollGetLeaveRequestsByStatus(orgId: string, status: string) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>[]>>('payroll_get_leave_requests_by_status_cmd', { orgId, status });
}

export async function tauriPayrollUpdateLeaveRequest(requestId: string, data: Record<string, unknown>) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>>>('payroll_update_leave_request_cmd', { requestId, data });
}

export async function tauriPayrollDeleteLeaveRequest(requestId: string) {
  requireTauri();
  return invoke<TauriActionResult<boolean>>('payroll_delete_leave_request_cmd', { requestId });
}
