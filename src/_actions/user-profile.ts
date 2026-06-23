/** Auto-generated desktop stub for user-profile.ts */
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

export async function getCurrentUserProfile(..._args: unknown[]) {
  return { success: false as const, error: 'Desktop app: getCurrentUserProfile is not available until this module is migrated to Rust.' };
}

export async function updateCurrentUserProfile(..._args: unknown[]) {
  return { success: false as const, error: 'Desktop app: updateCurrentUserProfile is not available until this module is migrated to Rust.' };
}

export async function getProfileDisplayName(..._args: unknown[]) {
  return { success: false as const, error: 'Desktop app: getProfileDisplayName is not available until this module is migrated to Rust.' };
}
