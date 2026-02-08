import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let browserSupabaseClient: SupabaseClient | null = null;

function isPlaceholderValue(value: string): boolean {
  return (
    value.includes('your-project-ref') ||
    value.includes('your-project.supabase.co') ||
    value.includes('your-supabase-anon-key')
  );
}

export function getSupabaseClient(): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  if (isPlaceholderValue(SUPABASE_URL) || isPlaceholderValue(SUPABASE_ANON_KEY)) {
    throw new Error(
      'Supabase frontend env is using placeholder values. Update NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in frontend/.env.local.'
    );
  }

  if (!browserSupabaseClient) {
    browserSupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }

  return browserSupabaseClient;
}
