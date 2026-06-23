'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/lib/auth/client';

/** Client-side `/` redirect for static Tauri export (no server cookies). */
export default function HomeRedirect() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();

  useEffect(() => {
    if (!isLoaded) return;
    router.replace(isSignedIn ? '/dashboard' : '/sign-in');
  }, [isLoaded, isSignedIn, router]);

  return null;
}
