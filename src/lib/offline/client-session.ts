"use client";

import type { OfflineUser } from "@/lib/offline/auth";
import {
  clearOfflineProfileCookie,
  setOfflineProfileCookie,
} from "@/lib/offline/set-offline-profile-cookie";

export const OFFLINE_AUTH_CHANGED_EVENT = "offline-auth-changed";

/** Drop browser session artifacts for the signed-in user (not registered accounts). */
export function clearOfflineClientSession(): void {
  try {
    sessionStorage.removeItem("offline_user");
  } catch {
    /* ignore */
  }
  clearOfflineProfileCookie();
  if (typeof document !== "undefined") {
    document.cookie = "offline_session=; path=/; max-age=0; samesite=lax";
  }
}

/** Write session artifacts without broadcasting (used when syncing from storage). */
export function writeOfflineClientSession(user: OfflineUser): void {
  try {
    sessionStorage.setItem("offline_user", JSON.stringify(user));
  } catch {
    /* ignore */
  }
  if (typeof document !== "undefined") {
    document.cookie = "offline_session=1; path=/; max-age=86400; samesite=lax";
  }
  setOfflineProfileCookie(user);
}

/** Persist who is signed in and notify listeners (login / profile save). */
export function persistOfflineClientSession(user: OfflineUser): void {
  writeOfflineClientSession(user);
  notifyOfflineAuthChanged();
}

/** Tell AuthProvider and other listeners to reload the active session. */
export function notifyOfflineAuthChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(OFFLINE_AUTH_CHANGED_EVENT));
}
