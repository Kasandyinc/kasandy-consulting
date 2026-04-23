import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json()
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD

    if (!ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Admin password not configured' }, { status: 500 })
    }

    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Incorrect password' }, { status: 401 })
    }

    const res = NextResponse.json({ success: true })
    res.cookies.set('admin_session', 'authenticated', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })
    return res
  } catch {
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}
