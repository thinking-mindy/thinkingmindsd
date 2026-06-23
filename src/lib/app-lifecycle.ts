import { isTauriDesktop } from '@/lib/desktop/runtime';

/** Close the desktop window or best-effort browser tab. */
export async function quitApplication(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (isTauriDesktop()) {
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    await getCurrentWindow().close();
    return;
  }
  window.close();
}
