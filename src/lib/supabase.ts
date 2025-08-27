// src/lib/supabase.ts
// ⚡ Lazy Supabase client so first paint isn't blocked.
//    Use:  const supabase = await getSupabase();

import type { SupabaseClient } from '@supabase/supabase-js';

let _clientPromise: Promise<SupabaseClient> | null = null;

/** Create (once) and return the Supabase client */
export async function getSupabase(): Promise<SupabaseClient> {
  if (_clientPromise) return _clientPromise;

  _clientPromise = (async () => {
    const { createClient } = await import('@supabase/supabase-js');

    // Vite exposes only VITE_* on the client
    const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
    const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

    if (!url || !anon) {
      throw new Error(
        'Missing Supabase env vars. Define VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env and on Netlify.'
      );
    }

    return createClient(url, anon, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    });
  })();

  return _clientPromise;
}

/* =============================================================================
   Types (adjust to your schema if needed)
   ========================================================================== */

export interface Profile {
  id: string;                  // profiles.id (uuid)
  auth_user_id: string | null; // FK to auth.users.id
  email: string;
  name: string;
  is_admin: boolean;
  language: string | null;
  created_at?: string;
  updated_at?: string;
}

/* =============================================================================
   Auth helpers (use the lazy client internally)
   ========================================================================== */

/**
 * Register with email/password and upsert a profile row linked via auth_user_id.
 * Returns true/false for convenience; log errors in your UI as needed.
 */
export async function register(email: string, password: string, name: string): Promise<boolean> {
  const supabase = await getSupabase();

  const { data: auth, error: signErr } = await supabase.auth.signUp({ email, password });
  if (signErr) return false;

  const user = auth.user;
  if (!user) return false;

  // Create or update the profile record linked to this auth user
  const { error: upsertErr } = await supabase
    .from('profiles')
    .upsert(
      {
        auth_user_id: user.id,
        email,
        name,
        is_admin: false,
        language: 'en',
      },
      { onConflict: 'auth_user_id' } // requires unique index/constraint on auth_user_id
    );

  return !upsertErr;
}

/** Login with email/password */
export async function login(email: string, password: string): Promise<boolean> {
  const supabase = await getSupabase();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return !error;
}

/** Logout current session */
export async function logout(): Promise<void> {
  const supabase = await getSupabase();
  await supabase.auth.signOut();
}

/** Convenience: fetch the currently authenticated user’s profile row */
export async function getMyProfile(): Promise<Profile | null> {
  const supabase = await getSupabase();

  const { data: session } = await supabase.auth.getUser();
  const user = session?.user;
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (error) return null;
  return (data as Profile) ?? null;
}

/* =============================================================================
   Profiles helpers (kept & adjusted to remove generics)
   ========================================================================== */

/** Get a single profile by email. */
export async function getProfileByEmail(email: string) {
  const supabase = await getSupabase();

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', email)
    .maybeSingle();

  return { profile: (data as Profile) ?? null, error };
}

/** Create a new profile row (manual use / seeding). */
export async function createProfile(
  email: string,
  name: string,
  is_admin = false,
  auth_user_id?: string
) {
  const supabase = await getSupabase();

  const { data, error } = await supabase
    .from('profiles')
    .insert([{ email, name, is_admin, language: 'en', auth_user_id: auth_user_id ?? null }])
    .select('*')
    .single();

  return { profile: (data as Profile) ?? null, error };
}

/** Update a user’s language preference by profile id. */
export async function setUserLanguage(profileId: string, lang: string) {
  const supabase = await getSupabase();

  const { data, error } = await supabase
    .from('profiles')
    .update({ language: lang })
    .eq('id', profileId)
    .select('*')
    .single();

  return { profile: (data as Profile) ?? null, error };
}

/** Tiny “ping” to confirm connectivity (run off the critical path) */
export async function pingSupabase() {
  const supabase = await getSupabase();
  return supabase.from('profiles').select('id').limit(1);
}
