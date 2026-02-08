'use client';

import { useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

type RequireAuthProps = {
  children: ReactNode;
  redirectTo?: string;
};

export function RequireAuth({ children, redirectTo = '/login' }: RequireAuthProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { ready, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!ready || isAuthenticated) return;
    const nextParam = pathname ? `?next=${encodeURIComponent(pathname)}` : '';
    router.replace(`${redirectTo}${nextParam}`);
  }, [ready, isAuthenticated, pathname, redirectTo, router]);

  if (!ready) {
    return <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 text-sm text-app-soft md:px-6">Checking authentication...</div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 md:px-6">
        <p className="text-sm text-app-soft">
          Redirecting to sign in. If you are not redirected,
          {' '}
          <Link href={redirectTo} className="text-blue-300 hover:text-blue-200">
            open login
          </Link>
          .
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
