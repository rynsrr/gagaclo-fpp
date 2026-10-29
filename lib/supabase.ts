import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Public browser credentials; database access is enforced by Corporate RLS policies.
const corporateUrl = 'https://xtkjzqeqotewaggjfnzr.supabase.co';
const supabaseUrl = corporateUrl;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_URL === corporateUrl
  ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_R0UVw4tSyvLWu0muMjOSYA_BNqKWyEv'
  : 'sb_publishable_R0UVw4tSyvLWu0muMjOSYA_BNqKWyEv';

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith('https://') &&
    !supabaseUrl.includes('placeholder')
  );
};

export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
