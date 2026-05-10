import { NextRequest, NextResponse } from 'next/server'
import { readFileSync, existsSync } from 'fs'
import path from 'path'
import { validateToken, consumeToken, FREE_SLUGS } from '@/lib/tokens'
import { DEFAULT_DOWNLOADS } from '@/data/downloads'

// Map slug → filename
const SLUG_TO_FILE: Record<string, string> = Object.fromEntries(
  DEFAULT_DOWNLOADS.map(d => [d.slug, d.filename])
)

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const { slug } = params
  const token = req.nextUrl.searchParams.get('token') ?? req.cookies.get('kc_token')?.value

  // Free products — no token needed
  const isFree = FREE_SLUGS.includes(slug)

  if (!isFree) {
    if (!token) {
      return NextResponse.redirect(new URL('/resources?ref=purchase-required', req.url))
    }

    const validation = await validateToken(token, slug)
    if (!validation.valid) {
      const dest = new URL('/resources', req.url)
      dest.searchParams.set('ref', validation.error === 'Token expired' ? 'token-expired' : 'invalid-token')
      return NextResponse.redirect(dest)
    }

    // Consume one use
    const sessionId = 'KC-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase()
    await consumeToken(token, sessionId)
  }

  // Find filename
  const filename = SLUG_TO_FILE[slug]
  if (!filename) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  }

  // Serve from protected-downloads/
  const filePath = path.join(process.cwd(), 'protected-downloads', filename)
  if (!existsSync(filePath)) {
    console.error('[/api/serve] File not found:', filePath)
    return NextResponse.json({ error: 'File not found' }, { status: 404 })
  }

  const content = readFileSync(filePath)
  const res = new NextResponse(content, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'private, no-store',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  })

  // Set purchase cookie if token is valid (for subsequent /downloads/ middleware checks)
  if (token && !isFree) {
    res.cookies.set('kc_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 3600,
      path: '/',
    })
  }

  return res
}
