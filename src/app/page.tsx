import { Metadata } from 'next';
import HomeRedirect from '@/components/HomeRedirect';
import { isDesktopBuild } from '@/lib/runtime-env';

export default async function MarketingPage() {
  if (isDesktopBuild) {
    return <HomeRedirect />;
  }
  const { runWebHomeRedirect } = await import('./web-home-redirect');
  await runWebHomeRedirect();
}

export const metadata: Metadata = {
  title: {default: 'About',template: "%s | Thinking Minds"},
  keywords: ['Thinking Minds','Talent Chikamhi','Community','Software Development', 'Web Development', 'Desktop Applications', 'Penetration Testing', 'Cybersecurity'],
  authors: [{ name: 'Talent Chikamhi', url: 'https://thinkingminds.co.zw' }],
  creator: 'Thinking Minds',
  openGraph: {
    title: 'About',
    description: 'We are the Thinking Minds. We\'re driven by a relentless pursuit of efficiency and security in software development. Our well focused team develops intuitive and scalable desktop and web-based solutions that empower our clients to achieve their goals and realize their vision. We\'re a team of visionary software developers and pen-testers united by a passion for creating cutting-edge applications. We are dedicated to helping businesses and individuals succeed in a rapidly evolving digital landscape.',
    url: 'https://thinkingminds.co.zw',
    siteName: 'Thinking Minds',
    images: [
      {
        url: 'https://thinkingminds.co.zw/minds2.png',
        width: 1200,
        height: 630,
        alt: 'Community Logo',
      },
    ],
    locale: 'en_ZW',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'About',
    description: 'We are the Thinking Minds. We\'re driven by a relentless pursuit of efficiency and security in software development. Our well focused team develops intuitive and scalable desktop and web-based solutions that empower our clients to achieve their goals and realize their vision. We\'re a team of visionary software developers and pen-testers united by a passion for creating cutting-edge applications. We are dedicated to helping businesses and individuals succeed in a rapidly evolving digital landscape.',
    images: 'https://thinkingminds.co.zw/minds2.png',
    creator: '@thinkingmindszw',
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    noimageindex: false,
    noarchive: false,
    nosnippet: false,
  },      
  description: "We are the Thinking Minds. We're driven by a relentless pursuit of efficiency and security in software development. Our well focused team develops intuitive and scalable desktop and web-based solutions that empower our clients to achieve their goals and realize their vision. We're a team of visionary software developers and pen-testers united by a passion for creating cutting-edge applications.We are dedicated to helping businesses and individuals succeed in a rapidly evolving digital landscape.",
}
