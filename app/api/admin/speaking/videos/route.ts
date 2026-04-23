import { NextRequest, NextResponse } from 'next/server'
import { readFile, writeFile } from 'fs/promises'
import path from 'path'

const FILE = path.join(process.cwd(), 'data', 'speaking-videos.json')

async function readVideos() {
  try {
    const raw = await readFile(FILE, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return []
  }
}

export async function GET() {
  const videos = await readVideos()
  return NextResponse.json(videos)
}

export async function POST(req: NextRequest) {
  try {
    const { embedUrl, title, event, thumbnail } = await req.json()

    if (!embedUrl || !title) {
      return NextResponse.json({ error: 'embedUrl and title are required' }, { status: 400 })
    }

    const videos = await readVideos()
    const newVideo = {
      id: Date.now().toString(),
      embedUrl,
      title,
      event: event || undefined,
      thumbnail: thumbnail || undefined,
    }
    videos.push(newVideo)
    await writeFile(FILE, JSON.stringify(videos, null, 2))
    return NextResponse.json(newVideo, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to add video' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const videos = await readVideos()
    const filtered = videos.filter((v: { id: string }) => v.id !== id)
    await writeFile(FILE, JSON.stringify(filtered, null, 2))
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete video' }, { status: 500 })
  }
}
