import { NextRequest, NextResponse } from 'next/server'
import { kv } from '@/lib/kv'

type Credential = { label: string; value: string }
type AboutContent = {
  credentials: Credential[]
  firmBio: string[]
  jBio: string[]
}

const KEY = 'about:content'

export async function GET() {
  try {
    const data = await kv.get<AboutContent>(KEY)
    return NextResponse.json(data ?? null)
  } catch (err) {
    console.error('[about GET]', err)
    return NextResponse.json({ error: 'Failed to fetch about content' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json() as AboutContent
    await kv.set(KEY, body)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[about PATCH]', err)
    return NextResponse.json({ error: 'Failed to update about content' }, { status: 500 })
  }
}
