import * as React from 'react';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import CssBaseline from '@mui/material/CssBaseline';
import AppTheme from '@/shared-theme/AppTheme';
import { AuthProvider } from '@/lib/auth/client';
import { APP_BASE_URL } from '@/lib/app-config';
import type { Metadata } from "next";
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

const siteUrl = APP_BASE_URL;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Thinking Minds",
  description: "Auth with email + password",
};

export default function MainLayout({ children }: { children: React.ReactNode }) {

    return (
        <html lang="en" suppressHydrationWarning className={inter.className}>
            <body>
                <AuthProvider>
                <AppRouterCacheProvider options={{ enableCssLayer: true }}>
                    <AppTheme>
                        <CssBaseline />
                        {children}
                    </AppTheme>
                </AppRouterCacheProvider>
                </AuthProvider>
            </body>
        </html>
    )
}
