import { isTauriBackendAvailable } from '@/lib/desktop/runtime';

/** Run Tauri invoke or server action with matching return typing. */
export async function desktopBridge<T>(
  tauri: () => Promise<unknown>,
  server: () => Promise<T>
): Promise<T> {
  if (isTauriBackendAvailable()) {
    return (await tauri()) as T;
  }
  return server();
}
