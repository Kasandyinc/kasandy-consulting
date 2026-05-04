import { NextRequest, NextResponse } from 'next/server'
import { kv } from '@/lib/kv'

type WorkStat = { value: string; label: string }
type CaseStudy = {
  id: string
  number: string
  label: string
  client: string
  tagline: string
  challenge: string
  approach: string[]
  results: string[]
  published: boolean
}

const STATS_KEY = 'work:stats'
const PARTNERS_KEY = 'work:partners'
const CASE_STUDIES_KEY = 'work:casestudies'

export async function GET() {
  try {
    const [stats, partners, caseStudies] = await Promise.all([
      kv.get<WorkStat[]>(STATS_KEY),
      kv.get<string[]>(PARTNERS_KEY),
      kv.get<CaseStudy[]>(CASE_STUDIES_KEY),
    ])
    return NextResponse.json({
      stats: stats ?? [],
      partners: partners ?? [],
      caseStudies: caseStudies ?? [],
    })
  } catch (err) {
    console.error('[work GET]', err)
    return NextResponse.json({ error: 'Failed to fetch work data' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const caseStudies = (await kv.get<CaseStudy[]>(CASE_STUDIES_KEY)) ?? []
    const newStudy: CaseStudy = {
      ...body,
      id: Date.now().toString(),
    }
    caseStudies.push(newStudy)
    await kv.set(CASE_STUDIES_KEY, caseStudies)
    return NextResponse.json(newStudy, { status: 201 })
  } catch (err) {
    console.error('[work POST]', err)
    return NextResponse.json({ error: 'Failed to create case study' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { type, data } = body
    if (!type || data === undefined) {
      return NextResponse.json({ error: 'Missing type or data' }, { status: 400 })
    }
    let key: string
    switch (type) {
      case 'stats':
        key = STATS_KEY
        break
      case 'partners':
        key = PARTNERS_KEY
        break
      case 'casestudies':
        key = CASE_STUDIES_KEY
        break
      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }
    await kv.set(key, data)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[work PATCH]', err)
    return NextResponse.json({ error: 'Failed to update work data' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json()
    const { type, id } = body
    if (type !== 'casestudies') {
      return NextResponse.json({ error: 'DELETE only supports type "casestudies"' }, { status: 400 })
    }
    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    }
    const caseStudies = (await kv.get<CaseStudy[]>(CASE_STUDIES_KEY)) ?? []
    const filtered = caseStudies.filter((cs) => cs.id !== id)
    if (filtered.length === caseStudies.length) {
      return NextResponse.json({ error: 'Case study not found' }, { status: 404 })
    }
    await kv.set(CASE_STUDIES_KEY, filtered)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[work DELETE]', err)
    return NextResponse.json({ error: 'Failed to delete case study' }, { status: 500 })
  }
}
