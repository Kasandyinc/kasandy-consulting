import { NextRequest, NextResponse } from 'next/server'

// Proxy for Anthropic API — keeps the API key server-side
// HTML tools call /api/generate; this forwards to api.anthropic.com

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
  }

  try {
    const body = await req.json()

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
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
