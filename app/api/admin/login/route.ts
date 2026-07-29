import { NextRequest, NextResponse } from 'next/server'
import { mintAdminSession, ADMIN_COOKIE, ADMIN_SESSION_SECONDS } from '@/lib/admin-session'
import { rateLimit } from '@/lib/spam'

/**
 * Legacy /admin sign-in.
 *
 * The cookie this sets is now signed — see lib/admin-session.ts for why the fixed
 * value it used to set was equivalent to no gate at all.
 *
 * Rate limited, because a single shared password with no attempt limit is a password
 * that gets guessed eventually, and leaves no trace of the attempts.
 */
export async function POST(req: NextRequest) {
  try {
    const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown'
    if (!(await rateLimit(`admin-login:${ip}`, 8, 900))) {
      return NextResponse.json(
        { error: 'Too many attempts. Try again in fifteen minutes.' },
        { status: 429 },
      )
    }

    const { password } = await req.json()
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD

    if (!ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Admin password not configured' }, { status: 500 })
    }

    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Incorrect password' }, { status: 401 })
    }

    const value = await mintAdminSession()
    if (!value) {
      return NextResponse.json({ error: 'Admin session not configured' }, { status: 500 })
    }

    const res = NextResponse.json({ success: true })
    res.cookies.set(ADMIN_COOKIE, value, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: ADMIN_SESSION_SECONDS,
      path: '/',
    })
    return res
  } catch {
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}
