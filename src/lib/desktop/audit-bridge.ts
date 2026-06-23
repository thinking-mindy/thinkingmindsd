/**
 * Audit API — Rust/Tauri when available, Next server actions otherwise.
 */
import { isTauriBackendAvailable } from '@/lib/desktop/runtime';
import {
  tauriAuditCreateAuditLog,
  tauriAuditDeleteOldAuditLogs,
  tauriAuditGetAuditLog,
  tauriAuditGetAuditLogsByAction,
  tauriAuditGetAuditLogsByActor,
  tauriAuditGetAuditLogsByDateRange,
  tauriAuditGetAuditLogsByOrg,
  tauriAuditGetAuditLogsByResource,
} from '@/lib/desktop/audit';

export async function createAuditLog(data: Record<string, unknown>) {
  if (isTauriBackendAvailable()) return tauriAuditCreateAuditLog(data);
  const { createAuditLog: serverFn } = await import('@/_actions/audit-logs');
  return serverFn(data as never);
}

export async function getAuditLog(logId: string) {
  if (isTauriBackendAvailable()) return tauriAuditGetAuditLog(logId);
  const { getAuditLog: serverFn } = await import('@/_actions/audit-logs');
  return serverFn(logId);
}

export async function getAuditLogsByOrg(orgId: string, limit = 100) {
  if (isTauriBackendAvailable()) return tauriAuditGetAuditLogsByOrg(orgId, limit);
  const { getAuditLogsByOrg: serverFn } = await import('@/_actions/audit-logs');
  return serverFn(orgId, limit);
}

export async function getAuditLogsByActor(actorId: string, limit = 100) {
  if (isTauriBackendAvailable()) return tauriAuditGetAuditLogsByActor(actorId, limit);
  const { getAuditLogsByActor: serverFn } = await import('@/_actions/audit-logs');
  return serverFn(actorId, limit);
}

export async function getAuditLogsByResource(
  orgId: string,
  resource: string,
  resourceId?: string
) {
  if (isTauriBackendAvailable()) {
    return tauriAuditGetAuditLogsByResource({ orgId, resource, ...(resourceId ? { resourceId } : {}) });
  }
  const { getAuditLogsByResource: serverFn } = await import('@/_actions/audit-logs');
  return serverFn(orgId, resource, resourceId);
}

export async function getAuditLogsByAction(orgId: string, action: string) {
  if (isTauriBackendAvailable()) return tauriAuditGetAuditLogsByAction(orgId, action);
  const { getAuditLogsByAction: serverFn } = await import('@/_actions/audit-logs');
  return serverFn(orgId, action);
}

export async function getAuditLogsByDateRange(orgId: string, startDate: Date, endDate: Date) {
  if (isTauriBackendAvailable()) {
    return tauriAuditGetAuditLogsByDateRange(orgId, startDate.toISOString(), endDate.toISOString());
  }
  const { getAuditLogsByDateRange: serverFn } = await import('@/_actions/audit-logs');
  return serverFn(orgId, startDate, endDate);
}

export async function deleteOldAuditLogs(beforeDate: Date) {
  if (isTauriBackendAvailable()) {
    const res = await tauriAuditDeleteOldAuditLogs(beforeDate.toISOString());
    if (res.success) return { success: true as const, deletedCount: Number(res.data ?? 0) };
    return { success: false as const, error: res.error ?? 'Failed to delete old audit logs' };
  }
  const { deleteOldAuditLogs: serverFn } = await import('@/_actions/audit-logs');
  return serverFn(beforeDate);
}
