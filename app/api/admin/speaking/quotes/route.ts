import { NextRequest, NextResponse } from 'next/server'
import { readFile, writeFile } from 'fs/promises'
import path from 'path'

const FILE = path.join(process.cwd(), 'data', 'speaking-quotes.json')

async function readQuotes() {
  try {
    const raw = await readFile(FILE, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return []
  }
}

export async function GET() {
  const quotes = await readQuotes()
  return NextResponse.json(quotes)
}

export async function POST(req: NextRequest) {
  try {
    const { quote, name, title, organisation } = await req.json()

    if (!quote || !name) {
      return NextResponse.json({ error: 'quote and name are required' }, { status: 400 })
    }

    const quotes = await readQuotes()
    const newQuote = {
      id: Date.now().toString(),
      quote,
      name,
      title: title || '',
      organisation: organisation || '',
    }
    quotes.push(newQuote)
    await writeFile(FILE, JSON.stringify(quotes, null, 2))
    return NextResponse.json(newQuote, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to add quote' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const quotes = await readQuotes()
    const filtered = quotes.filter((q: { id: string }) => q.id !== id)
    await writeFile(FILE, JSON.stringify(filtered, null, 2))
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete quote' }, { status: 500 })
  }
}
