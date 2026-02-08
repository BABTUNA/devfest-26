import { type AuthError, type Session, type User } from '@supabase/supabase-js';
import { getSupabaseClient } from './supabase';

let inMemoryAccessToken: string | null = null;
let inMemoryUser: User | null = null;

function mapAuthError(error: AuthError): Error {
  const message = error.message.toLowerCase();
  if (message.includes('invalid login credentials')) {
    return new Error('Invalid email or password');
  }

  if (message.includes('email not confirmed')) {
    return new Error('Email is not confirmed yet');
  }

  if (message.includes('rate limit') || error.status === 429) {
    return new Error('Supabase auth is rate limited right now. Please retry shortly.');
  }

  return new Error(error.message);
}

function updateInMemorySession(session: Session | null): Session | null {
  inMemoryAccessToken = session?.access_token ?? null;
  inMemoryUser = session?.user ?? null;
  return session;
}

export function handleSessionChange(session: Session | null): void {
  updateInMemorySession(session);
}

export async function getSession(): Promise<Session | null> {
  const supabase = getSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return updateInMemorySession(session);
}

export async function getAccessToken(): Promise<string | null> {
  const session = await getSession();
  return session?.access_token ?? inMemoryAccessToken;
}

export async function getCurrentUser(): Promise<User | null> {
  const session = await getSession();
  return session?.user ?? inMemoryUser;
}

export async function signInWithPassword(email: string, password: string): Promise<Session> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    throw mapAuthError(error);
  }

  const session = updateInMemorySession(data.session ?? null);
  if (!session) {
    throw new Error('No session returned from sign in');
  }

  return session;
}

export async function signUpWithPassword(
  email: string,
  password: string,
  name?: string
): Promise<{ session: Session | null; user: User | null; requiresEmailVerification: boolean }> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: name ? { data: { name } } : undefined,
  });

  if (error) {
    throw mapAuthError(error);
  }

  const session = updateInMemorySession(data.session ?? null);
  const user = data.user ?? null;

  return {
    session,
    user,
    requiresEmailVerification: !session,
  };
}

export async function signOut(): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new Error(error.message);
  }
  updateInMemorySession(null);
}

export async function refreshAccessToken(): Promise<string | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.refreshSession();
  if (error) {
    throw mapAuthError(error);
  }

  const session = updateInMemorySession(data.session ?? null);
  return session?.access_token ?? null;
}
