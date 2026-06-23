import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { userFromRequestCookie } from '@/lib/auth-cookie';

const PUBLIC_PATHS = new Set([
  '/sign-in',
  '/sign-up',
  '/about',
]);

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  if (pathname.startsWith('/sign-in/')) return true;
  if (pathname.startsWith('/api/webhooks')) return true;
  return false;
}

function isStaticAsset(pathname: string): boolean {
  return /\.(?:ico|png|jpg|jpeg|gif|svg|webp|css|js|woff2?|ttf|map)$/i.test(pathname);
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isStaticAsset(pathname) || pathname.startsWith('/_next')) {
    return NextResponse.next();
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const user = userFromRequestCookie(req);

  if (!user?.id) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }
    const signIn = req.nextUrl.clone();
    signIn.pathname = '/sign-in';
    signIn.searchParams.set('redirect_url', pathname);
    return NextResponse.redirect(signIn);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
