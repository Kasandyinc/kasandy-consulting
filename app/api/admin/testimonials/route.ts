import { NextRequest, NextResponse } from 'next/server'
import { kvGet, kvSet, KEYS } from '@/lib/kv'

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

export async function GET() {
  const reviews = await kvGet<Review[]>(KEYS.testimonials, [])
  return NextResponse.json(reviews)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, title, organisation, quote, audience, featured, approved } = body

    if (!name || !quote) {
      return NextResponse.json({ error: 'name and quote are required' }, { status: 400 })
    }

    const reviews = await kvGet<Review[]>(KEYS.testimonials, [])
    const newReview: Review = {
      id: Date.now().toString(),
      name,
      title: title || '',
      organisation: organisation || '',
      quote,
      audience: audience || '',
      featured: featured ?? false,
      approved: approved ?? false,
      date: new Date().toISOString().split('T')[0],
    }
    reviews.push(newReview)
    await kvSet(KEYS.testimonials, reviews)
    return NextResponse.json(newReview, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to add review' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, ...updates } = await req.json()
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const reviews = await kvGet<Review[]>(KEYS.testimonials, [])
    const idx = reviews.findIndex(r => r.id === id)
    if (idx === -1) return NextResponse.json({ error: 'Review not found' }, { status: 404 })

    reviews[idx] = { ...reviews[idx], ...updates }
    await kvSet(KEYS.testimonials, reviews)
    return NextResponse.json(reviews[idx])
  } catch {
    return NextResponse.json({ error: 'Failed to update review' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const reviews = await kvGet<Review[]>(KEYS.testimonials, [])
    const filtered = reviews.filter(r => r.id !== id)
    await kvSet(KEYS.testimonials, filtered)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete review' }, { status: 500 })
  }
}
