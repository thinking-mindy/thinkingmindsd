import 'server-only';

import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/server';
import { getUserFromCookies } from '@/lib/auth-cookie';

export async function runWebHomeRedirect(): Promise<never> {
  const cookieUser = await getUserFromCookies();
  const { userId } = await auth();
  if (cookieUser?.id || userId) {
    redirect('/dashboard');
  }
  redirect('/sign-in');
}
