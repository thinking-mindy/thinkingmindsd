"use client";

import type { OfflineUser } from "@/lib/offline/auth";
import {
  OFFLINE_PROFILE_COOKIE,
  profilePayloadFromOfflineUser,
  serializeOfflineProfileCookie,
} from "@/lib/offline/offline-profile";

const MAX_AGE = 86400;

/** Persist who is logged in so server components (layout, actions) see the same user. */
export function setOfflineProfileCookie(user: OfflineUser): void {
  const payload = profilePayloadFromOfflineUser(user);
  document.cookie = `${OFFLINE_PROFILE_COOKIE}=${serializeOfflineProfileCookie(payload)}; path=/; max-age=${MAX_AGE}; samesite=lax`;
}

export function clearOfflineProfileCookie(): void {
  document.cookie = `${OFFLINE_PROFILE_COOKIE}=; path=/; max-age=0`;
}
