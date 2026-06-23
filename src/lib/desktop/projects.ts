import { invoke } from '@tauri-apps/api/core';
import type { TauriActionResult } from '@/lib/desktop/admin-types';
import { isTauriBackendAvailable } from '@/lib/desktop/runtime';

function requireTauri(): void {
  if (!isTauriBackendAvailable()) {
    throw new Error('Tauri projects API requires the desktop shell');
  }
}

export async function tauriProjectsGetOrgMembersForTasks() {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>[]>>('projects_get_org_members_for_tasks_cmd');
}

export async function tauriProjectsCreateProject(data: Record<string, unknown>) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>>>('projects_create_project_cmd', { data });
}

export async function tauriProjectsGetProject(projectId: string) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>>>('projects_get_project_cmd', { projectId });
}

export async function tauriProjectsGetProjectsByOrg(orgId: string) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>[]>>('projects_get_projects_by_org_cmd', { orgId });
}

export async function tauriProjectsGetProjectsForCurrentOrg(limit?: number) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>[]>>('projects_get_projects_for_current_org_cmd', { limit: limit ?? null });
}

export async function tauriProjectsGetProjectsByStatus(input: { orgId: string; status: string }) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>[]>>('projects_get_projects_by_status_cmd', { input });
}

export async function tauriProjectsUpdateProject(projectId: string, data: Record<string, unknown>) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>>>('projects_update_project_cmd', { projectId, data });
}

export async function tauriProjectsAddMemberToProject(input: { projectId: string; userId: string }) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>>>('projects_add_member_to_project_cmd', { input });
}

export async function tauriProjectsDeleteProject(projectId: string) {
  requireTauri();
  return invoke<TauriActionResult<boolean>>('projects_delete_project_cmd', { projectId });
}

export async function tauriProjectsCreateTask(data: Record<string, unknown>) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>>>('projects_create_task_cmd', { data });
}

export async function tauriProjectsGetTask(taskId: string) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>>>('projects_get_task_cmd', { taskId });
}

export async function tauriProjectsGetTasksByProject(projectId: string) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>[]>>('projects_get_tasks_by_project_cmd', { projectId });
}

export async function tauriProjectsGetTasksByOrg(orgId: string) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>[]>>('projects_get_tasks_by_org_cmd', { orgId });
}

export async function tauriProjectsGetTasksForCurrentOrg(limit?: number) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>[]>>('projects_get_tasks_for_current_org_cmd', { limit: limit ?? null });
}

export async function tauriProjectsGetTasksByAssigned(userId: string) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>[]>>('projects_get_tasks_by_assigned_cmd', { userId });
}

export async function tauriProjectsGetTasksByStatus(input: { orgId: string; status: string }) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>[]>>('projects_get_tasks_by_status_cmd', { input });
}

export async function tauriProjectsUpdateTask(taskId: string, data: Record<string, unknown>) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>>>('projects_update_task_cmd', { taskId, data });
}

export async function tauriProjectsDeleteTask(taskId: string) {
  requireTauri();
  return invoke<TauriActionResult<boolean>>('projects_delete_task_cmd', { taskId });
}

export async function tauriProjectsGetWorkBoardConfig() {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>>>('projects_get_work_board_config_cmd');
}

export async function tauriProjectsSaveWorkBoardConfig(data: Record<string, unknown>) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>>>('projects_save_work_board_config_cmd', { data });
}

export async function tauriProjectsMigrateTaskStatuses(input: { fromStatus: string; toStatus: string }) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>>>('projects_migrate_task_statuses_cmd', { input });
}

export async function tauriProjectsMigrateProjectStatuses(input: { fromStatus: string; toStatus: string }) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>>>('projects_migrate_project_statuses_cmd', { input });
}
