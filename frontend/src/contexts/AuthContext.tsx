'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import {
  getAccessToken,
  getCurrentUser,
  getSession,
  handleSessionChange,
  refreshAccessToken,
  signInWithPassword,
  signOut as signOutAuth,
  signUpWithPassword,
} from '@/lib/auth';
import { getSupabaseClient } from '@/lib/supabase';

type AuthContextValue = {
  ready: boolean;
  user: User | null;
  isAuthenticated: boolean;
  authError?: string;
  getToken: () => Promise<string | null>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name?: string) => Promise<{ requiresEmailVerification: boolean }>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<string | null>;
};

const AuthContext = createContext<AuthContextValue>({
  ready: false,
  user: null,
  isAuthenticated: false,
  getToken: getAccessToken,
  signIn: async () => {},
  signUp: async () => ({ requiresEmailVerification: false }),
  signOut: async () => {},
  refreshSession: async () => null,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authError, setAuthError] = useState<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    let cleanupSubscription: { unsubscribe: () => void } | undefined;

    const initialize = async () => {
      let supabase: SupabaseClient;
      try {
        supabase = getSupabaseClient();
      } catch (error) {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : 'Supabase client init failed';
          setAuthError(message);
          setReady(true);
        }
        return;
      }

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        handleSessionChange(session);
        setUser(session?.user ?? null);
      });
      cleanupSubscription = subscription;

      try {
        const session = await getSession();
        if (!cancelled) {
          setUser(session?.user ?? null);
          setAuthError(undefined);
        }
      } catch (error) {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : 'Supabase session restore failed';
          setAuthError(message);
        }
      } finally {
        if (!cancelled) {
          setReady(true);
        }
      }
    };

    void initialize();

    return () => {
      cancelled = true;
      cleanupSubscription?.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const session = await signInWithPassword(email, password);
    setUser(session.user);
    setAuthError(undefined);
  }, []);

  const signUp = useCallback(async (email: string, password: string, name?: string) => {
    const result = await signUpWithPassword(email, password, name);
    setUser(result.session?.user ?? null);
    setAuthError(undefined);
    return { requiresEmailVerification: result.requiresEmailVerification };
  }, []);

  const signOut = useCallback(async () => {
    await signOutAuth();
    setUser(null);
    setAuthError(undefined);
  }, []);

  const refreshSession = useCallback(async () => {
    const token = await refreshAccessToken();
    const currentUser = await getCurrentUser();
    setUser(currentUser);
    return token;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ready,
      user,
      isAuthenticated: Boolean(user),
      authError,
      getToken: getAccessToken,
      signIn,
      signUp,
      signOut,
      refreshSession,
    }),
    [ready, user, authError, signIn, signUp, signOut, refreshSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
