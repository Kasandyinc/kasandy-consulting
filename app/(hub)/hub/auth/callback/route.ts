import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isOperator } from '@/lib/engine/operators'

/**
 * Magic-link landing. Exchanges the code for a session, then enforces the
 * operator allow-list — a non-operator is signed straight back out. Access to
 * the Engine is never granted here to anyone off the allow-list.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')

  if (code) {
    const supabase = createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (isOperator(user?.email)) {
        return NextResponse.redirect(`${origin}/`)
      }
      await supabase.auth.signOut()
      return NextResponse.redirect(`${origin}/login?error=not_authorized`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
