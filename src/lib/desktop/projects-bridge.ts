/**
 * Projects/tasks API — Rust/Tauri when available, Next server actions otherwise.
 */
import { desktopBridge } from '@/lib/desktop/bridge-utils';
import { isTauriBackendAvailable } from '@/lib/desktop/runtime';
import {
  tauriProjectsGetOrgMembersForTasks,
  tauriProjectsCreateProject,
  tauriProjectsGetProject,
  tauriProjectsGetProjectsByOrg,
  tauriProjectsGetProjectsForCurrentOrg,
  tauriProjectsGetProjectsByStatus,
  tauriProjectsUpdateProject,
  tauriProjectsAddMemberToProject,
  tauriProjectsDeleteProject,
  tauriProjectsCreateTask,
  tauriProjectsGetTask,
  tauriProjectsGetTasksByProject,
  tauriProjectsGetTasksByOrg,
  tauriProjectsGetTasksForCurrentOrg,
  tauriProjectsGetTasksByAssigned,
  tauriProjectsGetTasksByStatus,
  tauriProjectsUpdateTask,
  tauriProjectsDeleteTask,
  tauriProjectsGetWorkBoardConfig,
  tauriProjectsSaveWorkBoardConfig,
  tauriProjectsMigrateTaskStatuses,
  tauriProjectsMigrateProjectStatuses,
} from '@/lib/desktop/projects';
import type { WorkBoardConfig } from '@/lib/task-board';

export type OrgMemberOption = {
  id: string;
  email: string;
  name: string;
};

export async function getOrgMembersForTasks() {
  const { getOrgMembersForTasks: serverFn } = await import('@/_actions/projects-tasks');
  return desktopBridge(() => tauriProjectsGetOrgMembersForTasks(), () => serverFn());
}

export async function createProject(data: Record<string, unknown>) {
  const { createProject: serverFn } = await import('@/_actions/projects-tasks');
  return desktopBridge(() => tauriProjectsCreateProject(data), () => serverFn(data as never));
}

export async function getProject(projectId: string) {
  const { getProject: serverFn } = await import('@/_actions/projects-tasks');
  return desktopBridge(() => tauriProjectsGetProject(projectId), () => serverFn(projectId));
}

export async function getProjectsByOrg(orgId: string) {
  const { getProjectsByOrg: serverFn } = await import('@/_actions/projects-tasks');
  return desktopBridge(() => tauriProjectsGetProjectsByOrg(orgId), () => serverFn(orgId));
}

export async function getProjectsForCurrentOrg(limit = 200) {
  const { getProjectsForCurrentOrg: serverFn } = await import('@/_actions/projects-tasks');
  return desktopBridge(() => tauriProjectsGetProjectsForCurrentOrg(limit), () => serverFn(limit));
}

export async function getProjectsByStatus(orgId: string, status: string) {
  const { getProjectsByStatus: serverFn } = await import('@/_actions/projects-tasks');
  return desktopBridge(() => tauriProjectsGetProjectsByStatus({ orgId, status }), () => serverFn(orgId, status as never));
}

export async function updateProject(projectId: string, data: Record<string, unknown>) {
  const { updateProject: serverFn } = await import('@/_actions/projects-tasks');
  return desktopBridge(() => tauriProjectsUpdateProject(projectId, data), () => serverFn(projectId, data as never));
}

export async function addMemberToProject(projectId: string, userId: string) {
  const { addMemberToProject: serverFn } = await import('@/_actions/projects-tasks');
  return desktopBridge(() => tauriProjectsAddMemberToProject({ projectId, userId }), () => serverFn(projectId, userId));
}

export async function deleteProject(projectId: string) {
  if (isTauriBackendAvailable()) {
    const res = await tauriProjectsDeleteProject(projectId);
    if (res.success && res.data) return { success: true as const };
    return { success: false as const, error: res.error ?? 'Failed to delete project' };
  }
  const { deleteProject: serverFn } = await import('@/_actions/projects-tasks');
  return serverFn(projectId);
}

export async function createTask(data: Record<string, unknown>) {
  const { createTask: serverFn } = await import('@/_actions/projects-tasks');
  return desktopBridge(() => tauriProjectsCreateTask(data), () => serverFn(data as never));
}

export async function getTask(taskId: string) {
  const { getTask: serverFn } = await import('@/_actions/projects-tasks');
  return desktopBridge(() => tauriProjectsGetTask(taskId), () => serverFn(taskId));
}

export async function getTasksByProject(projectId: string) {
  const { getTasksByProject: serverFn } = await import('@/_actions/projects-tasks');
  return desktopBridge(() => tauriProjectsGetTasksByProject(projectId), () => serverFn(projectId));
}

export async function getTasksByOrg(orgId: string) {
  const { getTasksByOrg: serverFn } = await import('@/_actions/projects-tasks');
  return desktopBridge(() => tauriProjectsGetTasksByOrg(orgId), () => serverFn(orgId));
}

export async function getTasksForCurrentOrg(limit = 300) {
  const { getTasksForCurrentOrg: serverFn } = await import('@/_actions/projects-tasks');
  return desktopBridge(() => tauriProjectsGetTasksForCurrentOrg(limit), () => serverFn(limit));
}

export async function getTasksByAssigned(userId: string) {
  const { getTasksByAssigned: serverFn } = await import('@/_actions/projects-tasks');
  return desktopBridge(() => tauriProjectsGetTasksByAssigned(userId), () => serverFn(userId));
}

export async function getTasksByStatus(orgId: string, status: string) {
  const { getTasksByStatus: serverFn } = await import('@/_actions/projects-tasks');
  return desktopBridge(() => tauriProjectsGetTasksByStatus({ orgId, status }), () => serverFn(orgId, status as never));
}

export async function updateTask(taskId: string, data: Record<string, unknown>) {
  const { updateTask: serverFn } = await import('@/_actions/projects-tasks');
  return desktopBridge(() => tauriProjectsUpdateTask(taskId, data), () => serverFn(taskId, data as never));
}

export async function deleteTask(taskId: string) {
  if (isTauriBackendAvailable()) {
    const res = await tauriProjectsDeleteTask(taskId);
    if (res.success && res.data) return { success: true as const };
    return { success: false as const, error: res.error ?? 'Failed to delete task' };
  }
  const { deleteTask: serverFn } = await import('@/_actions/projects-tasks');
  return serverFn(taskId);
}

export async function getWorkBoardConfig() {
  const { getWorkBoardConfig: serverFn } = await import('@/_actions/projects-tasks');
  return desktopBridge(() => tauriProjectsGetWorkBoardConfig(), () => serverFn());
}

export async function saveWorkBoardConfig(config: WorkBoardConfig) {
  const { saveWorkBoardConfig: serverFn } = await import('@/_actions/projects-tasks');
  return desktopBridge(
    () => tauriProjectsSaveWorkBoardConfig(config as unknown as Record<string, unknown>),
    () => serverFn(config)
  );
}

export async function migrateTaskStatuses(fromStatus: string, toStatus: string) {
  const { migrateTaskStatuses: serverFn } = await import('@/_actions/projects-tasks');
  return desktopBridge(
    () => tauriProjectsMigrateTaskStatuses({ fromStatus, toStatus }),
    () => serverFn(fromStatus, toStatus)
  );
}

export async function migrateProjectStatuses(fromStatus: string, toStatus: string) {
  const { migrateProjectStatuses: serverFn } = await import('@/_actions/projects-tasks');
  return desktopBridge(
    () => tauriProjectsMigrateProjectStatuses({ fromStatus, toStatus }),
    () => serverFn(fromStatus, toStatus)
  );
}
