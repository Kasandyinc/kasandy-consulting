import { NextRequest, NextResponse } from 'next/server'
import { kv } from '@/lib/kv'

type ProgramCardData = {
  tier: string
  subtitle: string
  fromPrice: string
  description: string
  includes: string[]
  outcome?: string
  ideal?: string
  featured?: boolean
  requestProposal?: boolean
  ctaLabel: string
  ctaHref?: string
}

type ProgramsData = { [audience: string]: ProgramCardData[] }

const KEY = 'programs:all'

export async function GET() {
  try {
    const data = await kv.get<ProgramsData>(KEY)
    if (!data) {
      return NextResponse.json(null)
    }
    return NextResponse.json({
      entrepreneurs: data.entrepreneurs ?? [],
      nonprofits: data.nonprofits ?? [],
      government: data.government ?? [],
    })
  } catch (err) {
    console.error('[programs GET]', err)
    return NextResponse.json({ error: 'Failed to fetch programs data' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { audience, programs } = body
    if (!audience || !['entrepreneurs', 'nonprofits', 'government'].includes(audience)) {
      return NextResponse.json({ error: 'Invalid or missing audience' }, { status: 400 })
    }
    if (!Array.isArray(programs)) {
      return NextResponse.json({ error: 'programs must be an array' }, { status: 400 })
    }
    const existing = (await kv.get<ProgramsData>(KEY)) ?? {}
    const updated: ProgramsData = { ...existing, [audience]: programs }
    await kv.set(KEY, updated)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[programs PATCH]', err)
    return NextResponse.json({ error: 'Failed to update programs data' }, { status: 500 })
  }
}
