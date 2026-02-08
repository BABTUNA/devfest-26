import type { Metadata } from 'next';
import { AppBillingRoot } from '@/contexts/AppBillingContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AppHeader } from '@/components/AppHeader';
import './globals.css';

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
    <html lang="en" className="dark">
      <body className="antialiased min-h-screen font-sans bg-app text-app-fg">
        <ThemeProvider>
          <AuthProvider>
            <AppBillingRoot>
              <div className="relative flex min-h-screen flex-col">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(59,130,246,0.2),transparent_35%),radial-gradient(circle_at_85%_80%,rgba(14,165,233,0.14),transparent_30%)]" />
                <div className="relative flex min-h-screen flex-col">
                  <AppHeader />
                  <main className="flex min-h-0 flex-1 flex-col">{children}</main>
                </div>
              </div>
            </AppBillingRoot>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
