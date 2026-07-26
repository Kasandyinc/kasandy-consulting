import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Server-only Supabase client using the secret key. Bypasses RLS, so it is used
 * exclusively for work that has no operator session — currently the one-click
 * opt-out endpoint, which a prospect hits from their inbox.
 *
 * Never import this into a Client Component.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SECRET_KEY
  if (!key) throw new Error('SUPABASE_SECRET_KEY is not set')
  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
