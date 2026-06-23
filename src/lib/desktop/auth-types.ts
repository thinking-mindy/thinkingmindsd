export type TauriOfflineUserSafe = {
  id: string;
  username?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  companyId?: string;
  metadata?: Record<string, unknown>;
  createdAt: number;
};

export type TauriAuthLoginResponse = {
  user: TauriOfflineUserSafe;
  sessionUser: Record<string, unknown>;
};

export type TauriPublicProfile = {
  id: string;
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  companyId?: string;
  companyName?: string;
  displayName: string;
  initials: string;
  loginIdentifier: string;
};

export type TauriCompanyOption = {
  id: string;
  name: string;
  createdByUserId: string;
};
