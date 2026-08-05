import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isOperator, operatorEmails } from '@/lib/engine/operators'

export const dynamic = 'force-dynamic'

/**
 * Sign-in diagnostics.
 *
 * A whole day was lost to a login that reported every possible failure with the same
 * sentence, in a build nobody could confirm was the one running. Each round of
 * guessing cost an exchange, and the guesses were wrong twice.
 *
 * This answers the three questions that would have ended it in a minute: which commit
 * is actually serving this request, whether the operator allow-list is configured,
 * and whether the browser making the request holds a session that the allow-list
 * accepts.
 *
 * It is deliberately public — middleware lets /api/engine through without a session,
 * because a locked-out person is exactly who needs it — so it must leak nothing. No
 * address is echoed except the caller's own, which they already know; the allow-list
 * is reported as a count, never as its contents.
 */
export async function GET() {
  const supabase = createClient()

  let email: string | null = null
  let authError: string | null = null
  try {
    const { data, error } = await supabase.auth.getUser()
    email = data.user?.email ?? null
    authError = error?.message ?? null
  } catch (err) {
    authError = err instanceof Error ? err.message : 'could not read the session'
  }

  const list = operatorEmails()

  return NextResponse.json(
    {
      // Which build is answering. Compare this to the head of main.
      commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'unknown (not on Vercel)',
      branch: process.env.VERCEL_GIT_COMMIT_REF ?? 'unknown',
      deployedAt: process.env.VERCEL_DEPLOYMENT_ID ? 'vercel' : 'local',

      // Is the platform configured to let anyone in at all?
      operatorListConfigured: list.length > 0,
      operatorCount: list.length,

      // Does this browser hold a session, and does the allow-list accept it?
      signedIn: Boolean(email),
      email,
      isOperator: isOperator(email),
      authError,

      // Configuration the sign-in itself depends on.
      supabaseUrlSet: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      publishableKeySet: Boolean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),

      // What the code-entry path expects to find.
      loginPageHasCodeField: true,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
