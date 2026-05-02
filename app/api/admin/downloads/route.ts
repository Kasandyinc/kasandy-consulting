import { NextRequest, NextResponse } from 'next/server'
import { kvGet, kvSet, KEYS } from '@/lib/kv'

type Download = {
  id: string
  slug: string
  title: string
  description: string
  category: string
  format: string
  filename: string   // filename in /public/downloads/
  enabled: boolean
  createdAt: string
}

const DEFAULT_DOWNLOADS: Download[] = [
  { id: '1', slug: 'procurement-checklist', title: 'The Canadian Procurement Readiness Checklist', description: 'Are you actually ready to submit a bid? This checklist covers every element Canadian buyers check before reading a proposal.', category: 'Procurement', format: 'PDF, 2 pages', filename: '', enabled: false, createdAt: '' },
  { id: '2', slug: 'capability-statement', title: 'How to Write a Capability Statement — Step-by-Step Guide', description: 'A step-by-step guide with template for writing capability statements that Canadian buyers respect.', category: 'Procurement', format: 'PDF, 6 pages + template', filename: '', enabled: false, createdAt: '' },
  { id: '3', slug: 'nonprofit-scorecard', title: 'The Non-Profit Sustainability Scorecard', description: 'Rate your organisation across six dimensions of sustainability.', category: 'Non-Profit', format: 'PDF, 4 pages', filename: '', enabled: false, createdAt: '' },
  { id: '4', slug: 'kenya-canada-roadmap', title: 'Kenya to Canada — Your Market Entry Roadmap', description: 'The honest guide to building a credible Canadian supplier profile from outside the country.', category: 'International', format: 'PDF, 8 pages', filename: '', enabled: false, createdAt: '' },
]

export async function GET() {
  const downloads = await kvGet<Download[]>(KEYS.downloads, DEFAULT_DOWNLOADS)
  return NextResponse.json(downloads)
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, filename, enabled } = await req.json()
    const downloads = await kvGet<Download[]>(KEYS.downloads, DEFAULT_DOWNLOADS)
    const updated = downloads.map(d =>
      d.id === id
        ? { ...d, ...(filename !== undefined && { filename }), ...(enabled !== undefined && { enabled }) }
        : d
    )
    await kvSet(KEYS.downloads, updated)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to update download' }, { status: 500 })
  }
}
