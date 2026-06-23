import 'server-only';

import { currentUser } from '@/lib/auth/server';

export async function requireCompanyId(): Promise<string> {
  const user = await currentUser();
  const companyId = user?.publicMetadata?.companyId as string | undefined;
  if (!companyId) {
    throw new Error('Missing companyId in user publicMetadata');
  }
  return companyId;
}

