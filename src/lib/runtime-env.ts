/** Shared runtime environment helpers (safe on server and client bundles). */

export const isProduction = process.env.NODE_ENV === 'production';

export const isDevelopment = process.env.NODE_ENV === 'development';

/** Desktop / Tauri offline build — local secrets API is expected. */
export const isDesktopBuild = process.env.TAURI_BUILD === '1' || process.env.NEXT_PUBLIC_TAURI === '1';

/** Running inside the Tauri desktop shell (static UI + Rust backend). */
export const isDesktopRuntime = process.env.NEXT_PUBLIC_TAURI === '1' || isDesktopBuild;
