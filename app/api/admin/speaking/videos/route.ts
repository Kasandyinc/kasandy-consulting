import { NextRequest, NextResponse } from 'next/server'
import { kvGet, kvSet, KEYS } from '@/lib/kv'

type Video = {
  id: string
  embedUrl: string
  title: string
  event?: string
  thumbnail?: string
}

export async function GET() {
  const videos = await kvGet<Video[]>(KEYS.speakingVideos, [])
  return NextResponse.json(videos)
}

export async function POST(req: NextRequest) {
  try {
    const { embedUrl, title, event, thumbnail } = await req.json()

    if (!embedUrl || !title) {
      return NextResponse.json({ error: 'embedUrl and title are required' }, { status: 400 })
    }

    const videos = await kvGet<Video[]>(KEYS.speakingVideos, [])
    const newVideo: Video = {
      id: Date.now().toString(),
      embedUrl,
      title,
      event: event || undefined,
      thumbnail: thumbnail || undefined,
    }
    videos.push(newVideo)
    await kvSet(KEYS.speakingVideos, videos)
    return NextResponse.json(newVideo, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to add video' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const videos = await kvGet<Video[]>(KEYS.speakingVideos, [])
    const filtered = videos.filter(v => v.id !== id)
    await kvSet(KEYS.speakingVideos, filtered)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete video' }, { status: 500 })
  }
}
