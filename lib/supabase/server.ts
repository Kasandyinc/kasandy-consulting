import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Supabase client for Server Components, Route Handlers, and Server Actions.
 * Reads/writes the auth cookies via Next's cookie store. Uses the publishable
 * (browser-safe) key — RLS governs access; privileged work uses the secret key
 * in a separate admin client, never this one.
 */
export function createClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // Called from a Server Component (read-only cookies). Safe to ignore
            // because middleware refreshes the session on every request.
          }
        },
      },
    },
  )
}
