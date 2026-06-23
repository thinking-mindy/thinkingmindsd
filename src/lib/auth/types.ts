/** Legacy user document shape stored in local `users` collection. */
export type UserJSON = {
  id: string;
  private_metadata?: { companyName?: string; companyId?: string; [key: string]: unknown };
  public_metadata?: Record<string, unknown>;
  [key: string]: unknown;
};

export type SessionPublicMetadata = {
  role?: string;
  companyId?: string;
  companyName?: string;
  companyOwnerId?: string;
  pendingCompanyId?: string;
  pendingCompanyName?: string;
  allowedModules?: string[];
  onCompleteSetup?: boolean;
  imageUrl?: string;
  username?: string;
  phone?: string;
  dep?: string;
  joinRequestId?: string;
  [key: string]: unknown;
};

export type SessionUser = {
  id: string;
  email?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  imageUrl?: string;
  emailAddresses?: Array<{ emailAddress: string }>;
  primaryEmailAddress?: { emailAddress: string };
  publicMetadata?: SessionPublicMetadata;
  privateMetadata?: Record<string, unknown>;
  /** Refresh session user from storage (Clerk-compat for setup flows). */
  reload?: () => Promise<void>;
};
