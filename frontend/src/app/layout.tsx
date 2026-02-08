import type { Metadata } from 'next';
import { Manrope, IBM_Plex_Mono } from 'next/font/google';
import { AppBillingRoot } from '@/contexts/AppBillingContext';
import { TokenProvider } from '@/contexts/TokenContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AppHeader } from '@/components/AppHeader';
import './globals.css';

const manrope = Manrope({
  variable: '--font-sans',
  subsets: ['latin'],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  weight: ['400', '500'],
});

export const metadata: Metadata = {
  title: 'Handi',
  description: 'Modular AI-powered blocks with entitlement-based access and Flowglad billing',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var d=document.documentElement,s=localStorage.getItem('ai-block-marketplace-theme')||'dark';if(s==='system'){s=window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'}d.classList.add(s)}catch(e){d.classList.add('dark')}})()`,
          }}
        />
      </head>
      <body className={`${manrope.variable} ${ibmPlexMono.variable} antialiased min-h-screen font-sans bg-app text-app-fg`}>
        <ThemeProvider>
          <TokenProvider>
            <AppBillingRoot>
              <div className="relative flex min-h-screen flex-col">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(59,130,246,0.2),transparent_35%),radial-gradient(circle_at_85%_80%,rgba(14,165,233,0.14),transparent_30%)]" />
                <div className="relative flex min-h-screen flex-col">
                  <AppHeader />
                  <main className="flex min-h-0 flex-1 flex-col">{children}</main>
                </div>
              </div>
            </AppBillingRoot>
          </TokenProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
