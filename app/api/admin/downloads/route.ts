import { NextRequest, NextResponse } from 'next/server'
import { kvGet, kvSet, KEYS } from '@/lib/kv'
import type { Download } from '@/types/downloads'

export type { Download }

const DEFAULT_DOWNLOADS: Download[] = [
  {
    id: '1',
    slug: 'procurement-checklist',
    title: 'The Canadian Procurement Readiness Checklist',
    description: '24-item checklist covering every element Canadian buyers review before reading a proposal — registration, insurance, certifications, capability statement, and submission. Score yourself before you submit.',
    category: 'Procurement',
    format: 'HTML (print to PDF), 1 page',
    filename: 'procurement-checklist.html',
    enabled: true,
    isFree: true,
    price: 'Free',
    squareUrl: '',
    createdAt: '2026-05-01T00:00:00Z',
  },
  {
    id: '2',
    slug: 'bmc-business',
    title: 'Business Model Canvas — Business Edition',
    description: 'Map your entire business on one page. Based on Osterwalder\'s framework, adapted for procurement-focused businesses. Includes instructions, annotated examples, and a fillable canvas.',
    category: 'Entrepreneurs',
    format: 'HTML (print to PDF), 2 pages',
    filename: 'bmc-business.html',
    enabled: true,
    isFree: false,
    price: '$12',
    squareUrl: '',
    createdAt: '2026-05-01T00:00:00Z',
  },
  {
    id: '3',
    slug: 'bmc-nonprofit',
    title: 'Business Model Canvas — Non-Profit Edition',
    description: 'Map how your organisation creates social value, delivers programs, and sustains financially — on one page. Designed for board alignment, strategic planning, and funder conversations.',
    category: 'Non-Profit',
    format: 'HTML (print to PDF), 2 pages',
    filename: 'bmc-nonprofit.html',
    enabled: true,
    isFree: false,
    price: '$12',
    squareUrl: '',
    createdAt: '2026-05-01T00:00:00Z',
  },
  {
    id: '4',
    slug: 'province-registration-guide',
    title: 'Canadian Business Registration Guide by Province',
    description: 'Step-by-step registration for all 10 provinces and 3 territories, plus federal incorporation. Includes fees, timelines, post-registration checklist (CRA, banking, insurance, procurement portals).',
    category: 'Entrepreneurs',
    format: 'HTML (print to PDF), 4 pages',
    filename: 'province-registration-guide.html',
    enabled: true,
    isFree: false,
    price: '$17',
    squareUrl: '',
    createdAt: '2026-05-01T00:00:00Z',
  },
  {
    id: '5',
    slug: 'capability-statement',
    title: 'How to Write a Capability Statement — Step-by-Step Guide',
    description: 'A step-by-step guide through every section of a capability statement, what buyers look for, common mistakes, and a fillable template.',
    category: 'Procurement',
    format: 'PDF, 8 pages + template',
    filename: '',
    enabled: false,
    isFree: true,
    price: 'Free',
    squareUrl: '',
    createdAt: '',
  },
  {
    id: '6',
    slug: 'nonprofit-scorecard',
    title: 'The Non-Profit Sustainability Scorecard',
    description: 'Rate your organisation across six sustainability dimensions. Know where you stand before a funding crisis forces the question.',
    category: 'Non-Profit',
    format: 'PDF, 5 pages',
    filename: '',
    enabled: false,
    isFree: true,
    price: 'Free',
    squareUrl: '',
    createdAt: '',
  },
  {
    id: '7',
    slug: 'kenya-canada-roadmap',
    title: 'Kenya to Canada — Your Market Entry Roadmap',
    description: 'The honest 8-step guide to building a credible Canadian supplier profile from Kenya. What disqualifies applicants early, what timelines look like, and how to activate the diaspora network.',
    category: 'International',
    format: 'PDF, 10 pages',
    filename: '',
    enabled: false,
    isFree: true,
    price: 'Free',
    squareUrl: '',
    createdAt: '',
  },
  {
    id: '8',
    slug: 'procurement-pitch-kit',
    title: 'The Procurement Pitch Kit',
    description: '4 cold outreach email templates for government buyers, corporate diversity teams, prime contractors, and event follow-ups. Plus LinkedIn templates, follow-up sequence, and pre-meeting research guide.',
    category: 'Procurement',
    format: 'PDF, templates + guide',
    filename: '',
    enabled: false,
    isFree: false,
    price: '$12',
    squareUrl: '',
    createdAt: '',
  },
  {
    id: '9',
    slug: 'pipeline-builder',
    title: 'The 90-Day Procurement Pipeline Builder',
    description: '12-week planner with one page per week, opportunity tracker, buyer target list, and weekly reflection prompts. Takes you from "I don\'t know where to start" to active bids in 90 days.',
    category: 'Procurement',
    format: 'PDF, fillable planner',
    filename: '',
    enabled: false,
    isFree: false,
    price: '$22',
    squareUrl: '',
    createdAt: '',
  },
  {
    id: '10',
    slug: 'impact-report-kit',
    title: 'The Impact Report Template Kit',
    description: 'Annual Impact Report template, Funder Progress Report template, Board Dashboard template, impact storytelling guide, and 10 annotated examples.',
    category: 'Non-Profit',
    format: 'PDF, fillable templates',
    filename: '',
    enabled: false,
    isFree: false,
    price: '$19',
    squareUrl: '',
    createdAt: '',
  },
  {
    id: '11',
    slug: 'grant-readiness-assessment',
    title: 'The Grant Readiness Self-Assessment',
    description: '20-question self-assessment across mission clarity, program documentation, financial health, and funder relationships. Includes scoring guide, gap-closing actions, and funder readiness checklist.',
    category: 'Non-Profit',
    format: 'PDF, 1 page + guide',
    filename: '',
    enabled: false,
    isFree: false,
    price: '$7',
    squareUrl: '',
    createdAt: '',
  },
]

export async function GET() {
  const downloads = await kvGet<Download[]>(KEYS.downloads, DEFAULT_DOWNLOADS)
  // Merge defaults with KV: KV takes precedence, but ensure new products are included
  const kvMap = new Map(downloads.map(d => [d.id, d]))
  const merged = DEFAULT_DOWNLOADS.map(def => kvMap.get(def.id) ?? def)
  return NextResponse.json(merged)
}

export async function PATCH(req: NextRequest) {
  try {
    const patch = await req.json()
    const { id, ...fields } = patch
    const downloads = await kvGet<Download[]>(KEYS.downloads, DEFAULT_DOWNLOADS)
    // Ensure all defaults present
    const kvMap = new Map(downloads.map((d: Download) => [d.id, d]))
    const merged = DEFAULT_DOWNLOADS.map(def => kvMap.get(def.id) ?? def)
    const updated = merged.map(d => d.id === id ? { ...d, ...fields } : d)
    await kvSet(KEYS.downloads, updated)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to update download' }, { status: 500 })
  }
}
