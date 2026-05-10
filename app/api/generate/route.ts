import { NextRequest, NextResponse } from 'next/server'

// Proxy for Anthropic API — keeps the API key server-side.
// HTML tools in /public/downloads/ call /api/generate.
// Restricted to requests originating from this domain.

const ALLOWED_ORIGINS = [
  'https://kasandyconsulting.com',
  'https://www.kasandyconsulting.com',
  // Vercel preview URLs
  'https://kasandy-consulting',
]

function isAllowedOrigin(req: NextRequest): boolean {
  const referer = req.headers.get('referer') ?? ''
  const origin  = req.headers.get('origin')  ?? ''
  // Allow localhost in development
  if (process.env.NODE_ENV === 'development') return true
  return ALLOWED_ORIGINS.some(o => referer.startsWith(o) || origin.startsWith(o))
}

export async function POST(req: NextRequest) {
  if (!isAllowedOrigin(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
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
