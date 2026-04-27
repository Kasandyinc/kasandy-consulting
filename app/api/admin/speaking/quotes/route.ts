import { NextRequest, NextResponse } from 'next/server'
import { kvGet, kvSet, KEYS } from '@/lib/kv'

type Quote = {
  id: string
  quote: string
  name: string
  title: string
  organisation: string
}

export async function GET() {
  const quotes = await kvGet<Quote[]>(KEYS.speakingQuotes, [])
  return NextResponse.json(quotes)
}

export async function POST(req: NextRequest) {
  try {
    const { quote, name, title, organisation } = await req.json()

    if (!quote || !name) {
      return NextResponse.json({ error: 'quote and name are required' }, { status: 400 })
    }

    const quotes = await kvGet<Quote[]>(KEYS.speakingQuotes, [])
    const newQuote: Quote = {
      id: Date.now().toString(),
      quote,
      name,
      title: title || '',
      organisation: organisation || '',
    }
    quotes.push(newQuote)
    await kvSet(KEYS.speakingQuotes, quotes)
    return NextResponse.json(newQuote, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to add quote' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const quotes = await kvGet<Quote[]>(KEYS.speakingQuotes, [])
    const filtered = quotes.filter(q => q.id !== id)
    await kvSet(KEYS.speakingQuotes, filtered)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete quote' }, { status: 500 })
  }
}
