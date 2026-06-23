/** Set at build time for static Tauri exports (`NEXT_PUBLIC_TAURI=1`). */
export const isTauriDesktopBuild = process.env.NEXT_PUBLIC_TAURI === '1';

/** True when running inside the Tauri desktop shell. */
export function isTauriDesktop(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean((window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__);
}

/** Rust/Tauri backend — build flag or live webview detection. */
export function isTauriBackendAvailable(): boolean {
  if (isTauriDesktopBuild) return true;
  return isTauriDesktop();
}
