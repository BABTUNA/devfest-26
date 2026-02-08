'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, type FormEvent, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

function getSafeNextPath(nextParam: string | null): string {
  if (!nextParam || !nextParam.startsWith('/')) {
    return '/marketplace';
  }

  return nextParam;
}

function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { ready, isAuthenticated, signUp, authError } = useAuth();

  const nextPath = useMemo(() => getSafeNextPath(searchParams.get('next')), [searchParams]);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmationNote, setConfirmationNote] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!ready || !isAuthenticated) return;
    router.replace(nextPath);
  }, [ready, isAuthenticated, nextPath, router]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setFormError(null);
    setConfirmationNote(null);

    try {
      const result = await signUp(email, password, name.trim() || undefined);
      if (result.requiresEmailVerification) {
        setConfirmationNote('Signup succeeded. Please verify your email, then sign in.');
      } else {
        router.replace(nextPath);
      }
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Signup failed');
    } finally {
      setSubmitting(false);
    }
  };

  const loginHref = nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : '/login';

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 py-10 md:px-6">
      <div className="rounded-2xl border border-app bg-app-surface/75 p-6 md:p-7">
        <h1 className="text-2xl font-semibold tracking-tight text-app-fg">Create account</h1>
        <p className="mt-1 text-sm text-app-soft">Sign up with Supabase to unlock personalized entitlements and billing.</p>

        <form onSubmit={onSubmit} className="mt-5 space-y-3">
          <label className="block text-sm text-app-soft">
            Name
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
              className="mt-1 w-full rounded-lg border border-app bg-app px-3 py-2 text-sm text-app-fg placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
              placeholder="Your name"
            />
          </label>

          <label className="block text-sm text-app-soft">
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
              className="mt-1 w-full rounded-lg border border-app bg-app px-3 py-2 text-sm text-app-fg placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
              placeholder="you@example.com"
            />
          </label>

          <label className="block text-sm text-app-soft">
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              className="mt-1 w-full rounded-lg border border-app bg-app px-3 py-2 text-sm text-app-fg placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
              placeholder="At least 6 characters"
            />
          </label>

          {(formError || authError) && (
            <p className="rounded-lg border border-rose-500/35 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
              {formError ?? authError}
            </p>
          )}

          {confirmationNote && (
            <p className="rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
              {confirmationNote}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? 'Creating account...' : 'Sign up'}
          </button>
        </form>

        <p className="mt-4 text-sm text-app-soft">
          Already have an account?
          {' '}
          <Link href={loginHref} className="text-blue-300 hover:text-blue-200">
            Sign in
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="mx-auto w-full max-w-md flex-1 px-4 py-10 text-sm text-app-soft md:px-6">Loading signup...</div>}>
      <SignupContent />
    </Suspense>
  );
}
