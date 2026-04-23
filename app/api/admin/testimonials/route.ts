import { NextRequest, NextResponse } from 'next/server'
import { readFile, writeFile } from 'fs/promises'
import path from 'path'

const FILE = path.join(process.cwd(), 'data', 'reviews.json')

type Review = {
  id: string
  name: string
  title: string
  organisation: string
  quote: string
  audience: string
  featured: boolean
  approved: boolean
  date: string
}

async function readReviews(): Promise<Review[]> {
  try {
    const raw = await readFile(FILE, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return []
  }
}

export async function GET() {
  const reviews = await readReviews()
  return NextResponse.json(reviews)
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, ...updates } = await req.json()
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const reviews = await readReviews()
    const idx = reviews.findIndex(r => r.id === id)
    if (idx === -1) return NextResponse.json({ error: 'Review not found' }, { status: 404 })

    reviews[idx] = { ...reviews[idx], ...updates }
    await writeFile(FILE, JSON.stringify(reviews, null, 2))
    return NextResponse.json(reviews[idx])
  } catch {
    return NextResponse.json({ error: 'Failed to update review' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const reviews = await readReviews()
    const filtered = reviews.filter(r => r.id !== id)
    await writeFile(FILE, JSON.stringify(filtered, null, 2))
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete review' }, { status: 500 })
  }
}
