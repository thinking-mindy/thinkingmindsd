import { isDesktopRuntime, isProduction } from '@/lib/runtime-env';

/**
 * Default offline encryption passphrase for Thinking Minds desktop builds.
 * Used when NEXT_PUBLIC_OFFLINE_LOGIN_SECRET is not baked into the client bundle.
 */
export const MINDS_DEFAULT_OFFLINE_LOGIN_SECRET =
  'thinkingminds-minds-offline-login-v1';

export function getOfflineLoginSecret(): string {
  const fromEnv = process.env.NEXT_PUBLIC_OFFLINE_LOGIN_SECRET?.trim();
  if (fromEnv) return fromEnv;

  if (isDesktopRuntime) {
    return MINDS_DEFAULT_OFFLINE_LOGIN_SECRET;
  }

  if (isProduction) {
    return MINDS_DEFAULT_OFFLINE_LOGIN_SECRET;
  }

  return 'dev-only-offline-login-secret';
}
