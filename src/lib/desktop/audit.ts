import { invoke } from '@tauri-apps/api/core';
import type { TauriActionResult } from '@/lib/desktop/admin-types';
import { isTauriBackendAvailable } from '@/lib/desktop/runtime';

function requireTauri(): void {
  if (!isTauriBackendAvailable()) {
    throw new Error('Tauri audit API requires the desktop shell');
  }
}

export async function tauriAuditCreateAuditLog(data: Record<string, unknown>) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>>>('audit_create_audit_log_cmd', { data });
}

export async function tauriAuditGetAuditLog(logId: string) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown> | null>>('audit_get_audit_log_cmd', { logId });
}

export async function tauriAuditGetAuditLogsByOrg(orgId: string, limit = 100) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>[]>>('audit_get_audit_logs_by_org_cmd', {
    orgId,
    limit,
  });
}

export async function tauriAuditGetAuditLogsByActor(actorId: string, limit = 100) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>[]>>('audit_get_audit_logs_by_actor_cmd', {
    actorId,
    limit,
  });
}

export async function tauriAuditGetAuditLogsByResource(input: {
  orgId: string;
  resource: string;
  resourceId?: string;
}) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>[]>>('audit_get_audit_logs_by_resource_cmd', {
    input,
  });
}

export async function tauriAuditGetAuditLogsByAction(orgId: string, action: string) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>[]>>('audit_get_audit_logs_by_action_cmd', {
    orgId,
    action,
  });
}

export async function tauriAuditGetAuditLogsByDateRange(
  orgId: string,
  startDateIso: string,
  endDateIso: string
) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>[]>>(
    'audit_get_audit_logs_by_date_range_cmd',
    {
      orgId,
      startDateIso,
      endDateIso,
    }
  );
}

export async function tauriAuditDeleteOldAuditLogs(beforeDateIso: string) {
  requireTauri();
  return invoke<TauriActionResult<number>>('audit_delete_old_audit_logs_cmd', { beforeDateIso });
}
