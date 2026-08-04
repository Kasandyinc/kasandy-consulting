import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isOperator } from '@/lib/engine/operators'

/**
 * Magic-link landing. Exchanges the link for a session, then enforces the operator
 * allow-list — a non-operator is signed straight back out.
 *
 * Supabase delivers a magic link in one of three shapes, depending on the project's
 * flow setting and which variable the email template uses. This handled exactly one
 * of them and reported every other outcome as "expired or invalid", which is the
 * least useful thing it could say: a link that never carried a code, a link a
 * corporate mail scanner had already opened, and a link clicked on a second device
 * all produced that same sentence.
 *
 *   ?code=…                      PKCE. The verifier cookie was set in the browser
 *                                that asked for the link, so it only works there.
 *   ?token_hash=…&type=magiclink The {{ .TokenHash }} template. No verifier, so it
 *                                survives being opened on another device.
 *   #access_token=…              Implicit flow. A fragment never reaches the server;
 *                                the login page picks that one up client-side.
 *
 * The real reason is passed through to the login page now. This is a sign-in screen
 * for two people, so naming the cause leaks nothing worth protecting, and it saves
 * the guessing this already cost once.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type')

  // Supabase reports its own refusals on the query string before we see anything.
  const providerError = searchParams.get('error_description') ?? searchParams.get('error')
  if (providerError) {
    return NextResponse.redirect(
      `${origin}/login?error=auth_failed&reason=${encodeURIComponent(providerError)}`,
    )
  }

  const supabase = createClient()
  let failure: string | null = null

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) failure = error.message
  } else if (tokenHash) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: (type as 'magiclink' | 'email' | 'recovery' | 'invite') ?? 'magiclink',
    })
    if (error) failure = error.message
  } else {
    // Nothing usable on the query string. Most often the implicit flow, whose token
    // sits in the fragment and is therefore invisible here — the login page handles
    // that case in the browser, where the fragment still exists.
    return NextResponse.redirect(`${origin}/login?error=no_code`)
  }

  if (failure) {
    return NextResponse.redirect(
      `${origin}/login?error=auth_failed&reason=${encodeURIComponent(failure)}`,
    )
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (isOperator(user?.email)) {
    return NextResponse.redirect(`${origin}/`)
  }

  await supabase.auth.signOut()
  return NextResponse.redirect(
    `${origin}/login?error=not_authorized&reason=${encodeURIComponent(
      user?.email ?? 'the session carried no email address',
    )}`,
  )
}
