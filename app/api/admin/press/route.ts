import { NextRequest, NextResponse } from 'next/server'
import { kv } from '@/lib/kv'

type PressItem = {
  id: string
  outlet: string
  title: string
  url: string
  summary: string
  category: string
  date?: string
  featured: boolean
  createdAt: string
}

const KEY = 'press:coverage'

export async function GET() {
  try {
    const items = await kv.get<PressItem[]>(KEY)
    return NextResponse.json(items ?? [])
  } catch (err) {
    console.error('[press GET]', err)
    return NextResponse.json({ error: 'Failed to fetch press coverage' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const items = (await kv.get<PressItem[]>(KEY)) ?? []
    const newItem: PressItem = {
      ...body,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    }
    items.push(newItem)
    await kv.set(KEY, items)
    return NextResponse.json(newItem, { status: 201 })
  } catch (err) {
    console.error('[press POST]', err)
    return NextResponse.json({ error: 'Failed to create press item' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, ...updates } = body
    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    }
    const items = (await kv.get<PressItem[]>(KEY)) ?? []
    const index = items.findIndex((item) => item.id === id)
    if (index === -1) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }
    items[index] = { ...items[index], ...updates }
    await kv.set(KEY, items)
    return NextResponse.json(items[index])
  } catch (err) {
    console.error('[press PATCH]', err)
    return NextResponse.json({ error: 'Failed to update press item' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json()
    const { id } = body
    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    }
    const items = (await kv.get<PressItem[]>(KEY)) ?? []
    const filtered = items.filter((item) => item.id !== id)
    if (filtered.length === items.length) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }
    await kv.set(KEY, filtered)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[press DELETE]', err)
    return NextResponse.json({ error: 'Failed to delete press item' }, { status: 500 })
  }
}
