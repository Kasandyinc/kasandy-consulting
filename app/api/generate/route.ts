import { NextRequest, NextResponse } from 'next/server'
import { getClientIp, rateLimit } from '@/lib/spam'

// Proxy for the Anthropic API — keeps the key server-side. The HTML tools in
// /public/downloads/ call it.

const ALLOWED_HOSTS = new Set([
  'kasandyconsulting.com',
  'www.kasandyconsulting.com',
])

/**
 * Host match, not prefix match.
 *
 * This compared `referer.startsWith('https://kasandy-consulting')`, which any
 * attacker satisfies by hosting a page at kasandy-consulting.example.com — the
 * prefix is met and the request is billed to this account's Anthropic key.
 *
 * Parsing the URL and comparing the host closes that. It does not make the check
 * strong: a Referer header is chosen by the caller and can simply be set. It is a
 * courtesy filter for ordinary traffic, and the rate limit below is the actual
 * protection against the bill running away.
 */
function isAllowedOrigin(req: NextRequest): boolean {
  if (process.env.NODE_ENV === 'development') return true

  const candidates = [req.headers.get('origin'), req.headers.get('referer')].filter(Boolean)
  for (const raw of candidates) {
    let host: string
    try {
      host = new URL(raw as string).hostname.toLowerCase()
    } catch {
      continue
    }
    if (ALLOWED_HOSTS.has(host)) return true
    // Vercel preview deployments for this project only.
    if (/^kasandy-consulting[a-z0-9-]*\.vercel\.app$/.test(host)) return true
  }
  return false
}

export async function POST(req: NextRequest) {
  if (!isAllowedOrigin(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // A header-based check cannot stop a determined caller, so cap the spend: this
  // endpoint reaches a metered API on somebody else's say-so.
  const ip = getClientIp(req)
  if (!(await rateLimit(`rl:generate:ip:${ip}`, 30, 3600))) {
    return NextResponse.json(
      { error: 'This tool has been used a lot from your connection. Please try again later.' },
      { status: 429 },
    )
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
  }

  try {
    const body = await req.json()

    // Enforce a max_tokens ceiling so a single call can't get too expensive
    const safeBody = { ...body, max_tokens: Math.min(body.max_tokens ?? 4000, 6000) }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(safeBody),
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status })
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('[/api/generate]', err)
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
  }
}
