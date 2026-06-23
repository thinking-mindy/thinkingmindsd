"use client";

import React from "react";
import {
  clearOfflineClientSession,
  notifyOfflineAuthChanged,
  OFFLINE_AUTH_CHANGED_EVENT,
  writeOfflineClientSession,
} from "@/lib/offline/client-session";
import { getCurrentSessionUser, getCurrentUser } from "@/lib/desktop/auth-bridge";
import type { SessionUser } from '@/lib/auth/types';

export type { SessionUser } from '@/lib/auth/types';

type AuthContextValue = {
  isLoaded: boolean;
  isSignedIn: boolean;
  user: SessionUser | null;
};

const defaultCtx: AuthContextValue = {
  isLoaded: false,
  isSignedIn: false,
  user: null,
};

const AuthContext = React.createContext<AuthContextValue>(defaultCtx);

async function resolveAuthContext(): Promise<AuthContextValue> {
  const sessionUser = await getCurrentSessionUser();
  if (sessionUser) {
    const u = await getCurrentUser();
    if (u) writeOfflineClientSession(u);
    return {
      isLoaded: true,
      isSignedIn: true,
      user: sessionUser,
    };
  }
  clearOfflineClientSession();
  return { isLoaded: true, isSignedIn: false, user: null };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ctx, setCtx] = React.useState<AuthContextValue>(defaultCtx);

  React.useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      const next = await resolveAuthContext();
      if (!cancelled) setCtx(next);
    };

    refresh();
    window.addEventListener(OFFLINE_AUTH_CHANGED_EVENT, refresh);
    return () => {
      cancelled = true;
      window.removeEventListener(OFFLINE_AUTH_CHANGED_EVENT, refresh);
    };
  }, []);

  return <AuthContext.Provider value={ctx}>{children}</AuthContext.Provider>;
}

export function useUser() {
  const ctx = React.useContext(AuthContext);
  const reload = React.useCallback(async () => {
    notifyOfflineAuthChanged();
    await new Promise((r) => setTimeout(r, 0));
  }, []);

  const user = React.useMemo(
    () => (ctx.user ? ({ ...ctx.user, reload } satisfies SessionUser) : null),
    [ctx.user, reload]
  );

  return {
    isLoaded: ctx.isLoaded,
    isSignedIn: ctx.isSignedIn,
    user,
    reload,
  };
}

export function useAuth() {
  const { isLoaded, isSignedIn, user } = useUser();
  return {
    isLoaded,
    isSignedIn,
    userId: user?.id ?? null,
    sessionId: isSignedIn ? 'local-session' : null,
  };
}
