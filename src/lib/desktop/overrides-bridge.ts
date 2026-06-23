/**
 * Overrides API — Rust/Tauri when available, Next server actions otherwise.
 */
import { desktopBridge } from '@/lib/desktop/bridge-utils';
import {
  tauriOverridesEnsureProject,
  tauriOverridesListFiles,
  tauriOverridesGetFile,
  tauriOverridesUpsertFile,
  tauriOverridesDeleteFile,
  tauriOverridesResolveOrDefault,
  tauriOverridesRunShellCommand,
} from '@/lib/desktop/overrides';

export async function ensureOverridesProject() {
  const { ensureOverridesProject: serverFn } = await import('@/_actions/overrides');
  return desktopBridge(() => tauriOverridesEnsureProject(), serverFn);
}

export async function listOverrideFiles() {
  const { listOverrideFiles: serverFn } = await import('@/_actions/overrides');
  return desktopBridge(() => tauriOverridesListFiles(), serverFn);
}

export async function getOverrideFile(path: string) {
  const { getOverrideFile: serverFn } = await import('@/_actions/overrides');
  return desktopBridge(() => tauriOverridesGetFile(path), () => serverFn(path));
}

export async function upsertOverrideFile(input: {
  path: string;
  content: string;
  contentType?: string;
}) {
  const { upsertOverrideFile: serverFn } = await import('@/_actions/overrides');
  return desktopBridge(() => tauriOverridesUpsertFile(input), () => serverFn(input));
}

export async function deleteOverrideFile(path: string) {
  const { deleteOverrideFile: serverFn } = await import('@/_actions/overrides');
  return desktopBridge(() => tauriOverridesDeleteFile(path), () => serverFn(path));
}

export async function resolveOverrideOrDefault(path: string, defaultContent: string) {
  const { resolveOverrideOrDefault: serverFn } = await import('@/_actions/overrides');
  return desktopBridge(
    () => tauriOverridesResolveOrDefault(path, defaultContent),
    () => serverFn(path, defaultContent)
  );
}

export async function runCompanyShellCommand(input: string) {
  const { runCompanyShellCommand: serverFn } = await import('@/_actions/overrides-terminal');
  return desktopBridge(() => tauriOverridesRunShellCommand(input), () => serverFn(input));
}
