import { invoke } from '@tauri-apps/api/core';
import type { TauriActionResult } from '@/lib/desktop/admin-types';
import { isTauriBackendAvailable } from '@/lib/desktop/runtime';

function requireTauri(): void {
  if (!isTauriBackendAvailable()) {
    throw new Error('Tauri school API requires the desktop shell');
  }
}

export async function tauriSchoolGetSettings(orgId?: string) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>>>('school_get_settings_cmd', { orgId: orgId ?? null });
}

export async function tauriSchoolUpdateSettings(input: Record<string, unknown>) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>>>('school_update_settings_cmd', { input });
}

export async function tauriSchoolGetClasses(filters?: { orgId?: string; educationLevel?: string }) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>[]>>('school_get_classes_cmd', { filters: filters ?? null });
}

export async function tauriSchoolCreateClass(input: Record<string, unknown>) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>>>('school_create_class_cmd', { input });
}

export async function tauriSchoolUpdateClass(classId: string, input: Record<string, unknown>) {
  requireTauri();
  return invoke<TauriActionResult<void>>('school_update_class_cmd', { classId, input });
}

export async function tauriSchoolDeleteClass(classId: string) {
  requireTauri();
  return invoke<TauriActionResult<void>>('school_delete_class_cmd', { classId });
}

export async function tauriSchoolGetStudents(filters?: { orgId?: string; status?: string }) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>[]>>('school_get_students_cmd', { filters: filters ?? null });
}

export async function tauriSchoolGetStudent(studentId: string) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>>>('school_get_student_cmd', { studentId });
}

export async function tauriSchoolCreateStudent(input: Record<string, unknown>) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>>>('school_create_student_cmd', { input });
}

export async function tauriSchoolUpdateStudent(studentId: string, input: Record<string, unknown>) {
  requireTauri();
  return invoke<TauriActionResult<void>>('school_update_student_cmd', { studentId, input });
}

export async function tauriSchoolDeleteStudent(studentId: string) {
  requireTauri();
  return invoke<TauriActionResult<void>>('school_delete_student_cmd', { studentId });
}

export async function tauriSchoolBuildFeeSnapshot(input: {
  orgId: string;
  studentId: string;
  additionalPayment?: number;
  excludeTxId?: string;
}) {
  requireTauri();
  return invoke<Record<string, unknown> | null>('school_build_fee_snapshot_cmd', { input });
}

export async function tauriSchoolGetStudentTermFeeBalance(studentId: string, additionalPayment?: number) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>>>('school_get_student_term_fee_balance_cmd', {
    studentId,
    additionalPayment: additionalPayment ?? null,
  });
}

export async function tauriSchoolGetReceiptFeeInfo(studentId: string) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown> | null>>('school_get_receipt_fee_info_cmd', { studentId });
}

export async function tauriSchoolGetStudentsWithBalances(filters?: { orgId?: string }) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>[]>>('school_get_students_with_balances_cmd', {
    filters: filters ?? null,
  });
}

export async function tauriSchoolCreateClassesFromTemplates(educationLevel: string) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>>>('school_create_classes_from_templates_cmd', {
    educationLevel,
  });
}

export async function tauriSchoolGetDashboardStats(orgId?: string) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>>>('school_get_dashboard_stats_cmd', { orgId: orgId ?? null });
}
