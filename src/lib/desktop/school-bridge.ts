/**
 * School API — Rust/Tauri when available, Next server actions otherwise.
 */
import { desktopBridge } from '@/lib/desktop/bridge-utils';
import {
  tauriSchoolGetSettings,
  tauriSchoolUpdateSettings,
  tauriSchoolGetClasses,
  tauriSchoolCreateClass,
  tauriSchoolUpdateClass,
  tauriSchoolDeleteClass,
  tauriSchoolGetStudents,
  tauriSchoolGetStudent,
  tauriSchoolCreateStudent,
  tauriSchoolUpdateStudent,
  tauriSchoolDeleteStudent,
  tauriSchoolBuildFeeSnapshot,
  tauriSchoolGetStudentTermFeeBalance,
  tauriSchoolGetReceiptFeeInfo,
  tauriSchoolGetStudentsWithBalances,
  tauriSchoolCreateClassesFromTemplates,
  tauriSchoolGetDashboardStats,
} from '@/lib/desktop/school';

export async function getSchoolSettings(orgId?: string) {
  const { getSchoolSettings: serverFn } = await import('@/_actions/school');
  return desktopBridge(() => tauriSchoolGetSettings(orgId), () => serverFn(orgId));
}

export async function updateSchoolSettings(input: Record<string, unknown>) {
  const { updateSchoolSettings: serverFn } = await import('@/_actions/school');
  return desktopBridge(() => tauriSchoolUpdateSettings(input), () => serverFn(input as never));
}

export async function getSchoolClasses(orgId?: string, educationLevel?: string) {
  const { getSchoolClasses: serverFn } = await import('@/_actions/school');
  return desktopBridge(
    () => tauriSchoolGetClasses({ orgId, educationLevel }),
    () => serverFn(orgId, educationLevel as never)
  );
}

export async function createSchoolClass(input: Record<string, unknown>) {
  const { createSchoolClass: serverFn } = await import('@/_actions/school');
  return desktopBridge(() => tauriSchoolCreateClass(input), () => serverFn(input as never));
}

export async function updateSchoolClass(classId: string, input: Record<string, unknown>) {
  const { updateSchoolClass: serverFn } = await import('@/_actions/school');
  return desktopBridge(
    () => tauriSchoolUpdateClass(classId, input),
    () => serverFn(classId, input as never)
  );
}

export async function deleteSchoolClass(classId: string) {
  const { deleteSchoolClass: serverFn } = await import('@/_actions/school');
  return desktopBridge(() => tauriSchoolDeleteClass(classId), () => serverFn(classId));
}

export async function getSchoolStudents(orgId?: string, status?: string) {
  const { getSchoolStudents: serverFn } = await import('@/_actions/school');
  return desktopBridge(
    () => tauriSchoolGetStudents({ orgId, status }),
    () => serverFn(orgId, status as never)
  );
}

export async function getSchoolStudent(studentId: string) {
  const { getSchoolStudent: serverFn } = await import('@/_actions/school');
  return desktopBridge(() => tauriSchoolGetStudent(studentId), () => serverFn(studentId));
}

export async function createSchoolStudent(input: Record<string, unknown>) {
  const { createSchoolStudent: serverFn } = await import('@/_actions/school');
  return desktopBridge(() => tauriSchoolCreateStudent(input), () => serverFn(input as never));
}

export async function updateSchoolStudent(studentId: string, input: Record<string, unknown>) {
  const { updateSchoolStudent: serverFn } = await import('@/_actions/school');
  return desktopBridge(
    () => tauriSchoolUpdateStudent(studentId, input),
    () => serverFn(studentId, input as never)
  );
}

export async function deleteSchoolStudent(studentId: string) {
  const { deleteSchoolStudent: serverFn } = await import('@/_actions/school');
  return desktopBridge(() => tauriSchoolDeleteStudent(studentId), () => serverFn(studentId));
}

export async function buildSchoolFeeSnapshot(
  orgId: string,
  studentId: string,
  additionalPayment = 0,
  excludeTxId?: string
) {
  const { buildSchoolFeeSnapshot: serverFn } = await import('@/_actions/school');
  return desktopBridge(
    () => tauriSchoolBuildFeeSnapshot({ orgId, studentId, additionalPayment, excludeTxId }),
    () => serverFn(orgId, studentId, additionalPayment, excludeTxId)
  );
}

export async function getStudentTermFeeBalance(studentId: string, additionalPayment = 0) {
  const { getStudentTermFeeBalance: serverFn } = await import('@/_actions/school');
  return desktopBridge(
    () => tauriSchoolGetStudentTermFeeBalance(studentId, additionalPayment),
    () => serverFn(studentId, additionalPayment)
  );
}

export async function getSchoolReceiptFeeInfo(studentId: string) {
  const { getSchoolReceiptFeeInfo: serverFn } = await import('@/_actions/school');
  return desktopBridge(() => tauriSchoolGetReceiptFeeInfo(studentId), () => serverFn(studentId));
}

export async function getSchoolStudentsWithBalances(orgId?: string) {
  const { getSchoolStudentsWithBalances: serverFn } = await import('@/_actions/school');
  return desktopBridge(
    () => tauriSchoolGetStudentsWithBalances({ orgId }),
    () => serverFn(orgId)
  );
}

export async function createSchoolClassesFromTemplates(educationLevel: string) {
  const { createSchoolClassesFromTemplates: serverFn } = await import('@/_actions/school');
  return desktopBridge(
    () => tauriSchoolCreateClassesFromTemplates(educationLevel),
    () => serverFn(educationLevel as never)
  );
}

export async function getSchoolDashboardStats(orgId?: string) {
  const { getSchoolDashboardStats: serverFn } = await import('@/_actions/school');
  return desktopBridge(() => tauriSchoolGetDashboardStats(orgId), () => serverFn(orgId));
}
