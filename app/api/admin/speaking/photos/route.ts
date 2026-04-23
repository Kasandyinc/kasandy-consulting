import { NextRequest, NextResponse } from 'next/server'
import { readFile, writeFile } from 'fs/promises'
import path from 'path'

const FILE = path.join(process.cwd(), 'data', 'speaking-photos.json')

async function readPhotos() {
  try {
    const raw = await readFile(FILE, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return []
  }
}

export async function GET() {
  const photos = await readPhotos()
  return NextResponse.json(photos)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { src, alt, caption, event } = body

    if (!src || !alt) {
      return NextResponse.json({ error: 'src and alt are required' }, { status: 400 })
    }

    const photos = await readPhotos()
    const newPhoto = {
      id: Date.now().toString(),
      src,
      alt,
      caption: caption || undefined,
      event: event || undefined,
    }
    photos.push(newPhoto)
    await writeFile(FILE, JSON.stringify(photos, null, 2))
    return NextResponse.json(newPhoto, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to add photo' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const photos = await readPhotos()
    const filtered = photos.filter((p: { id: string }) => p.id !== id)
    await writeFile(FILE, JSON.stringify(filtered, null, 2))
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete photo' }, { status: 500 })
  }
}
