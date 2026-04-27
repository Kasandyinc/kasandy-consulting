import { NextRequest, NextResponse } from 'next/server'
import { kvGet, kvSet, KEYS } from '@/lib/kv'

type Photo = {
  id: string
  src: string
  alt: string
  caption?: string
  event?: string
}

export async function GET() {
  const photos = await kvGet<Photo[]>(KEYS.speakingPhotos, [])
  return NextResponse.json(photos)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { src, alt, caption, event } = body

    if (!src || !alt) {
      return NextResponse.json({ error: 'src and alt are required' }, { status: 400 })
    }

    const photos = await kvGet<Photo[]>(KEYS.speakingPhotos, [])
    const newPhoto: Photo = {
      id: Date.now().toString(),
      src,
      alt,
      caption: caption || undefined,
      event: event || undefined,
    }
    photos.push(newPhoto)
    await kvSet(KEYS.speakingPhotos, photos)
    return NextResponse.json(newPhoto, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to add photo' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const photos = await kvGet<Photo[]>(KEYS.speakingPhotos, [])
    const filtered = photos.filter(p => p.id !== id)
    await kvSet(KEYS.speakingPhotos, filtered)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete photo' }, { status: 500 })
  }
}
