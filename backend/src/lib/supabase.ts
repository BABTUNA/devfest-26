import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('[Supabase] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
}

/**
 * Supabase client with service role key for server-side operations.
 * This bypasses RLS and should be used carefully.
 */
export const supabase: SupabaseClient = createClient(
  SUPABASE_URL || '',
  SUPABASE_SERVICE_ROLE_KEY || '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

/**
 * Create a Supabase client scoped to a specific user's JWT.
 * This respects RLS policies and is the preferred way to interact with the database.
 * 
 * @param accessToken - User's JWT from Supabase auth
 */
export function createUserClient(accessToken: string): SupabaseClient {
  return createClient(
    SUPABASE_URL || '',
    SUPABASE_SERVICE_ROLE_KEY || '',
    {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

// Database types
export interface User {
  id: string;
  name: string;
  created_at: string;
}

export interface Workflow {
  id: string;
  owner_user_id: string;
  name: string;
  description: string | null;
  includes: string[];
  definition: Record<string, any>;
  created_at: string;
  updated_at: string;
}
