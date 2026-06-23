/**
 * User profile API — Rust/Tauri when available, Next server actions otherwise.
 */
import { desktopBridge } from '@/lib/desktop/bridge-utils';
import {
  tauriUserProfileGetCurrent,
  tauriUserProfileUpdateCurrent,
  tauriUserProfileGetDisplayName,
} from '@/lib/desktop/user-profile';

export type UserProfileInput = {
  firstName: string;
  lastName: string;
  username?: string;
  phone?: string;
  imageUrl?: string;
};

export type UserProfileData = UserProfileInput & {
  id: string;
  email: string;
  role?: string;
  companyId?: string;
  companyName?: string;
};

export async function getCurrentUserProfile() {
  const { getCurrentUserProfile: serverFn } = await import('@/_actions/user-profile');
  return desktopBridge(() => tauriUserProfileGetCurrent(), () => serverFn());
}

export async function updateCurrentUserProfile(input: UserProfileInput) {
  const { updateCurrentUserProfile: serverFn } = await import('@/_actions/user-profile');
  return desktopBridge(() => tauriUserProfileUpdateCurrent(input), () => serverFn(input));
}

export async function getProfileDisplayName() {
  const { getProfileDisplayName: serverFn } = await import('@/_actions/user-profile');
  return desktopBridge(() => tauriUserProfileGetDisplayName(), () => serverFn());
}
