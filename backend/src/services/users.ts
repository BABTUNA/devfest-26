import { supabase, User } from '../lib/supabase.js';

/**
 * Get current user's profile from public.users table.
 * 
 * @param userId - The auth user ID
 */
export async function getCurrentUserProfile(userId: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('[Users] Error fetching profile:', error);
    throw new Error(`Failed to fetch user profile: ${error.message}`);
  }

  return data;
}

/**
 * Update user profile.
 * Only allows updating the name field.
 * 
 * @param userId - The auth user ID
 * @param updates - Profile fields to update
 */
export async function updateProfile(
  userId: string,
  updates: { name?: string }
): Promise<User> {
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    console.error('[Users] Error updating profile:', error);
    throw new Error(`Failed to update user profile: ${error.message}`);
  }

  return data;
}
